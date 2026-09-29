/**
 * JAR 文件解析（迁移自 JarUtils.java 与 JarInfo.java）
 * 从 jar (zip) 包内读取 META-INF/MANIFEST.MF 提取 MIDlet 信息与图标
 */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * 读取 jar 包内的 MANIFEST.MF 文本
 */
function getManifest(jarFile) {
    const zip = new AdmZip(jarFile);
    const entry = zip.getEntry('META-INF/MANIFEST.MF');
    if (!entry) {
        return '';
    }
    return zip.readAsText(entry, 'utf8');
}

/**
 * 解析 jar 信息（迁移自 JarUtils.getJarInfo）
 * @returns {object} { name, vendor, detail, icon, version }
 */
function getJarInfo(jarFile) {
    const jarInfo = { name: null, vendor: null, detail: null, icon: null, version: null };
    const mf = getManifest(jarFile);
    const list = mf.split(/\r?\n/);
    for (const line of list) {
        if (line.includes('MIDlet-Name: ')) {
            jarInfo.name = line.substring('MIDlet-Name: '.length);
        }
        if (line.includes('MIDlet-Version: ')) {
            jarInfo.version = line.substring('MIDlet-Version: '.length);
        }
        if (line.includes('MIDlet-Vendor: ')) {
            jarInfo.vendor = line.substring('MIDlet-Vendor: '.length);
        }
        if (line.includes('MIDlet-Description: ')) {
            jarInfo.detail = line.substring('MIDlet-Description: '.length);
        }
        if (line.includes('MIDlet-Icon: ')) {
            jarInfo.icon = line.substring('MIDlet-Icon: '.length);
        }
    }
    if (jarInfo.icon == null) {
        for (const line of list) {
            if (line.includes('MIDlet-1: ')) {
                let tmp = line.substring(line.indexOf(',') + 1, line.lastIndexOf(','));
                tmp = tmp.replaceAll(' ', '');
                jarInfo.icon = tmp;
            }
        }
    }
    if (jarInfo.name == null) {
        for (const line of list) {
            if (line.includes('MIDlet-1: ')) {
                let tmp = line.substring('MIDlet-1: '.length, line.indexOf(','));
                tmp = tmp.replaceAll(' ', '');
                jarInfo.name = tmp;
            }
        }
    }
    return jarInfo;
}

/** 获取 jar 应用名称（迁移自 JarUtils.getJarAppName） */
function getJarAppName(jarFile) {
    return getJarInfo(jarFile).name;
}

/**
 * 从 jar 包内提取图标到指定路径（迁移自 JarUtils.saveJarIcon）
 * @param {string} jarFile jar 文件路径
 * @param {string} jarIconName 包内图标路径
 * @param {string} savePath 保存路径
 * @returns {boolean} 是否成功
 */
function saveJarIcon(jarFile, jarIconName, savePath) {
    if (jarIconName.indexOf('/') === 0) {
        jarIconName = jarIconName.substring(1);
    }
    try {
        const zip = new AdmZip(jarFile);
        const entry = zip.getEntry(jarIconName);
        if (!entry) {
            return false;
        }
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, zip.readFile(entry));
        return true;
    } catch (e) {
        console.error(e.message);
        return false;
    }
}

module.exports = {
    getJarInfo: getJarInfo,
    getJarAppName: getJarAppName,
    saveJarIcon: saveJarIcon
};
