const fs = require("fs");
const path = require("path");
const vm = require("vm");
const uglifyjs = require("uglify-js");

let css = "";
const cssFileSpans = [];
let cssNormalizedLength = 0;
let js = "";
let coreJs = "";

function handleCoreFolder() {
  const coreFiles = ["./src/core/quality.js", "./src/core/rank_engine.js"];
  coreFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      coreJs += fs.readFileSync(file, "utf8") + "\r\n";
    }
  });
}

function handleFolder(folderPath, excludingFileName) {
  // 读取文件夹中的所有文件和子文件夹
  fs.readdirSync(folderPath).forEach((item) => {
    const itemPath = path.join(folderPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      // 核心层单独优先处理，跳过遍历
      if (path.normalize(itemPath) === path.normalize(path.join("./src", "core"))) {
        return;
      }
      handleFolder(itemPath, excludingFileName);
    } else {
      if (item !== excludingFileName) {
        const fileContent = fs.readFileSync(itemPath, "utf8");
        // 记录每个 CSS 文件在拼接串中的起始偏移：CSS 拼接后会删掉 CRLF 变成一整行，
        // 行号随之失去意义，只有偏移量能把报错定位回具体文件（见 verifyCssSafety）。
        // 注意偏移必须按"删除 CRLF 之后"的长度累计，否则会整体错位、指到隔壁文件。
        if (item.includes(".css")) {
          cssFileSpans.push({ file: itemPath, start: cssNormalizedLength });
          cssNormalizedLength += fileContent.replace(/\r\n/g, "").length;
          css += fileContent + "\r\n";
        }
        if (item.includes(".js")) js += fileContent + "\r\n";
      }
    }
  });
}

function generateVersion() {
  if (!fs.existsSync("./dist")) {
    fs.mkdirSync("./dist", { recursive: true });
  }
  // 解析失败必须中断：此前这里是写死的旧版本号兜底，一旦 main.js 的 @version
  // 读不到就会静默产出错误版本，版本日志校验也会按错版本号去查表。
  const mainContent = fs.readFileSync("./src/main.js", "utf8");
  const m = mainContent.match(/\/\/\s*@version\s+([^\r\n]+)/);
  if (!m || !m[1]) {
    console.error("[Build] 无法从 src/main.js 解析 @version，终止构建（避免静默产出错误版本号）");
    process.exit(1);
  }
  const version = m[1].trim();
  fs.writeFileSync("./dist/DouyuEx_RL_version.txt", version);
  fs.writeFileSync("./dist/douyuex_version.txt", version);
  return version;
}

/**
 * 版本更新日志数据源强校验门禁。
 * 约束：当前 @version 必须在 UpdateLog.js 中存在条目，且三大板块齐备、非空、条目格式合规。
 * 任一不满足直接中断构建，从机制上杜绝"发版漏写更新日志"与"格式跑偏"。
 */
function verifyUpdateLog(version) {
  const logPath = "./src/packages/Update/UpdateLog.js";
  if (!fs.existsSync(logPath)) {
    console.error("[Verify] 版本更新日志数据源缺失:", logPath);
    process.exit(1);
  }

  const src = fs.readFileSync(logPath, "utf8");
  const sandbox = {};
  let data;
  try {
    vm.createContext(sandbox);
    vm.runInContext(
      src + "\n;globalThis.__EXLOG__ = { log: EX_UPDATE_LOG, sections: EX_UPDATE_LOG_SECTIONS };",
      sandbox
    );
    data = sandbox.__EXLOG__;
  } catch (err) {
    console.error("[Verify] 版本更新日志数据源解析失败:", err.message);
    process.exit(1);
  }

  const sections = data.sections;
  const log = data.log;
  if (!Array.isArray(sections) || sections.length === 0 || !log || typeof log !== "object") {
    console.error("[Verify] 版本更新日志数据源结构非法（缺少 EX_UPDATE_LOG / EX_UPDATE_LOG_SECTIONS）");
    process.exit(1);
  }

  const entry = log[version];
  if (!entry) {
    console.error(`[Verify] 版本更新日志缺少当前版本 ${version} 的条目，请先在 UpdateLog.js 中补充`);
    process.exit(1);
  }

  const unknown = Object.keys(entry).filter((k) => sections.indexOf(k) === -1);
  if (unknown.length > 0) {
    console.error(`[Verify] 版本 ${version} 存在未声明的板块: ${unknown.join("、")}`);
    process.exit(1);
  }

  let total = 0;
  sections.forEach((name) => {
    const items = entry[name];
    if (!Array.isArray(items) || items.length === 0) {
      console.error(`[Verify] 版本 ${version} 的板块【${name}】缺失或为空，不允许留空占位`);
      process.exit(1);
    }
    items.forEach((item, idx) => {
      const text = typeof item === "string" ? item.trim() : "";
      if (!/^【[^】]+】.+/.test(text)) {
        console.error(
          `[Verify] 版本 ${version} 板块【${name}】第 ${idx + 1} 条格式不合规（必须以 【分类】 开头且有说明文字）: ${JSON.stringify(item)}`
        );
        process.exit(1);
      }
    });
    total += items.length;
  });

  console.log(`[Verify] 版本更新日志校验通过 (版本 ${version}，${sections.length} 大板块，共 ${total} 条)`);
}

