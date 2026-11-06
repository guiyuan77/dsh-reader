/**
 * dsh-reader — 宿主侧插件。
 *
 * 只做三件事，全部落在 dsh 自己的 webServer 上：
 *   1. `/reader`            一个自包含的阅读页（无外部请求，便于隐蔽）
 *   2. `/reader/api/roots`  列出 dsh 已注册的 workspace（ctx.workspaceRegistry）
 *   3. `/reader/api/list|books|file`  在工作区内列目录 / 递归找书 / 取原始字节
 *
 * 路径一律以 registry 里的 workspace 根为边界，越界直接 403；本插件不写任何文件。
 */
import { createReadStream, promises as fsp } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-reader'
export const inject = ['webServer']

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PAGE_FILE = path.join(HERE, 'public', 'reader.html')

/** 允许直出的扩展名 → Content-Type。PDF 走浏览器原生查看器。 */
const CONTENT_TYPES = new Map([
  ['.epub', 'application/epub+zip'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.markdown', 'text/markdown; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.pdf', 'application/pdf'],
])

/** 递归找书时认的扩展名。 */
const BOOK_EXTENSIONS = new Set(CONTENT_TYPES.keys())

const MAX_SCAN_DEPTH = 5
const MAX_SCAN_ENTRIES = 800
const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out',
  '.next', '.nuxt', '.cache', 'coverage', 'vendor', '__pycache__',
])

