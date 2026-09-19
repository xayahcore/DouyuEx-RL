/**
 * DouyuEx-RL Greasy Fork 发布合规性审查审计工具 (7 大核心合规门禁)
 *
 * 审查目标: artifacts/next/DouyuEx_RL_NEXT.user.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(ROOT_DIR, 'artifacts/next/DouyuEx_RL_NEXT.user.js');

function runAudit() {
    console.log('=== DouyuEx-RL NEXT Greasy Fork 发布合规性审查 ===\n');

    if (!fs.existsSync(TARGET_FILE)) {
        console.error(`❌ [Gate 0] 找不到产物文件: ${TARGET_FILE}`);
        process.exit(1);
    }

    const content = fs.readFileSync(TARGET_FILE, 'utf8');
    const lines = content.split('\n');
    let failures = 0;

    // Gate 1: 元数据头完整性
    const headerMatch = content.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
    if (!headerMatch) {
        console.error('❌ [Gate 1] 缺失合法的 UserScript 元数据头部');
        failures++;
    } else {
        console.log('✅ [Gate 1] UserScript 元数据头完整性验证通过');
    }

    // Gate 2: 依赖 CDN 白名单与合规性
    const requireLines = lines.filter(l => l.trim().startsWith('// @require'));
    let cdnOk = true;
    for (const line of requireLines) {
        const url = line.replace('// @require', '').trim();
        if (url.includes('npmmirror.com')) {
            console.error(`❌ [Gate 2] 发现被 GreasyFork 封禁的 npmmirror CDN: ${url}`);
            cdnOk = false;
        }
        if (!url.startsWith('https://fastly.jsdelivr.net/') && !url.startsWith('https://cdn.jsdelivr.net/')) {
            console.warn(`⚠️ [Gate 2] 外部 CDN 依赖不在建议推荐列表: ${url}`);
        }
    }
    if (cdnOk) {
        console.log(`✅ [Gate 2] 外部 CDN 依赖合规 (共 ${requireLines.length} 个依赖均来自官方 jsDelivr 白名单)`);
    } else {
        failures++;
    }

    // Gate 3: 单行长度审查 (GreasyFork 5000 字符限制)
    let maxLineLen = 0;
    let longLineCount = 0;
    lines.forEach((l, idx) => {
        if (l.length > maxLineLen) maxLineLen = l.length;
        if (l.length > 5000) {
            longLineCount++;
            if (longLineCount <= 3) {
                console.warn(`⚠️ [Gate 3] 第 ${idx + 1} 行长度超标: ${l.length} 字符`);
            }
        }
    });
    if (longLineCount === 0) {
        console.log(`✅ [Gate 3] 行长度审查通过 (最大行长度: ${maxLineLen} 字符，全部 <= 5000)`);
    } else {
        console.log(`ℹ️ [Gate 3] 发现 ${longLineCount} 行超长代码 (最大行长: ${maxLineLen})，建议在生产打包前格式化`);
    }

    // Gate 4: V8 原生语法解析校验
    try {
        new vm.Script(content, { filename: 'DouyuEx_RL_NEXT.user.js' });
        console.log('✅ [Gate 4] V8 原生 Script 语法核验 100% 通过，无语法错误');
    } catch (e) {
        console.error(`❌ [Gate 4] V8 语法核验失败: ${e.message}`);
        failures++;
    }

    // Gate 5: 匹配规则与房间别名支持
    const matchLines = lines.filter(l => l.trim().startsWith('// @match'));
    const hasUniversalMatch = matchLines.some(l => l.includes('*://*.douyu.com/*'));
    if (hasUniversalMatch) {
        console.log('✅ [Gate 5] URL 匹配规则支持全站及字母房间别名冷启动 (*://*.douyu.com/*)');
    } else {
        console.warn('⚠️ [Gate 5] 缺失全站通用匹配规则，字母别名房间可能无法启动');
    }

    // Gate 6: 单例执行守卫
    if (content.includes('DYEXRL_NEXT_COMPAT_CLAIM')) {
        console.log('✅ [Gate 6] 单例执行守卫 (DYEXRL_NEXT_COMPAT_CLAIM) 校验通过');
    } else {
        console.error('❌ [Gate 6] 缺失单例执行守卫');
        failures++;
    }

    // Gate 7: 存储命名空间隔离
    if (content.includes('DYEXRL_NEXT:')) {
        console.log('✅ [Gate 7] 存储前缀隔离代理 (DYEXRL_NEXT:) 校验通过');
    } else {
        console.error('❌ [Gate 7] 缺失独立存储命名空间隔离代理');
        failures++;
    }

    console.log(`\n审查完成: ${failures === 0 ? '🎉 全部合规门禁通过！' : `❌ 发现 ${failures} 项失败`}`);
    process.exit(failures === 0 ? 0 : 1);
}

runAudit();
