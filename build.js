/**
 * DouyuEx-RL 构建打包器 (Zero-Dependency Builder)
 * 支持生产构建与 NEXT 重构独立构建:
 *   node build.js         -> 构建现有版本 (DouyuEx_RL.user.js)
 *   node build.js --next  -> 构建 NEXT 重构版本 (artifacts/next/DouyuEx_RL_NEXT.user.js)
 *   node build.js --watch -> 监听热重载
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = __dirname;
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_FILE = path.join(ROOT_DIR, 'DouyuEx_RL.user.js');

function buildLegacy() {
    console.log('[Build-Legacy] 开始编译 DouyuEx-RL ...');
    const startTime = Date.now();

    // 1. 读取元数据头部
    const metaPath = path.join(SRC_DIR, 'meta.js');
    if (!fs.existsSync(metaPath)) {
        throw new Error('找不到元数据文件: ' + metaPath);
    }
    const metaCode = fs.readFileSync(metaPath, 'utf8').trim();

    // 2. 核心底层拦截器 (Core)
    const coreFiles = [
        path.join(SRC_DIR, 'core', 'quality.js'),
        path.join(SRC_DIR, 'core', 'rank_engine.js')
    ];
    let coreCode = '';
    for (const f of coreFiles) {
        if (fs.existsSync(f)) {
            coreCode += fs.readFileSync(f, 'utf8').trim() + '\n\n';
        }
    }

    // 3. 业务组件模块 (Modules)
    const modulesDir = path.join(SRC_DIR, 'modules');
    const moduleFiles = fs.readdirSync(modulesDir)
        .filter(f => f.endsWith('.js'))
        .sort();

    let modulesCode = '';
    for (const f of moduleFiles) {
        const fullPath = path.join(modulesDir, f);
        modulesCode += `/* --- module: ${f} --- */\n` + fs.readFileSync(fullPath, 'utf8').trim() + '\n\n';
    }

    // 4. 主入口执行调度 (Main)
    const mainPath = path.join(SRC_DIR, 'main.js');
    let mainCode = '';
    if (fs.existsSync(mainPath)) {
        mainCode = fs.readFileSync(mainPath, 'utf8').trim();
    }

    // 5. 组合全部内容
    const finalCode = `${metaCode}\n\n${coreCode}${modulesCode}${mainCode}\n`;

    // 6. 语法检查 (基于 V8 原生 Script 编译，零子进程异常)
    try {
        new vm.Script(finalCode);
        console.log(`[Verify-Legacy] 语法核验通过 (V8 校验 100% OK) - 耗时 ${Date.now() - startTime}ms`);
    } catch (err) {
        console.error('[Verify-Legacy] 语法核验失败:', err.message, '\nStack:', err.stack);
        process.exit(1);
    }

    // 7. 写入目标文件
    fs.writeFileSync(OUTPUT_FILE, finalCode, 'utf8');
    const sizeKB = (Buffer.byteLength(finalCode, 'utf8') / 1024).toFixed(2);
    console.log(`[Build-Legacy] 成功生成: ${OUTPUT_FILE} (${sizeKB} KB)`);
}

function buildNext() {
    console.log('[Build-NEXT] 开始编译 DouyuEx-RL NEXT ...');
    const startTime = Date.now();
    const manifestPath = path.join(ROOT_DIR, 'build', 'next-manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error('[Build-NEXT] 找不到清单文件: ' + manifestPath);
        process.exit(1);
    }

    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
        console.error('[Build-NEXT] 清单 JSON 解析失败:', e.message);
        process.exit(1);
    }

    const metaPath = path.join(ROOT_DIR, manifest.meta || 'src/meta_next.js');
    if (!fs.existsSync(metaPath)) {
        console.error('[Build-NEXT] 找不到元数据文件: ' + metaPath);
        process.exit(1);
    }
    const metaCode = fs.readFileSync(metaPath, 'utf8').trim();

    // 校验文件列表
    const fileList = manifest.files || [];
    const seen = new Set();
    let bodyCode = '';
    for (const relFile of fileList) {
        if (seen.has(relFile)) {
            console.error('[Build-NEXT] 清单中存在重复文件: ' + relFile);
            process.exit(1);
        }
        seen.add(relFile);
        const fullPath = path.join(ROOT_DIR, relFile);
        if (!fs.existsSync(fullPath)) {
            console.error('[Build-NEXT] 找不到源文件: ' + fullPath);
            process.exit(1);
        }
        bodyCode += `/* --- NEXT module: ${relFile} --- */\n` + fs.readFileSync(fullPath, 'utf8').trim() + '\n\n';
    }

    const finalCode = `${metaCode}\n\n${bodyCode}`;

    // V8 编译语法核验
    try {
        new vm.Script(finalCode);
        console.log(`[Verify-NEXT] 语法核验通过 (V8 校验 100% OK) - 耗时 ${Date.now() - startTime}ms`);
    } catch (err) {
        console.error('[Verify-NEXT] 语法核验失败:', err.message, '\nStack:', err.stack);
        process.exit(1);
    }

    // 原子写入: 先写临时文件，核验后再 rename
    const outputPath = path.join(ROOT_DIR, manifest.output || 'artifacts/next/DouyuEx_RL_NEXT.user.js');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const tempPath = outputPath + '.tmp';
    fs.writeFileSync(tempPath, finalCode, 'utf8');
    fs.renameSync(tempPath, outputPath);

    const sizeKB = (Buffer.byteLength(finalCode, 'utf8') / 1024).toFixed(2);
    console.log(`[Build-NEXT] 成功生成: ${outputPath} (${sizeKB} KB)`);
}

const isNext = process.argv.includes('--next');
const isWatch = process.argv.includes('--watch');

if (isNext) {
    buildNext();
} else if (isWatch) {
    buildLegacy();
    console.log('[Watch] 正在监听 src/ 目录文件变动 (按 Ctrl+C 退出)...');
    fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(`[Watch] 检测到文件变动: ${filename}，正在重新构建...`);
            try {
                buildLegacy();
            } catch (e) {
                console.error('[Watch] 构建出错:', e.message);
            }
        }
    });
} else {
    buildLegacy();
}

module.exports = { buildLegacy, buildNext };
