/**
 * 通用工具（迁移自 Utils/FileMd5、Utils/GzipUtils、Utils/JSONArraySorterV2、
 * Utils/JsonMergeWithPrefix、Utils/StringUtils、net/gddhy/Utils/ResolutionExtractor、
 * Main.save/read/getFormatSize/change10To32、HttpRequest、DeleteFileUtil、CopyFile）
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { execSync } = require('child_process');
const Pinyin = require('tiny-pinyin');

// ---------- 文件读写（迁移自 Main.save / Main.read） ----------

/** 写入 UTF-8 文本，自动创建父目录 */
function save(fileName, data) {
    fs.mkdirSync(path.dirname(fileName), { recursive: true });
    fs.writeFileSync(fileName, data, 'utf8');
}

/** 读取 UTF-8 文本，文件不存在返回 null */
function read(fileName) {
    if (!fs.existsSync(fileName)) {
        return null;
    }
    return fs.readFileSync(fileName, 'utf8');
}

/** 递归删除（迁移自 DeleteFileUtil.delete） */
function deletePath(target) {
    if (!fs.existsSync(target)) {
        return;
    }
    try {
        fs.rmSync(target, { recursive: true, force: true });
        return;
    } catch (e) {
        // 某些环境下 fs 删除被安全垫片拦截；若目录已被实际删除则直接返回
        if (!fs.existsSync(target)) {
            return;
        }
        // 回退到系统原生命令
    }
    const isDir = fs.statSync(target).isDirectory();
    if (process.platform === 'win32') {
        const winPath = path.resolve(target);
        execSync(isDir ? `rd /s /q "${winPath}"` : `del /f /q "${winPath}"`, { stdio: 'pipe' });
    } else {
        execSync(`rm -rf ${JSON.stringify(path.resolve(target))}`, { stdio: 'pipe' });
    }
}

/** 复制文件（迁移自 CopyFile.copyFile） */
function copyFile(src, dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}

// ---------- 校验与压缩 ----------

/** 计算 MD5（迁移自 Utils.FileMd5.md5） */
function md5(file) {
    try {
        if (!fs.statSync(file).isFile()) {
            return '';
        }
        return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
    } catch (e) {
        console.error(e.message);
        return null;
    }
}

/** GZIP 压缩文件（迁移自 Utils.GzipUtils.compressFile） */
function gzipFile(source, target) {
    try {
        fs.writeFileSync(target, zlib.gzipSync(fs.readFileSync(source)));
        return true;
    } catch (e) {
        console.error('压缩文件失败: ' + e.message);
        return false;
    }
}

// ---------- 数值与格式化 ----------

/** 格式化文件大小（迁移自 Main.getFormatSize，保留两位小数） */
function getFormatSize(size) {
    const kiloByte = size / 1024;
    const megaByte = kiloByte / 1024;
    if (megaByte < 1) {
        return kiloByte.toFixed(2) + 'KB';
    }
    const gigaByte = megaByte / 1024;
    if (gigaByte < 1) {
        return megaByte.toFixed(2) + 'MB';
    }
    const teraBytes = gigaByte / 1024;
    if (teraBytes < 1) {
        return gigaByte.toFixed(2) + 'GB';
    }
    return teraBytes.toFixed(2) + 'TB';
}

/** 10 进制转 32 进制（迁移自 Main.change10To32，MRP 图标以 32 进制存储，数字 0-9 + 字母 a-v） */
function change10To32(num) {
    return BigInt(num).toString(32);
}

/** 32 进制转 10 进制（迁移自 Main.change32To10） */
function change32To10(num) {
    return BigInt(parseInt(num, 32)).toString(10);
}

// ---------- 分辨率提取（迁移自 net.gddhy.Utils.ResolutionExtractor） ----------

