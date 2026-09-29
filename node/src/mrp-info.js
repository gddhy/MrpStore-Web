/**
 * MRP 文件头解析（迁移自 mrpbuilder_java/MrpInfo.java 与 net/gddhy/MrpEdit/MrpConfig.java）
 *
 * MRP 头部结构（共 240 字节，通常）：
 *   [0:4]     固定标识 'MRPG'
 *   [4:8]     FileStart     文件列表终点位置（小端）
 *   [8:12]    MrpTotalLen   mrp 文件总长度（小端）
 *   [12:16]   MRPHeaderSize 文件头长度（小端），通常 240
 *   [16:28]   FileName      GBK 编码，'\0' 结尾
 *   [28:52]   DisplayName   GBK 编码，'\0' 结尾
 *   [52:68]   AuthStr       GBK 编码，'\0' 结尾
 *   [68:72]   Appid（小端，后被 [192:196] 大端覆盖）
 *   [72:76]   Version（小端，后被 [196:200] 大端覆盖）
 *   [76:80]   Flag
 *   [80:84]   BuilderVersion
 *   [84:88]   Crc32（读取时跳过）
 *   [88:128]  Vendor        GBK 编码，'\0' 结尾
 *   [128:192] Desc          GBK 编码，'\0' 结尾
 *   [192:196] Appid（大端，最终取值）
 *   [196:200] Version（大端，最终取值）
 *   [200:204] 保留
 *   [204:208] ScreenWidth(低16位) | ScreenHeight(高16位)（小端）
 */
const fs = require('fs');
const iconv = require('iconv-lite');

/** 小端读取 uint32（与 Java readInt 一致，返回带符号 int） */
function readIntLE(buf, offset) {
    return buf.readInt32LE(offset);
}

/** 大端读取 uint32（与 Java readBigInt 一致） */
function readIntBE(buf, offset) {
    return buf.readInt32BE(offset);
}

/**
 * 从 buffer 的 offset 处读取 GBK 字符串，到 '\0' 结束
 * （迁移自 MrpInfo.readGBKString(byte[], int)）
 */
function readGBKString(buf, offset) {
    let len = 0;
    for (let i = offset; i < buf.length; i++) {
        if (buf[i] !== 0) {
            len++;
        } else {
            break;
        }
    }
    const bytes = buf.slice(offset, offset + len);
    return iconv.decode(bytes, 'gbk');
}

/**
 * 解析 MRP 文件信息（迁移自 MrpInfo.getInfo()）
 * @param {string} filepath MRP 文件路径
 * @returns {object|null} config 对象，读取失败抛出异常
 */
function getMrpInfo(filepath) {
    const data = fs.readFileSync(filepath);
    if (data.length < 240) {
        throw new Error('文件过小，不是有效的MRP文件: ' + filepath);
    }

    const config = {
        fileStart: readIntLE(data, 4),
        mrpTotalLen: readIntLE(data, 8),
        mrpHeaderSize: readIntLE(data, 12),
        fileName: readGBKString(data, 16),
        displayName: readGBKString(data, 28),
        authStr: readGBKString(data, 52),
        appid: readIntBE(data, 192),
        version: readIntBE(data, 196),
        flag: readIntLE(data, 76),
        builderVersion: readIntLE(data, 80),
        vendor: readGBKString(data, 88),
        desc: readGBKString(data, 128),
        screenWidth: 0,
        screenHeight: 0,
        listFile: []
    };

    const tempscr = readIntLE(data, 204);
    config.screenWidth = tempscr & 0xffff;
    config.screenHeight = (tempscr >>> 16) & 0xffff;

    // 解析内嵌文件列表：从 MRPHeaderSize 到 FileStart+8
    const listStart = config.mrpHeaderSize;
    const listEnd = config.fileStart + 8;
    for (let offset = listStart; offset < listEnd; ) {
        const fileNameLen = readIntLE(data, offset);
        offset += 4;
        const filename = readGBKString(data, offset);
        offset += fileNameLen;
        const fileOffset = readIntLE(data, offset);
        offset += 4;
        const fileLen = readIntLE(data, offset);
        offset += 4;
        offset += 4; // 保留字段
        config.listFile.push({ filename: filename, offset: fileOffset, len: fileLen });
    }

    return config;
}

module.exports = {
    getMrpInfo: getMrpInfo,
    readGBKString: readGBKString,
    readIntLE: readIntLE,
    readIntBE: readIntBE
};
