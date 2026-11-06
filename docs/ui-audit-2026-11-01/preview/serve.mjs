/* DouyuEx-RL UI 审计预览 · 本地静态服务
 * 用法: node docs/ui-audit-2026-11-01/preview/serve.mjs
 * 根目录固定为仓库根（D:/DouyuEx-RL），端口 8899，只监听 127.0.0.1。
 * 目的：让 harness.html 能直连 /src/packages/ExPanel/ExPanel.css 与 /src/packages/ExIcon/ExIcons.js，
 * 保证预览侧用的是仓库里真实的 CSS 和真实的图标池，而不是复制品。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = "D:/DouyuEx-RL";
const PORT = 8899;
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function resolveTarget(rawUrl) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(rawUrl, `http://${HOST}:${PORT}`).pathname);
  } catch (e) {
    return null;
  }
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const abs = path.normalize(path.join(ROOT, urlPath));
  // 目录穿越防护：解析后必须仍在 ROOT 之内
  if (!abs.startsWith(path.resolve(ROOT))) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  const abs = resolveTarget(req.url || "/");
  if (!abs) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end("bad path");
    return;
  }
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404 " + path.relative(ROOT, abs));
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(abs).toLowerCase()] || "application/octet-stream",
      "content-length": st.size,
      "cache-control": "no-store"
    });
    fs.createReadStream(abs).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[preview] serving ${ROOT} at http://${HOST}:${PORT}/`);
  console.log(`[preview] harness: http://${HOST}:${PORT}/docs/ui-audit-2026-11-01/preview/harness.html`);
});