function treeShakeOnce(code) {
  return uglifyjs.minify(code, {
    toplevel: true,
    compress: {
      toplevel: true,
      unused: true,
      dead_code: true,
      side_effects: false,
      passes: 1,
      collapse_vars: false,
      reduce_vars: false,
      conditionals: false,
      comparisons: false,
      evaluate: false,
      booleans: false,
      typeofs: false,
      loops: false,
      if_return: false,
      inline: false,
      join_vars: false,
      properties: false,
      switches: false,
      hoist_props: false,
    },
    mangle: false,
    output: {
      beautify: true,
      comments: false,
    },
  });
}

function treeShake(code) {
  const originalSize = Buffer.byteLength(code);
  console.log(`[Tree Shake] 原始大小: ${originalSize} 字节`);

  let current = code;
  let round = 0;
  while (true) {
    round++;
    const result = treeShakeOnce(current);
    if (result.error) {
      console.error(`[Tree Shake] 第 ${round} 轮错误:`, result.error);
      return current;
    }
    const prevSize = Buffer.byteLength(current);
    const newSize = Buffer.byteLength(result.code);
    const diff = prevSize - newSize;
    console.log(`[Tree Shake] 第 ${round} 轮: ${prevSize} -> ${newSize} 字节, 减少 ${diff} 字节`);
    if (diff <= 0) break;
    current = result.code;
  }

  const finalSize = Buffer.byteLength(current);
  const totalSaved = originalSize - finalSize;
  const savedPercent = ((totalSaved / originalSize) * 100).toFixed(1);
  console.log(`[Tree Shake] 完成! 共 ${round} 轮, 减少 ${totalSaved} 字节 (${savedPercent}%)`);
  return current;
}

function extractHeader(code) {
  const endTag = "// ==/UserScript==";
  const idx = code.indexOf(endTag);
  if (idx === -1) return { header: "", body: code };
  const splitPos = idx + endTag.length;
  return {
    header: code.substring(0, splitPos) + "\r\n\r\n",
    body: code.substring(splitPos),
  };
}

/**
 * CSS 不能出现反引号、${ 或"单个反斜杠 + 数字"—— 因为 CSS 是注入到 main.js 的
 * 模板字面量 (`document.createTextNode(\`...\`)`) 内的：
 *  - 反引号会提前闭合模板字面量
 *  - ${ 会被当成插值起始
 *  - \<数字> 是非法八进制转义（模板字面量不允许），如写 CSS 码点转义 "\\2713" 时会命中
 * 三者都会让语法核验报出 "missing ) after argument list" 这类极难定位的错误。
 * 注意 "\\2713"（双反斜杠）是安全的 —— 只在 CSS 里写转义时才需要改成字面字符。
 *
 * 报错定位用「偏移量 + 具体文件」而非行号：CSS 在拼接时已删除 CRLF，整份样式是一行，
 * 行号恒为 1，没有参考价值。
 */
