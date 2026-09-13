/**
 * DouyuEx-RL 构建打包器 (Zero-Dependency Builder)
 * 自动遍历读取 src/ 目录下的所有模块，按拓扑顺序拼接输出至根目录 DouyuEx_RL.user.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = __dirname;
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_FILE = path.join(ROOT_DIR, 'DouyuEx_RL.user.js');

function build() {
    console.log('[Build] 开始编译 DouyuEx-RL ...');
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
        console.log(`[Verify] 语法核验通过 (V8 校验 100% OK) - 耗时 ${Date.now() - startTime}ms`);
    } catch (err) {
        console.error('[Verify] 语法核验失败:', err.message, '\nStack:', err.stack);
        process.exit(1);
    }

    // 7. 写入目标文件
    fs.writeFileSync(OUTPUT_FILE, finalCode, 'utf8');
    const sizeKB = (Buffer.byteLength(finalCode, 'utf8') / 1024).toFixed(2);
    console.log(`[Build] 成功生成: ${OUTPUT_FILE} (${sizeKB} KB)`);
}

if (process.argv.includes('--watch')) {
    build();
    console.log('[Watch] 正在监听 src/ 目录文件变动 (按 Ctrl+C 退出)...');
    fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(`[Watch] 检测到文件变动: ${filename}，正在重新构建...`);
            try {
                build();
            } catch (e) {
                console.error('[Watch] 构建出错:', e.message);
            }
        }
    });
} else {
    build();
}
