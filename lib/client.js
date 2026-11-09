/**
 * dsh-peek 的浏览器半侧：在右侧栏注册一个 `reader` tab 类型。
 *
 * 只依赖三个客户端服务：slots / sidebarRight / sidebarRightTabs。
 * 书籍字节走同源 `/reader/api/*`（由宿主半侧 index.js 提供），
 * 因此不需要 remote、session 或 workspaceFiles 的授权链路。
 */
window.__ModuleLoader__.load({
  id: "dsh-peek",
  factory: (require) => {
    var react = require("react")

    const h = react.createElement
    const PLUGIN = "dsh-peek"
    const TAB_ID = "dsh-peek/reader"
    const KIND = "reader"
    const STYLE_ID = "dsh-peek-style"

    const inject = ["slots", "sidebarRight", "sidebarRightTabs"]

    /* ------------------------------------------------------------------ 样式 */

    const CSS = `
.dsr-root{display:flex;flex-direction:column;height:100%;min-height:0;color:inherit;font-size:13px;
  font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;position:relative;overflow:hidden}
/* 主题：字色与底色成对定义。auto 不设色，交给 dsh 的 color-scheme 继承 */
.dsr-root[data-reader-theme="light"]{color:#23262b;background:#fbfbf9;--dsr-surface:#fbfbf9}
.dsr-root[data-reader-theme="sepia"]{color:#3a3226;background:#f5efe1;--dsr-surface:#f5efe1}
.dsr-root[data-reader-theme="dark"]{color:#d7dae0;background:#1b1d21;--dsr-surface:#1b1d21}
.dsr-bar{display:flex;align-items:center;gap:6px;padding:7px 10px;border-bottom:1px solid rgba(128,128,128,.18);flex:0 0 auto}
.dsr-bar .dsr-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;opacity:.9}
.dsr-bar button{background:transparent;border:1px solid rgba(128,128,128,.28);border-radius:5px;color:inherit;
  cursor:pointer;padding:2px 7px;font-size:11.5px;line-height:1.6;opacity:.78}
.dsr-bar button:hover{opacity:1}
.dsr-bar button:disabled{opacity:.3;cursor:default}
.dsr-scroll{flex:1;min-height:0;overflow:auto;padding:18px 16px 64px;scroll-behavior:auto}
.dsr-paper{font-size:var(--dsr-size,17px);line-height:var(--dsr-line,1.85);
  font-family:Georgia,"Songti SC","SimSun",serif;word-break:break-word}
.dsr-paper p{margin:0 0 .95em;text-indent:2em}
.dsr-paper h1,.dsr-paper h2,.dsr-paper h3{font-family:inherit;line-height:1.4;margin:1.3em 0 .7em;font-weight:600}
.dsr-paper img{max-width:100%;height:auto;display:block;margin:.9em auto;border-radius:4px}
.dsr-paper blockquote{margin:1em 0;padding:.2em 0 .2em .9em;border-left:3px solid rgba(128,128,128,.3);opacity:.8}
.dsr-paper pre{background:rgba(128,128,128,.1);border-radius:6px;padding:10px;overflow:auto;
  font:11.5px/1.6 "Cascadia Mono",Consolas,monospace;text-indent:0}
.dsr-paper code{font:11.5px/1.6 "Cascadia Mono",Consolas,monospace;background:rgba(128,128,128,.12);
  border-radius:3px;padding:1px 4px}
.dsr-paper a{color:#3b6ea5}
.dsr-paper hr{border:0;border-top:1px solid rgba(128,128,128,.25);margin:1.8em 0}
.dsr-paper ul,.dsr-paper ol{margin:0 0 .95em;padding-left:1.7em}
.dsr-hint{padding:22px 14px;opacity:.55;line-height:1.8;font-size:12px}
.dsr-drawer{position:absolute;inset:0;background-color:var(--dsr-surface,rgba(127,127,127,.16));
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  display:flex;flex-direction:column;z-index:5}
.dsr-drawer[hidden]{display:none}
.dsr-drawer>header{display:flex;gap:6px;align-items:center;padding:8px 10px;
  border-bottom:1px solid rgba(128,128,128,.18)}
.dsr-drawer>header select{flex:1;min-width:0;font-size:11.5px;padding:3px 5px;border-radius:5px;
  border:1px solid rgba(128,128,128,.28);background:transparent;color:inherit}
.dsr-list{flex:1;overflow:auto;padding:4px 0}
.dsr-row{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:12.5px}
.dsr-row:hover{background:rgba(128,128,128,.12)}
.dsr-row.active{background:rgba(128,128,128,.18)}
.dsr-row .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsr-row .m{opacity:.5;font-size:11px;flex:0 0 auto}
.dsr-crumb{padding:5px 12px;font-size:11.5px;opacity:.6;border-bottom:1px solid rgba(128,128,128,.14);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsr-crumb a{cursor:pointer;text-decoration:none;color:inherit}
.dsr-crumb a:hover{text-decoration:underline}
.dsr-pop{position:absolute;right:10px;top:40px;z-index:9;background:var(--dsr-surface,rgba(127,127,127,.16));
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:inherit;
  border:1px solid rgba(128,128,128,.28);border-radius:9px;padding:11px;width:210px;
  box-shadow:0 10px 26px rgba(0,0,0,.18);font-size:11.5px}
.dsr-pop[hidden]{display:none}
.dsr-pop label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0}
.dsr-pop button{background:transparent;border:1px solid rgba(128,128,128,.28);border-radius:5px;
  color:inherit;cursor:pointer;font-size:11px;padding:2px 7px}
.dsr-pop button.on{border-color:#3b6ea5;color:#3b6ea5}
.dsr-pop .tip{margin-top:8px;padding-top:7px;border-top:1px solid rgba(128,128,128,.2);opacity:.6;line-height:1.7}
.dsr-pop kbd{background:rgba(128,128,128,.16);border-radius:3px;padding:0 4px;font-size:10.5px}
.dsr-foot{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:5px 10px;
  border-top:1px solid rgba(128,128,128,.16);font-size:11px;opacity:.6}
.dsr-foot .grow{flex:1}
.dsr-foot button{background:transparent;border:0;color:inherit;cursor:pointer;opacity:.8;font-size:11px;padding:0 4px}
.dsr-foot button:disabled{opacity:.25;cursor:default}
`

    function injectStyle() {
      if (document.getElementById(STYLE_ID) !== null) return
      const tag = document.createElement("style")
      tag.id = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /* ------------------------------------------------------------------ 工具 */

    function fmtSize(n) {
      if (!n && n !== 0) return ""
      if (n < 1024) return n + "B"
      if (n < 1048576) return (n / 1024).toFixed(0) + "K"
      return (n / 1048576).toFixed(1) + "M"
    }

    function dirname(p) {
      const i = p.lastIndexOf("/")
      return i < 0 ? "" : p.slice(0, i)
    }

    function basename(p) {
      const i = p.lastIndexOf("/")
      return i < 0 ? p : p.slice(i + 1)
    }

    function normalize(p) {
      const out = []
      for (const part of p.split("/")) {
        if (part === "" || part === ".") continue
        if (part === "..") { out.pop(); continue }
        out.push(part)
      }
      return out.join("/")
    }

    function resolvePath(base, href) {
      let clean = String(href || "").split("#")[0].split("?")[0]
      try { clean = decodeURIComponent(clean) } catch (error) { /* 保留原样 */ }
      if (clean.charAt(0) === "/") return normalize(clean.slice(1))
      return normalize((base ? base + "/" : "") + clean)
    }

    function getJson(path) {
      return fetch("/reader/api/" + path, { cache: "no-store" }).then((response) =>
        response.json().then((body) => {
          if (!response.ok) throw new Error(body && body.error ? body.error : "HTTP " + response.status)
          return body
        }))
    }

    /* ------------------------------------------------------------------ EPUB */

    function findEocd(u8) {
      for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) {
        if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) return i
      }
      return -1
    }

    function unzip(bytes) {
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
      const eocd = findEocd(u8)
      if (eocd < 0) throw new Error("不是有效的 EPUB（未找到 ZIP 中央目录）")

      const count = dv.getUint16(eocd + 10, true)
      let offset = dv.getUint32(eocd + 16, true)
      const entries = new Map()
      const decoder = new TextDecoder("utf-8")

      for (let i = 0; i < count; i++) {
        if (offset + 46 > u8.length || dv.getUint32(offset, true) !== 0x02014b50) break
        const nameLen = dv.getUint16(offset + 28, true)
        const extraLen = dv.getUint16(offset + 30, true)
        const commentLen = dv.getUint16(offset + 32, true)
        const name = decoder.decode(u8.subarray(offset + 46, offset + 46 + nameLen))
        entries.set(name, {
          method: dv.getUint16(offset + 10, true),
          compressed: dv.getUint32(offset + 20, true),
          local: dv.getUint32(offset + 42, true),
        })
        offset += 46 + nameLen + extraLen + commentLen
      }
      return { u8, dv, entries }
    }

    function entryBytes(zip, name) {
      const entry = zip.entries.get(name)
      if (!entry) return Promise.resolve(null)
      const nameLen = zip.dv.getUint16(entry.local + 26, true)
      const extraLen = zip.dv.getUint16(entry.local + 28, true)
      const start = entry.local + 30 + nameLen + extraLen
      const raw = zip.u8.subarray(start, start + entry.compressed)
      if (entry.method === 0) return Promise.resolve(raw)
      if (entry.method !== 8) return Promise.reject(new Error("不支持的压缩方式 " + entry.method))
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
      return new Response(stream).arrayBuffer().then((buffer) => new Uint8Array(buffer))
    }

    function entryText(zip, name) {
      return entryBytes(zip, name).then((bytes) =>
        bytes === null ? null : new TextDecoder("utf-8").decode(bytes))
    }

    function xmlDoc(text) {
      let doc = new DOMParser().parseFromString(text, "application/xml")
      if (doc.querySelector("parsererror")) doc = new DOMParser().parseFromString(text, "text/html")
      return doc
    }

    function attr(el, localName) {
      if (!el) return null
      if (el.getAttribute(localName)) return el.getAttribute(localName)
      for (const attribute of el.attributes) {
        if (attribute.localName === localName) return attribute.value
      }
      return null
    }

    // 书里写死的颜色会直接毁掉深色主题（黑字配深底），统一剥掉
    const COLOR_DECLARATION = /^\s*(color|background|background-color|background-image|font-family|filter|mix-blend-mode|opacity)\s*:/i

    function stripColorStyles(node) {
      if (!node.hasAttribute || !node.hasAttribute("style")) return
      const kept = (node.getAttribute("style") || "")
        .split(";")
        .filter((declaration) => declaration.trim().length > 0 && !COLOR_DECLARATION.test(declaration))
      if (kept.length > 0) node.setAttribute("style", kept.join(";"))
      else node.removeAttribute("style")
    }

    function sanitize(root) {
      for (const node of root.querySelectorAll("script,iframe,object,embed,link,style,base,form,input,button,audio,video")) {
        node.remove()
      }
      for (const node of root.querySelectorAll("*")) {
        for (const attribute of Array.from(node.attributes)) {
          if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name)
          if (attribute.name === "href" && /^javascript:/i.test(attribute.value)) node.removeAttribute(attribute.name)
          if (attribute.name === "color" || attribute.name === "bgcolor") node.removeAttribute(attribute.name)
        }
        stripColorStyles(node)
      }
      return root
    }

    const MIME = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
      webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp",
    }

    function hydrateImages(zip, root, baseDir) {
      const jobs = []
      for (const node of root.querySelectorAll("img,image")) {
        const href = node.getAttribute("src") || attr(node, "href")
        if (!href) continue
        const target = resolvePath(baseDir, href)
        jobs.push(entryBytes(zip, target).then((bytes) => {
          if (!bytes) { node.remove(); return }
          const ext = (target.split(".").pop() || "").toLowerCase()
          const url = URL.createObjectURL(new Blob([bytes], { type: MIME[ext] || "application/octet-stream" }))
          if (node.tagName.toLowerCase() === "image") {
            node.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", url)
            node.setAttribute("href", url)
          } else {
            node.setAttribute("src", url)
          }
        }).catch(() => {}))
      }
      return Promise.all(jobs)
    }

    function parseEpub(zip) {
      return entryText(zip, "META-INF/container.xml").then((container) => {
        if (!container) throw new Error("缺少 META-INF/container.xml")
        const opfPath = attr(xmlDoc(container).querySelector("rootfile"), "full-path")
        if (!opfPath) throw new Error("container.xml 未声明 rootfile")
        return entryText(zip, normalize(opfPath)).then((opfText) => {
          if (!opfText) throw new Error("缺少 OPF：" + opfPath)
          const opf = xmlDoc(opfText)
          const opfDir = dirname(normalize(opfPath))

          const meta = {}
          for (const node of opf.querySelectorAll("metadata > *")) {
            if (!meta[node.localName]) meta[node.localName] = (node.textContent || "").trim()
          }

          const manifest = new Map()
          for (const item of opf.querySelectorAll("manifest > item")) {
            const id = item.getAttribute("id")
            if (!id) continue
            manifest.set(id, {
              href: resolvePath(opfDir, item.getAttribute("href")),
              type: (item.getAttribute("media-type") || "").toLowerCase(),
              props: item.getAttribute("properties") || "",
            })
          }

          const chapters = []
          for (const ref of opf.querySelectorAll("spine > itemref")) {
            if ((ref.getAttribute("linear") || "").toLowerCase() === "no") continue
            const target = manifest.get(ref.getAttribute("idref"))
            if (!target) continue
            if (target.type && target.type.indexOf("html") < 0) continue
            chapters.push(target)
          }
          if (chapters.length === 0) throw new Error("spine 为空，无法分章")

          let navItem = null
          let ncxItem = null
          manifest.forEach((item) => {
            if (item.props.indexOf("nav") >= 0) navItem = item
            if (item.type === "application/x-dtbncx+xml") ncxItem = item
          })

          return buildToc(zip, navItem, ncxItem).then((toc) => ({
            title: meta.title || basename(opfPath),
            creator: meta.creator || "",
            chapters,
            toc,
          }))
        })
      })
    }

    function buildToc(zip, navItem, ncxItem) {
      const source = navItem || ncxItem
      if (!source) return Promise.resolve([])
      return entryText(zip, source.href).then((text) => {
        if (!text) return []
        const doc = xmlDoc(text)
        const base = dirname(source.href)
        const links = []
        if (navItem) {
          const nav = doc.querySelector('nav[epub\\:type="toc"], nav')
          for (const anchor of nav ? nav.querySelectorAll("a[href]") : []) {
            links.push({ label: (anchor.textContent || "").trim(), href: resolvePath(base, anchor.getAttribute("href")) })
          }
        } else {
          for (const point of doc.querySelectorAll("navPoint")) {
            const label = point.querySelector("navLabel > text, text")
            const content = point.querySelector("content")
            if (!content) continue
            links.push({ label: (label ? label.textContent : "").trim(), href: resolvePath(base, attr(content, "src")) })
          }
        }
        return links.filter((link) => link.label && link.href)
      })
    }

    /* ------------------------------------------------------------------ 阅读器 */

    const LSK = {
      // 存储前缀故意保留改名前的 dsh-reader:，改掉会丢掉已存的阅读进度与阅读设置
      ws: "dsh-reader:ws",
      theme: "dsh-reader:theme",
      size: "dsh-reader:size",
      line: "dsh-reader:line",
      last: "dsh-reader:last",
      pos: (ws, path) => "dsh-reader:pos:" + ws + "|" + path,
    }

    function mount(host) {
      injectStyle()
      // 每个面板实例各自一份 state：dsh 会同时渲染多个 Session 的右侧栏子树
      const state = {
        roots: [], ws: null, mode: "books", cwd: "", entries: [], books: [],
        book: null, zip: null, chapters: [], chapter: 0, tocOpen: false,
      }
      host.innerHTML = `
        <div class="dsr-root" tabindex="-1">
          <div class="dsr-bar">
            <button data-act="shelf" title="书架">书架</button>
            <button data-act="toc" title="目录" hidden>目录</button>
            <div class="dsr-title">阅读器</div>
            <button data-act="settings" title="阅读设置">Aa</button>
          </div>
          <div class="dsr-scroll"><div class="dsr-paper"><div class="dsr-hint">从书架挑一本书。</div></div></div>
          <div class="dsr-foot">
            <button data-act="prev" disabled>‹</button>
            <button data-act="next" disabled>›</button>
            <span class="grow"></span>
            <span class="dsr-progress"></span>
          </div>
          <div class="dsr-drawer dsr-shelf" hidden>
            <header>
              <select class="dsr-ws" title="工作区"></select>
              <button data-act="books" title="书架">书架</button>
              <button data-act="tree" title="目录">目录</button>
              <button data-act="close-drawer" title="关闭">✕</button>
            </header>
            <div class="dsr-crumb"></div>
            <div class="dsr-list"></div>
          </div>
          <div class="dsr-drawer dsr-toc" hidden>
            <header><span style="flex:1;font-size:12px;opacity:.7">目录</span><button data-act="close-drawer">✕</button></header>
            <div class="dsr-list"></div>
          </div>
          <div class="dsr-pop" hidden>
            <label>主题 <span>
              <button data-theme="auto">跟随</button>
              <button data-theme="light">纸白</button>
              <button data-theme="sepia">护眼</button>
              <button data-theme="dark">夜间</button>
            </span></label>
            <label>字号 <span>
              <button data-size="-1">A-</button>
              <button data-size="1">A+</button>
            </span></label>
            <label>行距 <span>
              <button data-line="-1">紧</button>
              <button data-line="1">松</button>
            </span></label>
            <div class="tip"><kbd>Esc</kbd> 收起侧栏（一键回到会话）<br><kbd>←</kbd> <kbd>→</kbd> 翻页</div>
          </div>
        </div>`

      const root = host.querySelector(".dsr-root")
      const scroller = host.querySelector(".dsr-scroll")
      const shelf = host.querySelector(".dsr-shelf")
      const tocDrawer = host.querySelector(".dsr-toc")
      const pop = host.querySelector(".dsr-pop")
      let paperEl = host.querySelector(".dsr-paper")
      const wsSelect = host.querySelector(".dsr-ws")
      const shelfList = shelf.querySelector(".dsr-list")
      const tocList = tocDrawer.querySelector(".dsr-list")
      const crumb = shelf.querySelector(".dsr-crumb")
      const titleEl = host.querySelector(".dsr-title")
      const progressEl = host.querySelector(".dsr-progress")
      const btnPrev = host.querySelector('[data-act="prev"]')
      const btnNext = host.querySelector('[data-act="next"]')
      const btnToc = host.querySelector('[data-act="toc"]')
      const style = root.style
      /* ---------------- 设置 ---------------- */

      function applySettings() {
        const theme = localStorage.getItem(LSK.theme) || "auto"
        const size = Number(localStorage.getItem(LSK.size) || 17)
        const line = Number(localStorage.getItem(LSK.line) || 185)
        style.setProperty("--dsr-size", size + "px")
        style.setProperty("--dsr-line", (line / 100).toFixed(2))
        root.dataset.readerTheme = theme
        for (const button of host.querySelectorAll("[data-theme]")) {
          button.classList.toggle("on", button.dataset.theme === theme)
        }
      }

      /* ---------------- 进度 ---------------- */

      let pendingSnap = null

      /** 当前位置的快照：书/工作区一变，state 就不能再代表"刚才读的那本"。 */
      function snapshotPos() {
        if (!state.book || !state.ws) return null
        const max = scroller.scrollHeight - scroller.clientHeight
        return {
          ws: state.ws,
          path: state.book.path,
          chapter: state.chapter,
          ratio: max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0,
        }
      }

      function writePos(snapshot) {
        if (!snapshot) return
        try {
          localStorage.setItem(LSK.pos(snapshot.ws, snapshot.path), JSON.stringify({ chapter: snapshot.chapter, ratio: snapshot.ratio }))
        } catch (error) { /* 隐私模式下忽略 */ }
      }

      /** 立即落盘。切书、切章、收起面板、卸载之前都必须先调。 */
      function savePos() {
        writePos(pendingSnap !== null ? pendingSnap : snapshotPos())
        pendingSnap = null
      }

      function readPos() {
        if (!state.book || !state.ws) return null
        try {
          const raw = localStorage.getItem(LSK.pos(state.ws, state.book.path))
          return raw === null ? null : JSON.parse(raw)
        } catch (error) { return null }
      }

      function applyRatio(ratio) {
        const max = scroller.scrollHeight - scroller.clientHeight
        if (max > 0) scroller.scrollTop = Math.min(1, Math.max(0, ratio || 0)) * max
      }

      /* ---------------- 渲染 ---------------- */

      function swapPaper(next) {
        paperEl.replaceWith(next)
        paperEl = next
      }

      function setPaper(nodes) {
        const paper = document.createElement("div")
        paper.className = "dsr-paper"
        for (const node of nodes) paper.appendChild(node)
        swapPaper(paper)
        scroller.scrollTop = 0
      }

      function paragraphs(text) {
        const LIMIT = 600000
        const truncated = text.length > LIMIT
        if (truncated) text = text.slice(0, LIMIT)
        const nodes = []
        for (const block of text.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
          if (!block.trim()) continue
          const p = document.createElement("p")
          block.split("\n").forEach((line, index) => {
            if (index > 0) p.appendChild(document.createElement("br"))
            p.appendChild(document.createTextNode(line))
          })
          nodes.push(p)
        }
        if (truncated) {
          const note = document.createElement("p")
          note.style.textIndent = "0"
          note.textContent = "（文件较大，仅显示前 " + LIMIT + " 个字符）"
          nodes.push(note)
        }
        return nodes
      }

      function markdown(text) {
        let html = text
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/^###### (.*)$/gm, "<h3>$1</h3>")
          .replace(/^##### (.*)$/gm, "<h3>$1</h3>")
          .replace(/^#### (.*)$/gm, "<h3>$1</h3>")
          .replace(/^### (.*)$/gm, "<h3>$1</h3>")
          .replace(/^## (.*)$/gm, "<h2>$1</h2>")
          .replace(/^# (.*)$/gm, "<h1>$1</h1>")
          .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
          .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
          .replace(/```([\s\S]*?)```/g, "<pre>$1</pre>")
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/\n{2,}/g, "</p><p>")
        html = ("<p>" + html).replace(/(<li>[\s\S]*?<\/li>)+/g, (block) => "<ul>" + block + "</ul>")
        const holder = document.createElement("div")
        holder.innerHTML = html
        return Array.from(holder.childNodes)
      }

      function decodeText(bytes) {
        try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes) } catch (error) {
          try { return new TextDecoder("gb18030").decode(bytes) } catch (error2) {
            return new TextDecoder("utf-8").decode(bytes)
          }
        }
      }

      function hint(text) {
        const wrap = document.createElement("div")
        wrap.className = "dsr-paper"
        const inner = document.createElement("div")
        inner.className = "dsr-hint"
        inner.textContent = text
        wrap.appendChild(inner)
        swapPaper(wrap)
      }

      /* ---------------- 打开书 ---------------- */

      function setBar(title) {
        titleEl.textContent = title
        titleEl.title = title
      }

      function open(path) {
        savePos() // 先把上一本的位置落盘，再换 state
        state.book = { path, name: basename(path), title: basename(path) }
        try {
          localStorage.setItem(LSK.last, JSON.stringify({ ws: state.ws, path }))
          localStorage.setItem(LSK.ws, state.ws)
        } catch (error) { /* 忽略 */ }
        state.chapter = 0
        state.zip = null
        state.chapters = []
        btnToc.hidden = true
        btnPrev.disabled = true
        btnNext.disabled = true
        progressEl.textContent = ""
        setBar(basename(path))
        hint("载入中…")
        closeDrawers()

        const url = "/reader/api/file?ws=" + encodeURIComponent(state.ws) + "&path=" + encodeURIComponent(path)
        return fetch(url, { cache: "no-store" })
          .then((response) => {
            if (!response.ok) return response.json().then((body) => { throw new Error(body.error || "HTTP " + response.status) })
            return response.arrayBuffer()
          })
          .then((buffer) => {
            const ext = (path.split(".").pop() || "").toLowerCase()
            if (ext === "epub") return openEpub(buffer)
            const text = decodeText(new Uint8Array(buffer))
            if (ext === "md" || ext === "markdown") setPaper(markdown(text))
            else if (ext === "html" || ext === "htm") {
              const doc = new DOMParser().parseFromString(text, "text/html")
              sanitize(doc)
              const holder = document.createElement("div")
              while (doc.body.firstChild) holder.appendChild(doc.body.firstChild)
              setPaper(Array.from(holder.childNodes))
            } else setPaper(paragraphs(text))
            progressEl.textContent = fmtSize(buffer.byteLength)
            const saved = readPos()
            if (saved && saved.ratio) applyRatio(saved.ratio)
            return undefined
          })
          .catch((error) => {
            hint("打开失败：" + error.message)
            try { localStorage.removeItem(LSK.last) } catch (error2) { /* 忽略 */ }
          })
      }

      function openEpub(buffer) {
        let zip
        try { zip = unzip(buffer) } catch (error) { hint(error.message); return Promise.resolve() }
        state.zip = zip
        return parseEpub(zip).then((book) => {
          state.chapters = book.chapters
          state.book.title = book.title || state.book.name
          state.book.toc = book.toc
          setBar(book.creator ? book.title + " · " + book.creator : book.title)
          btnToc.hidden = book.toc.length === 0 && book.chapters.length < 2
          const saved = readPos()
          if (saved && typeof saved.chapter === "number" && saved.chapter < book.chapters.length) state.chapter = saved.chapter
          return renderChapter()
        }).catch((error) => hint("EPUB 解析失败：" + error.message))
      }

      function renderChapter() {
        const item = state.chapters[state.chapter]
        if (!item) return Promise.resolve()
        btnPrev.disabled = state.chapter <= 0
        btnNext.disabled = state.chapter >= state.chapters.length - 1
        progressEl.textContent = (state.chapter + 1) + " / " + state.chapters.length
        hint("载入中…")

        return entryText(state.zip, item.href).then((html) => {
          if (html === null) throw new Error("章节缺失：" + item.href)
          const doc = new DOMParser().parseFromString(html, "text/html")
          sanitize(doc)
          return hydrateImages(state.zip, doc, dirname(item.href)).then(() => {
            const holder = document.createElement("div")
            while (doc.body.firstChild) holder.appendChild(doc.body.firstChild)
            setPaper(Array.from(holder.childNodes))
            const saved = readPos()
            if (saved && saved.chapter === state.chapter && saved.ratio) {
              applyRatio(saved.ratio)
              // 图片解码会改变 scrollHeight，下一帧与稍后再各校正一次
              requestAnimationFrame(() => applyRatio(saved.ratio))
              setTimeout(() => applyRatio(saved.ratio), 200)
            }
          })
        }).catch((error) => hint("章节渲染失败：" + error.message))
      }

      function goto(index) {
        if (index < 0 || index >= state.chapters.length) return
        savePos() // 先把旧章节的滚动位置存档
        state.chapter = index
        // 新章节从顶部开始：立刻落盘，避免"切完就走"回退一章
        writePos({ ws: state.ws, path: state.book.path, chapter: index, ratio: 0 })
        renderChapter()
        closeDrawers()
      }

      /* ---------------- 书架 ---------------- */

      function closeDrawers() {
        shelf.hidden = true
        tocDrawer.hidden = true
        state.tocOpen = false
      }

      function renderCrumb() {
        if (state.mode === "books") { crumb.textContent = "全部书籍"; return }
        crumb.innerHTML = ""
        const rootLink = document.createElement("a")
        rootLink.textContent = "根目录"
        rootLink.onclick = () => loadTree("")
        crumb.appendChild(rootLink)
        let accumulated = ""
        for (const part of state.cwd ? state.cwd.split("/") : []) {
          accumulated = accumulated ? accumulated + "/" + part : part
          crumb.appendChild(document.createTextNode(" / "))
          const link = document.createElement("a")
          link.textContent = part
          const target = accumulated
          link.onclick = () => loadTree(target)
          crumb.appendChild(link)
        }
      }

      function highlight() {
        for (const row of shelfList.querySelectorAll(".dsr-row")) {
          row.classList.toggle("active", !!state.book && row.dataset.path === state.book.path)
        }
      }

      function renderBooks() {
        shelfList.innerHTML = ""
        renderCrumb()
        if (state.books.length === 0) {
          shelfList.innerHTML = '<div class="dsr-hint">工作区里没找到 epub / txt / md / html / pdf。<br>把书放进工作区任意目录即可。</div>'
          return
        }
        for (const book of state.books) {
          const row = document.createElement("div")
          row.className = "dsr-row"
          row.dataset.path = book.path
          row.title = book.path
          const name = document.createElement("span")
          name.className = "n"
          name.textContent = book.name
          const meta = document.createElement("span")
          meta.className = "m"
          meta.textContent = fmtSize(book.size)
          row.append(name, meta)
          row.onclick = () => open(book.path)
          shelfList.appendChild(row)
        }
        highlight()
      }

      function renderEntries() {
        shelfList.innerHTML = ""
        renderCrumb()
        if (state.entries.length === 0) {
          shelfList.innerHTML = '<div class="dsr-hint">空目录</div>'
          return
        }
        for (const entry of state.entries) {
          const row = document.createElement("div")
          row.className = "dsr-row"
          const name = document.createElement("span")
          name.className = "n"
          name.textContent = (entry.dir ? "▸ " : "") + entry.name
          const meta = document.createElement("span")
          meta.className = "m"
          meta.textContent = entry.dir ? "" : fmtSize(entry.size)
          row.append(name, meta)
          if (entry.dir) {
            const target = state.cwd ? state.cwd + "/" + entry.name : entry.name
            row.onclick = () => loadTree(target)
          } else if (entry.book) {
            const target = state.cwd ? state.cwd + "/" + entry.name : entry.name
            row.dataset.path = target
            row.onclick = () => open(target)
          } else {
            row.style.opacity = ".4"
          }
          shelfList.appendChild(row)
        }
        highlight()
      }

      // 书架扫描是慢请求：用序号丢弃过期响应，避免"扫描完成时把用户切回书架"
      let shelfSeq = 0

      function loadBooks() {
        const seq = ++shelfSeq
        state.mode = "books"
        shelfList.innerHTML = '<div class="dsr-hint">扫描中…</div>'
        renderCrumb()
        return getJson("books?ws=" + encodeURIComponent(state.ws))
          .then((body) => {
            if (seq !== shelfSeq) return
            state.books = body.books
            renderBooks()
          })
          .catch((error) => {
            if (seq !== shelfSeq) return
            shelfList.innerHTML = '<div class="dsr-hint">' + error.message + "</div>"
          })
      }

      function loadTree(path) {
        const seq = ++shelfSeq
        state.mode = "tree"
        state.cwd = path || ""
        shelfList.innerHTML = '<div class="dsr-hint">载入中…</div>'
        renderCrumb()
        return getJson("list?ws=" + encodeURIComponent(state.ws) + "&path=" + encodeURIComponent(state.cwd))
          .then((body) => {
            if (seq !== shelfSeq) return
            state.entries = body.entries
            renderEntries()
          })
          .catch((error) => {
            if (seq !== shelfSeq) return
            shelfList.innerHTML = '<div class="dsr-hint">' + error.message + "</div>"
          })
      }

      function renderToc() {
        tocList.innerHTML = ""
        const links = (state.book && state.book.toc) || []
        if (links.length === 0) {
          for (let index = 0; index < state.chapters.length; index++) {
            const row = document.createElement("div")
            row.className = "dsr-row" + (index === state.chapter ? " active" : "")
            const name = document.createElement("span")
            name.className = "n"
            name.textContent = "第 " + (index + 1) + " 章"
            row.appendChild(name)
            row.onclick = () => goto(index)
            tocList.appendChild(row)
          }
          return
        }
        for (const link of links) {
          const index = state.chapters.findIndex((chapter) => chapter.href === link.href)
          const row = document.createElement("div")
          row.className = "dsr-row" + (index === state.chapter ? " active" : "")
          const name = document.createElement("span")
          name.className = "n"
          name.textContent = link.label
          row.appendChild(name)
          row.onclick = () => (index >= 0 ? goto(index) : hint("这一章不在 spine 里"))
          tocList.appendChild(row)
        }
      }

      /* ---------------- 事件 ---------------- */

      function onClick(event) {
        const button = event.target.closest("button")
        if (!button) return
        const act = button.dataset.act
        if (act === "shelf") {
          const opening = shelf.hidden
          closeDrawers()
          shelf.hidden = !opening
          pop.hidden = true
          if (opening) loadBooks()
          return
        }
        if (act === "toc") {
          const opening = tocDrawer.hidden
          closeDrawers()
          tocDrawer.hidden = !opening
          state.tocOpen = opening
          pop.hidden = true
          if (opening) renderToc()
          return
        }
        if (act === "close-drawer") { closeDrawers(); return }
        if (act === "settings") { pop.hidden = !pop.hidden; return }
        if (act === "books") { loadBooks(); return }
        if (act === "tree") { loadTree(""); return }
        if (act === "prev") { goto(state.chapter - 1); return }
        if (act === "next") { goto(state.chapter + 1); return }
        if (button.dataset.theme) {
          localStorage.setItem(LSK.theme, button.dataset.theme)
          applySettings()
          return
        }
        if (button.dataset.size) {
          const next = Math.min(26, Math.max(13, Number(localStorage.getItem(LSK.size) || 17) + Number(button.dataset.size)))
          localStorage.setItem(LSK.size, String(next))
          applySettings()
          return
        }
        if (button.dataset.line) {
          const next = Math.min(240, Math.max(130, Number(localStorage.getItem(LSK.line) || 185) + Number(button.dataset.line) * 10))
          localStorage.setItem(LSK.line, String(next))
          applySettings()
        }
      }

      function onKey(event) {
        if (!root.contains(document.activeElement) && document.activeElement !== root) return
        if (event.key === "Escape") {
          // 老板键：直接收起整列，会话区不受影响
          event.preventDefault()
          event.stopPropagation()
          if (!shelf.hidden || !tocDrawer.hidden || !pop.hidden) { closeDrawers(); pop.hidden = true; return }
          savePos()
          if (typeof onBossKey === "function") onBossKey()
          return
        }
        if (event.key === "ArrowRight" || event.key === "j") {
          if (state.chapters.length > 0) goto(state.chapter + 1)
          else scroller.scrollBy({ top: scroller.clientHeight * 0.9 })
          return
        }
        if (event.key === "ArrowLeft" || event.key === "k") {
          if (state.chapters.length > 0) goto(state.chapter - 1)
          else scroller.scrollBy({ top: -scroller.clientHeight * 0.9 })
        }
      }

      let scrollTimer = null
      function onScroll() {
        // 立刻抓快照：防抖窗口内若切了书，写盘也不会串到新书身上
        pendingSnap = snapshotPos()
        clearTimeout(scrollTimer)
        scrollTimer = setTimeout(() => {
          writePos(pendingSnap)
          pendingSnap = null
        }, 400)
      }

      let onBossKey = null

      function onHide() { if (document.visibilityState === "hidden") savePos() }
      document.addEventListener("visibilitychange", onHide)
      window.addEventListener("pagehide", onHide)

      host.addEventListener("click", onClick)
      host.addEventListener("keydown", onKey)
      scroller.addEventListener("scroll", onScroll)
      wsSelect.addEventListener("change", () => {
        state.ws = wsSelect.value
        try { localStorage.setItem(LSK.ws, state.ws) } catch (error) { /* 忽略 */ }
        loadBooks()
      })

      /* ---------------- 启动 ---------------- */

      applySettings()
      getJson("roots").then((body) => {
        state.roots = body.roots || []
        if (state.roots.length === 0) {
          shelfList.innerHTML = '<div class="dsr-hint">dsh 还没有注册工作区。</div>'
          return
        }
        for (const root of state.roots) {
          const option = document.createElement("option")
          option.value = root.path
          option.textContent = root.title
          wsSelect.appendChild(option)
        }
        let last = null
        try { last = JSON.parse(localStorage.getItem(LSK.last) || "null") } catch (error) { last = null }
        const remembered = localStorage.getItem(LSK.ws)
        // 优先级：上次读的书所在工作区 → 上次选的工作区 → 第一个工作区
        const preferred = [last && last.ws, remembered]
          .find((candidate) => candidate && state.roots.some((root) => root.path === candidate))
        state.ws = preferred || state.roots[0].path
        wsSelect.value = state.ws
        // 上次读的那本书：工作区对得上就直接接上，否则退回书架
        if (last && last.path && last.ws === state.ws) open(last.path)
        else loadBooks()
      }).catch((error) => hint("无法读取工作区：" + error.message))

      return {
        dispose() {
          // 叉掉 tab / 收起面板 / 切会话都会走到这里：先把进度落盘
          savePos()
          host.removeEventListener("click", onClick)
          host.removeEventListener("keydown", onKey)
          scroller.removeEventListener("scroll", onScroll)
          document.removeEventListener("visibilitychange", onHide)
          window.removeEventListener("pagehide", onHide)
          clearTimeout(scrollTimer)
        },
        setBossHandler(handler) { onBossKey = handler },
      }
    }

    /* ------------------------------------------------------------------ React 壳 */

    function Reader(props) {
      const hostRef = react.useRef(null)
      const apiRef = react.useRef(null)

      react.useEffect(() => {
        const host = hostRef.current
        if (!host) return undefined
        const api = mount(host)
        apiRef.current = api
        api.setBossHandler(props.onBossKey)
        host.querySelector(".dsr-root").focus()
        return () => {
          api.dispose()
          apiRef.current = null
        }
      }, [])

      return h("div", { ref: hostRef, style: { height: "100%", minHeight: 0 } })
    }

    /* ------------------------------------------------------------------ 插件 */

    function apply(ctx) {
      injectStyle()

      const collapse = () => {
        try { ctx.sidebarRight.toggleExpanded() } catch (error) {
          console.warn("[dsh-peek] 收起侧栏失败", error)
        }
      }

      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: TAB_ID,
        kind: KIND,
        priority: "builtin",
        title: () => "阅读器",
        guide: [{
          id: "open",
          order: 60,
          title: () => "阅读器",
          description: () => "在工作区里读书，Esc 一键收起",
        }],
      }), "dsh-peek: tab type")

      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
        name: "sidebar.right.pane.tab",
        key: TAB_ID,
      }, (props) => h(Reader, { ...props, onBossKey: collapse }))), "dsh-peek: pane body")

      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
        name: "sidebar.right.pane.tab.title",
        key: TAB_ID,
      }, () => h("span", null, "阅读器"))), "dsh-peek: pane title")
    }

    return { name: PLUGIN, inject, apply, __mount: mount }
  },
})
