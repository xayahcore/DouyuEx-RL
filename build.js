const fs = require("fs");
const path = require("path");
const vm = require("vm");
const uglifyjs = require("uglify-js");

let css = "";
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
        if (item.includes(".css")) css += fileContent + "\r\n";
        if (item.includes(".js")) js += fileContent + "\r\n";
      }
    }
  });
}

function generateVersion() {
  if (!fs.existsSync("./dist")) {
    fs.mkdirSync("./dist", { recursive: true });
  }
  let version = "2026.09.22.01";
  if (fs.existsSync("./src/main.js")) {
    const mainContent = fs.readFileSync("./src/main.js", "utf8");
    const m = mainContent.match(/\/\/\s*@version\s+([^\r\n]+)/);
    if (m && m[1]) version = m[1].trim();
  }
  fs.writeFileSync("./dist/DouyuEx_RL_version.txt", version);
  fs.writeFileSync("./dist/douyuex_version.txt", version);
  return version;
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

function build() {
  console.log("[Build] 开始构建 DouyuEx-RL ...");
  const version = generateVersion();
  console.log(`[Build] 当前版本: ${version}`);

  handleCoreFolder();
  handleFolder("./src", "main.js");
  css = css.replace(/\r\n/g, "");

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
