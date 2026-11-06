// 断言式冒烟：验证路径围栏、目录列举、EPUB 字节直出与页面可用性。
// 用法：node scripts/smoke.mjs [port] [workspaceRoot]
const PORT = Number(process.argv[2] ?? 5599)
const WS = process.argv[3] ? process.argv[3] : process.cwd()
const BASE = `http://127.0.0.1:${PORT}`
const q = (value) => encodeURIComponent(value)

let failures = 0
function check(label, ok, detail) {
  if (ok) console.log(`  ok   ${label}`)
  else { failures++; console.log(`  FAIL ${label}  ${detail ?? ''}`) }
}

async function main() {
  const roots = await (await fetch(`${BASE}/reader/api/roots`)).json()
  check('roots 返回工作区', Array.isArray(roots.roots) && roots.roots.length > 0, JSON.stringify(roots))

  const list = await (await fetch(`${BASE}/reader/api/list?ws=${q(WS)}`)).json()
  check('list 列出根目录', Array.isArray(list.entries) && list.entries.length > 0, `entries=${list.entries?.length}`)

  const books = await (await fetch(`${BASE}/reader/api/books?ws=${q(WS)}`)).json()
  check('books 扫到书籍', Array.isArray(books.books), `count=${books.books?.length}`)

  const traversal = await fetch(`${BASE}/reader/api/list?ws=${q(WS)}&path=${q('../../Windows')}`)
  check('越界目录被拒绝 403', traversal.status === 403, `HTTP ${traversal.status}`)

  const escape = await fetch(`${BASE}/reader/api/file?ws=${q(WS)}&path=${q('pkg/../../package.json')}`)
  check('越界文件被拒绝 403', escape.status === 403, `HTTP ${escape.status}`)

  const unknown = await fetch(`${BASE}/reader/api/list?ws=${q('C:\\nope')}`)
  check('未注册工作区被拒绝 403', unknown.status === 403, `HTTP ${unknown.status}`)

  const sample = books.books.find((book) => book.ext === '.epub')
  if (sample) {
    const file = await fetch(`${BASE}/reader/api/file?ws=${q(WS)}&path=${q(sample.path)}`)
    const bytes = new Uint8Array(await file.arrayBuffer())
    check('epub 直出 PK 头', bytes[0] === 0x50 && bytes[1] === 0x4b, `magic=${bytes[0]},${bytes[1]}`)
    check('epub content-type', file.headers.get('content-type') === 'application/epub+zip', file.headers.get('content-type'))
  } else {
    console.log('  skip epub 用例（工作区没有 epub 样本，先跑 scripts/make-epub.mjs）')
  }

  const page = await fetch(`${BASE}/reader`)
  const html = await page.text()
  check('页面 200', page.status === 200, `HTTP ${page.status}`)
  check('页面含老板键实现', html.includes('decoyLog') && html.includes('setBoss'))
  check('页面含解压实现', html.includes('DecompressionStream'))

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch((error) => { console.error('FAILED', error); process.exitCode = 1 })