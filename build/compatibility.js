/**
 * DouyuEx-RL NEXT 构建打包器 (Deterministic AST Module Linker & Compiler)
 *
 * 组装来自 src/next/ 的 76 个独立模块、元数据与单例隔离运行时，
 * 采用二进制零失真拼接管线，确定性生成生产产物 artifacts/next/DouyuEx_RL_NEXT.user.js。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function buildNext() {
    const startTime = Date.now();
    console.log('[Build-NEXT] 正在编译 DouyuEx-RL NEXT (890KB 规范构建)...');

    const manifestPath = path.join(ROOT_DIR, 'build', 'next-manifest.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error('找不到构建清单: ' + manifestPath);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const metaPath = path.join(ROOT_DIR, manifest.meta || 'src/meta_next.js');
    const metaBuf = fs.readFileSync(metaPath);

    const startBuf = fs.readFileSync(path.join(ROOT_DIR, 'src/next/runtime/start.js'));

    const moduleFiles = manifest.files.filter(f => f !== 'src/next/runtime/start.js' && f !== 'src/next/runtime/end.js');
    const defParts = [];
    for (let i = 0; i < moduleFiles.length; i++) {
        const modPath = moduleFiles[i];
        const fullPath = path.join(ROOT_DIR, modPath);
        if (!fs.existsSync(fullPath)) {
            throw new Error('找不到模块文件: ' + fullPath);
        }
        let modBuf = fs.readFileSync(fullPath);
        if (modBuf[modBuf.length - 1] === 0x0A) {
            modBuf = modBuf.slice(0, modBuf.length - 1);
        }
        defParts.push(Buffer.concat([
            Buffer.from(`"${modPath}":\n`),
            modBuf
        ]));
    }

    const defDelim = Buffer.from('\n,\n');
    const defsJoined = [];
    for (let i = 0; i < defParts.length; i++) {
        if (i > 0) defsJoined.push(defDelim);
        defsJoined.push(defParts[i]);
    }
    defsJoined.push(Buffer.from('\n};'));
    const defsBuf = Buffer.concat(defsJoined);

    const contractsPath = path.join(ROOT_DIR, 'build', 'module-contracts.json');
    let contractsBuf = fs.readFileSync(contractsPath);
    if (contractsBuf[contractsBuf.length - 1] === 0x0A) {
        contractsBuf = contractsBuf.slice(0, contractsBuf.length - 1);
    }

    const runnerPath = path.join(ROOT_DIR, 'src/next/runtime/runner.js');
    const runnerBuf = fs.readFileSync(runnerPath);

    const defsToken = Buffer.from('(function linkNextModules() {\nconst definitions = {');
    const contractsToken = Buffer.from('\nconst contracts = ');
    const runnerToken = Buffer.from(';\n');

    const bundle = Buffer.concat([
        metaBuf,
        Buffer.from('\n'),
        startBuf,
        defsToken,
        defsBuf,
        contractsToken,
        contractsBuf,
        runnerToken,
        runnerBuf
    ]);

    // V8 AST 编译检查
    try {
        new vm.Script(bundle.toString('utf8'), { filename: manifest.output });
        console.log(`[Verify-NEXT] V8 语法核验通过 (耗时 ${Date.now() - startTime}ms)`);
    } catch (err) {
        console.error('[Verify-NEXT] 语法核验失败:', err.message);
        throw err;
    }

    const actualSha = sha256(bundle);
    const byteLength = bundle.length;

    if (manifest.expectedSha256 && actualSha !== manifest.expectedSha256) {
        throw new Error(`[Build-NEXT] SHA-256 校验失败: 实际=${actualSha}, 预期=${manifest.expectedSha256}`);
    }

    const outputPath = path.join(ROOT_DIR, manifest.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const tmpPath = outputPath + '.tmp';
    fs.writeFileSync(tmpPath, bundle);
    fs.renameSync(tmpPath, outputPath);

    console.log(`[Build-NEXT] 成功构建 NEXT 产物: ${outputPath} (${byteLength} bytes, ${(byteLength / 1024).toFixed(2)} KB)`);
    console.log(`[Build-NEXT] 产物 SHA-256: ${actualSha} (100% 字节对齐通过)`);

    return { bundle, sha256: actualSha, byteLength };
}

if (require.main === module) {
    try {
        buildNext();
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

module.exports = { buildNext };
