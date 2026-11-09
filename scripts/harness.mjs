// 本地冒烟 harness：用假 ctx 挂载 dsh-peek 的路由，不启动 dsh 也能验证。
// 用法：node scripts/harness.mjs [port] [workspaceRoot]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN = path.resolve(HERE, '..')
const PORT = Number(process.argv[2] ?? 5599)
const ROOT = path.resolve(process.argv[3] ?? path.resolve(PLUGIN, '..'))

const mod = await import(pathToFileURL(path.join(PLUGIN, 'index.js')).href)
const routes = []
const ctx = {
  webServer: { register: (route) => { routes.push(route); return () => {} } },
  get: (name) => (name === 'workspaceRegistry' ? { list: () => [{ title: path.basename(ROOT), path: ROOT }] } : undefined),
  on: () => {},
}
mod.apply(ctx, {})

function match(url) {
  const pathname = new URL(url, 'http://127.0.0.1').pathname
  const exact = routes.find((route) => route.kind === 'exact' && route.path === pathname)
  if (exact) return exact
  return routes
    .filter((route) => route.kind === 'prefix' && (pathname === route.path || pathname.startsWith(route.path + '/')))
    .sort((left, right) => right.path.length - left.path.length)[0]
}

// 开发页：把客户端 bundle 挂到一个独立 DOM 里跑，不依赖 dsh 的 slot 系统。
const DEV_FILES = new Map([
  ['/__dev', ['scripts/dev.html', 'text/html; charset=utf-8']],
  ['/__dev/client.js', ['lib/client.js', 'text/javascript; charset=utf-8']],
])

http.createServer((req, res) => {
  const dev = DEV_FILES.get(new URL(req.url, 'http://127.0.0.1').pathname)
  if (dev !== undefined) {
    const body = fs.readFileSync(path.join(PLUGIN, dev[0]))
    res.writeHead(200, { 'Content-Type': dev[1], 'Content-Length': body.length, 'Cache-Control': 'no-store' })
    res.end(body)
    return
  }
  const route = match(req.url)
  if (!route) { res.writeHead(404); res.end('no route'); return }
  Promise.resolve(route.handler(req, res)).catch((error) => {
    console.error('[harness]', error)
    if (!res.headersSent) res.writeHead(500)
    res.end('boom')
  })
}).listen(PORT, '127.0.0.1', () => {
  console.log(`dsh-peek harness → http://127.0.0.1:${PORT}/reader  (root: ${ROOT})`)
})