function verifyCssSafety() {
  const offenders = [];
  const mark = (why, at, len) => offenders.push({ why, at, len });

  let i = -1;
  while ((i = css.indexOf("`", i + 1)) !== -1) mark("反引号", i, 1);
  i = -1;
  while ((i = css.indexOf("${", i + 1)) !== -1) mark("${（模板插值起始）", i, 2);
  const escRe = /(^|[^\\])\\[\d]/g;
  let m;
  while ((m = escRe.exec(css)) !== null) {
    mark("反斜杠+数字（非法八进制转义）", m.index + m[1].length, m[0].length - m[1].length);
  }

  if (offenders.length === 0) return;

  const fileOf = (at) => {
    let hit = "(未知文件)";
    for (const span of cssFileSpans) {
      if (span.start <= at) hit = span.file; else break;
    }
    return hit;
  };

  console.error("[Verify] CSS 含会破坏模板字面量的字符（反引号 / ${ / 反斜杠+数字），请改为普通文字：");
  offenders.slice(0, 10).forEach((o) => {
    const from = Math.max(0, o.at - 70);
    const snippet = css.slice(from, o.at + o.len + 70).replace(/\s+/g, " ");
    console.error(`  ${fileOf(o.at)}`);
    console.error(`    (${o.why}) …${snippet}…`);
  });
  if (offenders.length > 10) console.error(`  …另有 ${offenders.length - 10} 处`);
  console.error(`  共 ${offenders.length} 处`);
  process.exit(1);
}

function build() {
  console.log("[Build] 开始构建 DouyuEx-RL ...");
  const version = generateVersion();
  console.log(`[Build] 当前版本: ${version}`);

  handleCoreFolder();
  handleFolder("./src", "main.js");
  css = css.replace(/\r\n/g, "");

  // 版本更新日志数据源强校验（早于语法核验，缺失即中断）
  verifyUpdateLog(version);
  // CSS 模板字面量安全性校验
  verifyCssSafety();

  let template = fs.readFileSync("./src/main.js", "utf8");
  template = template
    .replace("// 核心层标记 勿删", coreJs)
    .replace("/*编译器标记 勿删*/", css)
    .replace("// 编译器标记 勿删", js);

  if (!fs.existsSync("./dist")) fs.mkdirSync("./dist", { recursive: true });

  const { header, body } = extractHeader(template);

  // V8 语法静态核验
  try {
    new vm.Script(template);
    console.log("[Verify] 模板代码 V8 语法核验通过 (100% OK)");
  } catch (err) {
    console.error("[Verify] 模板代码语法校验失败:", err.message);
    process.exit(1);
  }

  const shakenBody = treeShake(body);
  const unminifiedOutput = header + shakenBody;

  try {
    new vm.Script(unminifiedOutput);
    console.log("[Verify] 展开产物 V8 语法核验通过 (100% OK)");
  } catch (err) {
    console.error("[Verify] 展开产物语法校验失败:", err.message);
    process.exit(1);
  }

  fs.writeFileSync("./dist/DouyuEx_RL.js", unminifiedOutput);
  fs.writeFileSync("./dist/douyuex.js", unminifiedOutput);

  const result = uglifyjs.minify(shakenBody, { toplevel: true });
  if (result.error) {
    console.error("[Build] Uglify 压缩失败:", result.error);
    process.exit(1);
  }

  const minifiedOutput = header + result.code;
  try {
    new vm.Script(minifiedOutput);
    console.log("[Verify] 压缩产物 V8 语法核验通过 (100% OK)");
  } catch (err) {
    console.error("[Verify] 压缩产物语法校验失败:", err.message);
    process.exit(1);
  }

  fs.writeFileSync("./dist/DouyuEx_RL.user.js", minifiedOutput);
  fs.writeFileSync("./dist/douyuex.user.js", minifiedOutput);
  fs.writeFileSync("./DouyuEx_RL.user.js", minifiedOutput);
  console.log("[Build] 构建成功完成: ./DouyuEx_RL.user.js, ./dist/DouyuEx_RL.js 和 ./dist/DouyuEx_RL.user.js");
}

build();
