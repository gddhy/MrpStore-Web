/**
 * 小蟀(Sky) BMP 图标修复（迁移自 SKY_BMP_FIX.java）
 * 原理：图标数据是去掉/损坏 BMP 文件头的位图，补上正确的 14+40 字节 BMP 头
 */
const fs = require('fs');
const path = require('path');
const { change10To32 } = require('./utils');

const SKY_BITMAP_ICO_HEX_FIX =
    '424dce0c000000000000460000003800000028000000d8ffffff0100100003000000880c0000120b0000120b0000000000000000000000f80000e00700001f00000000000000';
const SKY_BITMAP_40x40_HEX_FIX =
    '424dce0c000000000000460000003800000028000000d8ffffff0100100003000000880c0000120b0000120b0000000000000000000000f80000e00700001f00000000000000';
const SKY_BITMAP_48x58_HEX_FIX =
    '424d0e16000000000000460000003800000030000000c6ffffff0100100003000000c8150000120b0000120b0000000000000000000000f80000e00700001f00000000000000';
const SKY_BITMAP_HEX_END = '00';
const SKY_BITMAP_SAI_APP_HEX_FIX =
    '424dc60c00000000000046000000380000002800000028000000010010000300000000c80000a00f0000a00f0000000000000000000000f80000e00700001f00000000000000';

/** 读取文件并转为16进制字符串 */
function getFileHex(filePath) {
    try {
        return fs.readFileSync(filePath).toString('hex');
    } catch (e) {
        console.error(e.message);
        return '';
    }
}

/** 将16进制字符串写回二进制文件 */
function writeHex2Binary(filePath, hex) {
    fs.writeFileSync(filePath, Buffer.from(hex, 'hex'));
}

/** 修复标准 Sky BMP 图标（保留原文件头之后的全部数据） */
function fixSkyBmpIco(src, dest) {
    const hex = getFileHex(src);
    writeHex2Binary(dest, SKY_BITMAP_ICO_HEX_FIX + hex + SKY_BITMAP_HEX_END);
}

/** 修复 Sky BMP 图标（跳过原文件前 8 字节，用于完整 ico） */
function fixSkyBmpIcoTmp(src, dest) {
    let hex = getFileHex(src);
    hex = hex.substring(16);
    writeHex2Binary(dest, SKY_BITMAP_ICO_HEX_FIX + hex + SKY_BITMAP_HEX_END);
}

/** 修复 SaiApp BMP 图标 */
function fixSkyBmpSaiApp(src, dest) {
    const hex = getFileHex(src);
    writeHex2Binary(dest, SKY_BITMAP_SAI_APP_HEX_FIX + hex);
}

function fixSkyBmp40(src, dest) {
    const hex = getFileHex(src);
    writeHex2Binary(dest, SKY_BITMAP_40x40_HEX_FIX + hex + SKY_BITMAP_HEX_END);
}

function fixSkyBmp48(src, dest) {
    const hex = getFileHex(src);
    writeHex2Binary(dest, SKY_BITMAP_48x58_HEX_FIX + hex + SKY_BITMAP_HEX_END);
}

/**
 * 判断链接是否有效（HEAD 请求，迁移自 SKY_BMP_FIX.isValid）
 */
async function isValid(strLink) {
    try {
        const res = await fetch(strLink, { method: 'HEAD' });
        return res.ok;
    } catch (e) {
        return false;
    }
}

/**
 * 下载网络图标（迁移自 SKY_BMP_FIX.getNetWorkIco）
 * @param {number} appId 应用ID
 * @param {string} apiHost 小蟀 API host
 * @param {object} ctx 上下文 { workDir, mrpIconDir }
 */
async function getNetWorkIco(appId, apiHost, ctx) {
    const ID = change10To32(String(appId)).toUpperCase();
    const iconFile = path.join(ctx.mrpIconDir, ID + '.png');
    if (fs.existsSync(iconFile)) {
        return; // 图标已存在
    }
    const link = apiHost + '/mrp/res/' + ID + '.ico';
    if (!(await isValid(link))) {
        return; // SaiApp图标不存在
    }
    const tmp = path.join(ctx.workDir, 'tempIcon');
    const tmpFix = path.join(ctx.workDir, 'tempIconFix');
    fs.mkdirSync(tmp, { recursive: true });
    fs.mkdirSync(tmpFix, { recursive: true });
    try {
        const res = await fetch(link);
        if (!res.ok) throw new Error('下载失败 ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        const icoPath = path.join(tmp, ID + '.ico');
        fs.writeFileSync(icoPath, buf);
        const save = path.join(tmpFix, ID + '.png');
        fixSkyBmpIcoTmp(icoPath, save);
        fs.copyFileSync(save, iconFile);
    } catch (e) {
        console.error(e.message);
    }
}

/**
 * 修复本地 SkyIcon 目录下的 BMP 图标（迁移自 SKY_BMP_FIX.fixLocalSkyBmp）
 */
function fixLocalSkyBmp(ctx) {
    const root = path.join(ctx.workDir, 'SkyIcon');
    if (!fs.existsSync(root)) {
        return;
    }
    const files = fs.readdirSync(root);
    for (const f of files) {
        const full = path.join(root, f);
        if (!fs.statSync(full).isFile()) continue;
        const name = path.basename(f, path.extname(f));
        const newSave = path.join(ctx.mrpIconDir, name + '.png');
        fs.mkdirSync(ctx.mrpIconDir, { recursive: true });
        fixSkyBmpIcoTmp(full, newSave);
    }
}

/**
 * 判断文件是否为 MRP 文件（前4字节包含 'MRPG'，迁移自 SKY_BMP_FIX.isMrpFile）
 */
function isMrpFile(file) {
    try {
        const fd = fs.openSync(file, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        return buf.toString('latin1').includes('MRPG');
    } catch (e) {
        return false;
    }
}

module.exports = {
    fixSkyBmpIco: fixSkyBmpIco,
    fixSkyBmpIcoTmp: fixSkyBmpIcoTmp,
    fixSkyBmpSaiApp: fixSkyBmpSaiApp,
    fixSkyBmp40: fixSkyBmp40,
    fixSkyBmp48: fixSkyBmp48,
    getNetWorkIco: getNetWorkIco,
    fixLocalSkyBmp: fixLocalSkyBmp,
    isMrpFile: isMrpFile
};