const COMMON_RESOLUTIONS = [
    '128x128', '128x160', '132x176', '176x176', '176x208', '176x220',
    '208x208', '220x176', '240x160', '240x240', '240x260', '240x280',
    '240x320', '240x400', '272x480', '320x240', '320x320', '320x480',
    '360x480', '360x640', '480x272', '480x320', '480x360', '480x640',
    '480x800', '480x854', '640x360', '640x480', '720x1280', '750x1334',
    '768x1024', '768x1280', '800x480', '800x600', '854x480', '960x540',
    '960x640', '1024x600', '1024x768', '1080x1920', '1200x1920',
    '1280x720', '1280x768', '1280x800', '1334x750', '1366x768',
    '1440x2560', '1920x1080', '1920x1200', '2048x1536', '2160x3840',
    '2560x1440', '3840x2160'
];

function isValidResolution(resolution) {
    return resolution != null && COMMON_RESOLUTIONS.includes(resolution);
}

/** 提取带 x 分隔符的分辨率格式：三位数字x三位数字 */
function extractResolutionWithX(filePath) {
    const m = filePath.match(/(\d{3})[xX](\d{3})/);
    if (m) {
        return m[1] + 'x' + m[2];
    }
    return null;
}

/** 提取 6 位连续数字格式的分辨率：320480 -> 320x480 */
function extractResolutionFromDigits(filePath) {
    const m = filePath.match(/(?:^|[^\d])(\d{3})(\d{3})(?:$|[^\d])/);
    if (m) {
        return m[1] + 'x' + m[2];
    }
    return null;
}

/** 处理带特殊前缀的分辨率格式：qqlist8240x320 -> 240x320 */
function extractResolutionWithSpecialPrefix(filePath) {
    const specialPrefixes = ['qqlist8', 'qqlist', 'MrpStore', 'app', 'msn', 'fetion'];
    for (const prefix of specialPrefixes) {
        const idx = filePath.indexOf(prefix);
        if (idx !== -1) {
            const afterPrefix = filePath.substring(idx + prefix.length);
            let resolution = extractResolutionWithX(afterPrefix);
            if (resolution == null) {
                resolution = extractResolutionFromDigits(afterPrefix);
            }
            if (isValidResolution(resolution)) {
                return resolution;
            }
        }
    }
    return null;
}

/** 从文件路径中提取分辨率，失败返回 null */
function extractResolution(filePath) {
    if (filePath == null || filePath === '') {
        return null;
    }
    let resolution = extractResolutionWithX(filePath);
    if (isValidResolution(resolution)) {
        return resolution;
    }
    resolution = extractResolutionFromDigits(filePath);
    if (isValidResolution(resolution)) {
        return resolution;
    }
    resolution = extractResolutionWithSpecialPrefix(filePath);
    if (isValidResolution(resolution)) {
        return resolution;
    }
    return null;
}

// ---------- 中文拼音（迁移自 Utils.StringUtils，基于 pinyin4j -> tiny-pinyin） ----------

/** 汉字转拼音（无音调小写，非汉字字符保持不变），与 pinyin4j 行为对齐 */
function toPinyin(chinese) {
    return Pinyin.parse(chinese)
        .map((t) => (t.type === 2 ? t.target.toLowerCase() : t.target))
        .join('');
}

function checkChinese(sequence) {
    return /[\u4e00-\u9fa5]/.test(sequence);
}

// ---------- 文件名合法性（迁移自 Utils.ConfigurableFilenameValidator） ----------

const DEFAULT_INVALID_CHARS = new Set('\\/:*?"<>|#\t\n\r');
for (let i = 0; i <= 0x1f; i++) {
    DEFAULT_INVALID_CHARS.add(String.fromCharCode(i));
}

function containsInvalidChars(filename, additionalInvalidChars) {
    if (filename == null || filename === '') {
        return false;
    }
    const invalid = new Set(DEFAULT_INVALID_CHARS);
    if (additionalInvalidChars) {
        for (const c of additionalInvalidChars) {
            invalid.add(c);
        }
    }
    for (const c of filename) {
        if (invalid.has(c)) {
            return true;
        }
    }
    return false;
}