function json(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.length,
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function withStatus(status, message) {
  return Object.assign(new Error(message), { status })
}

export function apply(ctx, config = {}) {
  const extraRoots = (Array.isArray(config.roots) ? config.roots : [])
    .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => path.resolve(entry))

  const maxFileBytes = Number(config.maxBytes) > 0 ? Number(config.maxBytes) : 128 * 1024 * 1024

  /** registry 是请求时读取的：插件激活顺序不会卡住工作区列表。 */
  function workspaceRoots() {
    const roots = []
    const registry = ctx.get('workspaceRegistry')
    if (registry !== undefined && typeof registry.list === 'function') {
      for (const record of registry.list()) {
        const raw = record?.path
        if (typeof raw !== 'string' || raw.length === 0) continue
        const absolute = path.resolve(raw)
        if (roots.some((root) => samePath(root.path, absolute))) continue
        roots.push({ title: record.title || path.basename(absolute), path: absolute })
      }
    }
    for (const absolute of extraRoots) {
      if (roots.some((root) => samePath(root.path, absolute))) continue
      roots.push({ title: path.basename(absolute), path: absolute })
    }
    return roots
  }

  /** 相对路径永远拼在 workspace 根之下；绝对路径与 `..` 一律出界。 */
  function resolveWithinWorkspace(workspacePath, relativePath) {
    const wanted = typeof workspacePath === 'string' ? workspacePath : ''
    const root = workspaceRoots().find((candidate) => samePath(candidate.path, path.resolve(wanted)))
    if (root === undefined) throw withStatus(403, '未注册的工作区')

    const relative = typeof relativePath === 'string' ? relativePath : ''
    if (relative.includes('\0')) throw withStatus(400, '非法路径')

    const target = path.resolve(root.path, `.${path.sep}${relative}`)
    if (target !== root.path && !samePathPrefix(target, root.path)) {
      throw withStatus(403, '路径越界')
    }
    return { root, target, relative }
  }

  async function listDirectory(target) {
    const dirents = await fsp.readdir(target, { withFileTypes: true })
    const entries = []
    for (const dirent of dirents) {
      if (dirent.name.startsWith('.')) continue
      if (dirent.isDirectory() && SKIP_DIRECTORIES.has(dirent.name)) continue
      let stat
      try {
        stat = await fsp.stat(path.join(target, dirent.name))
      } catch {
        continue
      }
      entries.push({
        name: dirent.name,
        dir: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtimeMs,
        book: BOOK_EXTENSIONS.has(path.extname(dirent.name).toLowerCase()),
      })
    }
    entries.sort((left, right) => {
      if (left.dir !== right.dir) return left.dir ? -1 : 1
      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })
    return entries
  }

  /** 有界递归：只收集书，用来喂书架，避免用户在目录里找书。 */
  async function collectBooks(root) {
    const books = []
    const queue = [{ dir: '', depth: 0 }]
    while (queue.length > 0 && books.length < MAX_SCAN_ENTRIES) {
      const { dir, depth } = queue.shift()
      let entries
      try {
        entries = await listDirectory(path.join(root.path, dir))
      } catch {
        continue
      }
      for (const entry of entries) {
        const relative = dir.length === 0 ? entry.name : `${dir}/${entry.name}`
        if (entry.dir) {
          if (depth + 1 <= MAX_SCAN_DEPTH) queue.push({ dir: relative, depth: depth + 1 })
          continue
        }
        if (!entry.book) continue
        books.push({ path: relative, name: entry.name, size: entry.size, ext: path.extname(entry.name).toLowerCase() })
        if (books.length >= MAX_SCAN_ENTRIES) break
      }
    }
    books.sort((left, right) => {
      const delta = BOOK_PRIORITY(left.ext) - BOOK_PRIORITY(right.ext)
      if (delta !== 0) return delta
      return left.path.localeCompare(right.path, 'zh-Hans-CN')
    })
    return books
  }

  async function handleApi(req, res) {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const route = url.pathname.slice('/reader/api'.length).replace(/^\//, '')
    const workspace = url.searchParams.get('ws')
    const relative = url.searchParams.get('path') ?? ''

    if (route === 'roots') return json(res, 200, { roots: workspaceRoots() })

    if (route === 'list') {
      const { target } = resolveWithinWorkspace(workspace, relative)
      return json(res, 200, { path: relative, entries: await listDirectory(target) })
    }

    if (route === 'books') {
      const { root } = resolveWithinWorkspace(workspace, '')
      return json(res, 200, { path: root.path, books: await collectBooks(root) })
    }

    if (route === 'file') {
      const { target } = resolveWithinWorkspace(workspace, relative)
      const stat = await fsp.stat(target)
      if (!stat.isFile()) throw withStatus(400, '不是普通文件')
      if (stat.size > maxFileBytes) throw withStatus(413, `文件超过 ${maxFileBytes} 字节上限`)

      const contentType = CONTENT_TYPES.get(path.extname(target).toLowerCase()) ?? 'application/octet-stream'
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      })
      await new Promise((resolve, reject) => {
        const stream = createReadStream(target)
        stream.on('error', reject)
        stream.on('end', resolve)
        stream.pipe(res)
      })
      return undefined
    }

    return json(res, 404, { error: '未知接口' })
  }

  const registered = [
    ctx.webServer.register({
      kind: 'exact',
      path: '/reader',
      handler: async (req, res) => {
        let html
        try {
          html = await fsp.readFile(PAGE_FILE)
        } catch (error) {
          return json(res, 500, { error: `阅读页缺失：${PAGE_FILE}（${error?.message ?? error}）` })
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': html.length,
          'Cache-Control': 'no-store',
        })
        res.end(html)
        return undefined
      },
    }),
    ctx.webServer.register({
      kind: 'prefix',
      path: '/reader/api',
      handler: async (req, res) => {
        try {
          return await handleApi(req, res)
        } catch (error) {
          const status = error?.status ?? 500
          if (status >= 500) console.warn('[dsh-reader]', error)
          return json(res, status, { error: error?.message ?? String(error) })
        }
      },
    }),
  ]

  ctx.on('dispose', () => {
    for (const dispose of registered) dispose()
  })
}

function samePath(left, right) {
  return left.toLowerCase() === right.toLowerCase()
}

function samePathPrefix(target, root) {
  return target.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`)
}

/** 书架排序：先书后排文档，长篇格式优先。 */
function BOOK_PRIORITY(extension) {
  if (extension === '.epub') return 0
  if (extension === '.pdf') return 1
  if (extension === '.txt') return 2
  return 3
}