/**
 * MRP 资源目录索引生成（Node.js 版，迁移自 Java 版 MrpResApi.java）
 *
 * 扫描工作目录下 MrpRes/ 的每个子目录，递归生成 <目录名>.json 索引，
 * 并根据 config.json 中 fix_res 配置调整 appName 与资源目录不对应的问题。
 */
const fs = require('fs');
const path = require('path');
const { save, read, getFormatSize, deletePath } = require('./utils');

const PUBLIC_RESOURCES = path.join(process.cwd(), 'MrpRes');
let MRP_RES_HOST = '/';

/** 递归扫描目录，生成 JSON 数组 */
function scanDirectoryRecursively(directory, basePath) {
    const fileArray = [];
    if (!fs.existsSync(directory)) {
        return fileArray;
    }
    for (const name of fs.readdirSync(directory)) {
        const full = path.join(directory, name);
        try {
            const stat = fs.statSync(full);
            if (stat.isFile()) {
                const rel = path.relative(basePath, full).replaceAll('\\', '/');
                fileArray.push({
                    name: rel,
                    size: getFormatSize(stat.size),
                    url: MRP_RES_HOST + rel
                });
            } else if (stat.isDirectory()) {
                fileArray.push(...scanDirectoryRecursively(full, basePath));
            }
        } catch (e) {
            console.error("处理文件 '" + name + "' 时出错: " + e.message);
        }
    }
    return fileArray;
}

/** 为指定目录生成索引文件 */
function generateIndexForDirectory(directory, basePath) {
    const dirName = path.basename(directory);
    console.log("正在为目录 '" + dirName + "' 生成索引...");
    try {
        const indexArray = scanDirectoryRecursively(directory, basePath);
        const indexFile = path.join(PUBLIC_RESOURCES, dirName + '.json');
        save(indexFile, JSON.stringify(indexArray));
        console.log('已生成索引文件: ' + dirName + '.json (包含 ' + indexArray.length + ' 个文件)');
        return true;
    } catch (e) {
        console.error("为目录 '" + dirName + "' 生成索引时出错: " + e.message);
        return false;
    }
}

function main() {
    console.log('程序开始执行');
    console.log('工作目录：' + process.cwd());
    console.log('资源目录：' + PUBLIC_RESOURCES);

    // 读取配置
    const configFile = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(read(configFile));
    MRP_RES_HOST = config.mrp_res_host || '/';

    console.log('清理旧缓存');
    if (fs.existsSync(PUBLIC_RESOURCES)) {
        const jsonFiles = fs.readdirSync(PUBLIC_RESOURCES).filter((n) => n.endsWith('.json'));
        if (jsonFiles.length > 0) {
            for (const f of jsonFiles) {
                deletePath(path.join(PUBLIC_RESOURCES, f));
            }
        } else {
            console.log('无缓存文件');
        }

        console.log('扫描资源目录');
        const subDirs = fs.readdirSync(PUBLIC_RESOURCES)
            .map((n) => path.join(PUBLIC_RESOURCES, n))
            .filter((p) => fs.statSync(p).isDirectory());

        if (subDirs.length === 0) {
            console.log('当前目录下没有子目录。');
            return;
        }

        console.log('找到 ' + subDirs.length + ' 个资源目录');

        // 为每个子目录生成索引
        let successCount = 0;
        for (const subDir of subDirs) {
            if (generateIndexForDirectory(subDir, PUBLIC_RESOURCES)) {
                successCount++;
            }
        }
        console.log('索引生成完成！成功生成 ' + successCount + ' 个索引文件。');

        // 调整 appName 与资源目录不对应的问题
        const fixRes = config.fix_res;
        if (fixRes && fixRes.length > 0) {
            console.log('正在调整资源目录与appName不对应的问题...');
            for (const fixItem of fixRes) {
                const appName = fixItem.appName;
                const resDir = fixItem.resDir;
                const jsonFile = path.join(PUBLIC_RESOURCES, resDir + '.json');
                if (fs.existsSync(jsonFile)) {
                    const newJsonFile = path.join(PUBLIC_RESOURCES, appName + '.json');
                    if (fs.existsSync(newJsonFile)) {
                        deletePath(newJsonFile);
                    }
                    fs.renameSync(jsonFile, newJsonFile);
                    console.log('已调整 ' + path.basename(jsonFile) + ' 到 ' + path.basename(newJsonFile));
                }
            }
        }
    }
}

main();