function replaceInvalidChars(filename, additionalInvalidChars, replacement) {
    if (filename == null || filename === '') {
        return filename;
    }
    const invalid = new Set(DEFAULT_INVALID_CHARS);
    if (additionalInvalidChars) {
        for (const c of additionalInvalidChars) {
            invalid.add(c);
        }
    }
    let result = '';
    for (const c of filename) {
        result += invalid.has(c) ? replacement : c;
    }
    return result;
}

// ---------- 文件重命名（迁移自 Utils.StringUtils.renameFile） ----------

function renameTo(file, newName) {
    const newPath = path.join(path.dirname(file), newName);
    if (!fs.existsSync(file)) {
        return false;
    }
    if (fs.existsSync(newPath)) {
        return false; // 目标已存在，不允许重命名
    }
    try {
        fs.renameSync(file, newPath);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 若文件名包含中文则改为拼音，否则检查并替换非法字符
 * @param {string} file 文件绝对路径
 * @returns {string} 处理后的文件路径（可能未变化）
 */
function renameFile(file) {
    const name = path.basename(file);
    if (checkChinese(name)) {
        let newName = name
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('：', '_')
            .replaceAll('－', '_')
            .replaceAll('！', '_')
            .replaceAll('Ⅱ', '2')
            .replaceAll('。', '_')
            .replaceAll('『', '(')
            .replaceAll('』', ')')
            .replaceAll('２', '2')
            .replaceAll('%', '');
        try {
            newName = toPinyin(newName);
        } catch (e) {
            console.log(name + ' 转拼音失败');
            newName = name;
        }
        if (renameTo(file, newName)) {
            return path.join(path.dirname(file), newName);
        }
        return file;
    } else if (containsInvalidChars(name, '@$%')) {
        const newName = replaceInvalidChars(name, '@$%', '_');
        if (renameTo(file, newName)) {
            return path.join(path.dirname(file), newName);
        }
        return file;
    }
    return file;
}

// ---------- 中文排序（迁移自 Collator.getInstance(Locale.CHINA)） ----------

/** 中文拼音排序（对齐 Java Collator CHINA） */
function collatorCompare(a, b) {
    return a.localeCompare(b, 'zh-Hans-CN');
}

/** Java String.compareTo：按 UTF-16 码元逐位比较 */
function javaStringCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

// ---------- JSONArray 排序（迁移自 Utils.JSONArraySorterV2） ----------

function getCharTypePriority(c) {
    if (/[0-9]/.test(c)) return 1; // 数字
    if (/[a-zA-Z]/.test(c)) return 2; // 字母
    if (/[\u4e00-\u9fa5]/.test(c)) return 3; // 中文
    return 4; // 其他
}

function extractNumberPart(str) {
    const m = str.match(/^\d+/);
    return m ? m[0] : '';
}

function compareSameTypeLabels(label1, label2, type) {
    if (type === 1) {
        // 数字开头：先按数字部分比较
        const numPart1 = extractNumberPart(label1);
        const numPart2 = extractNumberPart(label2);
        if (numPart1 !== '' && numPart2 !== '') {
            const num1 = Number(numPart1);
            const num2 = Number(numPart2);
            if (Number.isSafeInteger(num1) && Number.isSafeInteger(num2) && num1 !== num2) {
                return num1 < num2 ? -1 : num1 > num2 ? 1 : 0;
            }
        }
        return javaStringCompare(label1, label2);
    } else if (type === 2) {
        // 字母开头：不区分大小写比较，相同再区分
        const l1 = label1.toLowerCase();
        const l2 = label2.toLowerCase();
        const result = javaStringCompare(l1, l2);
        if (result !== 0) {
            return result;
        }
        return javaStringCompare(label1, label2);
    } else if (type === 3) {
        // 中文开头：拼音比较器
        return collatorCompare(label1, label2);
    }
    return javaStringCompare(label1, label2);
}

function compareLabels(label1, label2) {
    if (label1 == null && label2 == null) return 0;
    if (label1 == null) return 1; // null 排最后
    if (label2 == null) return -1;
    if (label1 === '' && label2 === '') return 0;
    if (label1 === '') return 1;
    if (label2 === '') return -1;

    const typePriority1 = getCharTypePriority(label1.charAt(0));
    const typePriority2 = getCharTypePriority(label2.charAt(0));
    if (typePriority1 !== typePriority2) {
        return typePriority1 - typePriority2;
    }
    return compareSameTypeLabels(label1, label2, typePriority1);
}

/** 获取 down 字段优先级：sky_ > new_ > 普通 */
function getDownPriority(down) {
    if (down == null) return 2;
    if (down.startsWith('/mrp-files/sky_')) return 0;
    if (down.startsWith('/mrp-files/new_')) return 1;
    return 2;
}

/**
 * 对应用数组排序（迁移自 Utils.JSONArraySorterV2.sortJSONArray）
 * 先按 down 优先级，再按 label 排序：数字 > 字母 > 中文 > 其他
 */
function sortApps(jsonArray) {
    return [...jsonArray].sort((o1, o2) => {
        const p1 = getDownPriority(o1.down);
        const p2 = getDownPriority(o2.down);
        if (p1 !== p2) {
            return p1 - p2;
        }
        return compareLabels(o1.label, o2.label);
    });
}

// ---------- JSON 合并（迁移自 Utils.JsonMergeWithPrefix） ----------

/** 为数组中每个对象的 down 字段添加前缀 */
function addPrefixToDownField(arr, prefix) {
    for (const obj of arr) {
        const originalDown = obj.down;
        if (originalDown != null && originalDown !== '' && prefix != null && prefix !== '') {
            let newDown;
            if (prefix.endsWith('/') && originalDown.startsWith('/')) {
                newDown = prefix + originalDown.substring(1);
            } else if (!prefix.endsWith('/') && !originalDown.startsWith('/')) {
                newDown = prefix + '/' + originalDown;
            } else {
                newDown = prefix + originalDown;
            }
            obj.down = newDown;
        }
    }
    return arr;
}

/** 合并两个 JSON 数组，为第二个数组的 down 字段添加前缀 */
function mergeJsonWithPrefix(jsonStr1, jsonStr2, prefix) {
    const array1 = JSON.parse(jsonStr1);
    const array2 = addPrefixToDownField(JSON.parse(jsonStr2), prefix);
    return array1.concat(array2);
}

// ---------- 网络下载（迁移自 HttpRequest.downLoadFromUrl） ----------

/** 从 URL 下载文件并保存 */
async function downLoadFromUrl(urlStr, fileName, savePath, timeoutMs = 3000) {
    const res = await fetch(urlStr, {
        headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 5.0; Windows NT; DigExt)' },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' ' + urlStr);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(savePath, { recursive: true });
    fs.writeFileSync(path.join(savePath, fileName), buf);
}

module.exports = {
    save: save,
    read: read,
    deletePath: deletePath,
    copyFile: copyFile,
    md5: md5,
    gzipFile: gzipFile,
    getFormatSize: getFormatSize,
    change10To32: change10To32,
    change32To10: change32To10,
    extractResolution: extractResolution,
    toPinyin: toPinyin,
    checkChinese: checkChinese,
    containsInvalidChars: containsInvalidChars,
    replaceInvalidChars: replaceInvalidChars,
    renameFile: renameFile,
    collatorCompare: collatorCompare,
    javaStringCompare: javaStringCompare,
    sortApps: sortApps,
    mergeJsonWithPrefix: mergeJsonWithPrefix,
    downLoadFromUrl: downLoadFromUrl
};
