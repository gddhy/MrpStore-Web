/**
 * MRP 下载站静态网页与 API JSON 构建主程序
 * （Node.js 版，迁移自 Java 版 Main.java）
 *
 * 用法：
 *   node src/main.js             普通站点构建
 *   node src/main.js ResSite=true 资源站模式（仅生成 API 数据）
 *
 * 与 Java 版一致：以当前工作目录为根，读写 MrpWeb/ 目录。
 */
const fs = require('fs');
const path = require('path');
const { getMrpInfo } = require('./mrp-info');
const JarUtils = require('./jar-utils');
const SKY = require('./sky-bmp-fix');
const Html = require('./html');
const {
    save, read, deletePath, copyFile, md5, gzipFile, getFormatSize,
    change10To32, extractResolution, renameFile, collatorCompare,
    sortApps, mergeJsonWithPrefix, downLoadFromUrl
} = require('./utils');

const PUBLIC_WWW = path.join(process.cwd(), 'MrpWeb');
const PAGE_NUMBER = 15; // 单页应用程序数量
let isResSite = false; // 是否资源站模式

function getFileType(file) {
    return path.extname(file).substring(1).toLowerCase();
}

function getFileName(file) {
    const base = path.basename(file);
    return base.substring(0, base.lastIndexOf('.'));
}

/** 生成应用日志信息（迁移自 Main.getMrpInfo） */
function getMrpLogInfo(item) {
    let info = '';
    if (item.type === 'mrp') {
        const c = item.config;
        info += ('名称：' + c.displayName + '\n');
        info += ('内部名：' + c.fileName + '\n');
        info += ('厂商：' + c.vendor + '\n');
        info += ('介绍：' + c.desc + '\n');
        info += ('id：' + c.appid + '\n');
        info += ('版本：' + c.version + '\n');
        info += ('文件：' + item.file + '\n');
        info += ('大小：' + getFormatSize(fs.statSync(item.file).size) + '\n');
        info += '\n';
    } else {
        const j = item.jarInfo;
        info += ('名称：' + j.name + '\n');
        info += ('厂商：' + j.vendor + '\n');
        info += ('介绍：' + j.detail + '\n');
        info += ('版本：' + j.version + '\n');
        info += ('图标：' + j.icon + '\n');
        info += ('文件：' + item.file + '\n');
        info += ('大小：' + getFormatSize(fs.statSync(item.file).size) + '\n');
        info += '\n';
    }
    return info;
}

/** 获取页数（迁移自 Main.getPages） */
function getPages(all) {
    if (all % PAGE_NUMBER === 0) {
        return all / PAGE_NUMBER - 1;
    }
    return Math.floor(all / PAGE_NUMBER);
}

async function main() {
    console.log('程序开始执行');
    console.log('工作目录：' + process.cwd());
    console.log('网站目录：' + PUBLIC_WWW);
    console.log('MRP目录：' + path.join(PUBLIC_WWW, 'mrp-files'));
    console.log('JAR目录：' + path.join(PUBLIC_WWW, 'jar-files'));
    console.log('资源站传参：node src/main.js ResSite=true');

    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('ResSite=')) {
            isResSite = arg.split('=')[1] === 'true';
        }
    }
    console.log('是否资源站：' + isResSite);

    const pageDir = path.join(PUBLIC_WWW, 'pages');
    if (fs.existsSync(pageDir)) {
        console.log('清理旧缓存');
        deletePath(pageDir);
        deletePath(path.join(PUBLIC_WWW, 'mrp'));
        deletePath(path.join(PUBLIC_WWW, 'jar'));
        deletePath(path.join(PUBLIC_WWW, 'index.html'));
        deletePath(path.join(PUBLIC_WWW, 'search.json'));
        deletePath(path.join(PUBLIC_WWW, 'about'));
        deletePath(path.join(PUBLIC_WWW, '404.html'));
        deletePath(path.join(PUBLIC_WWW, 'api'));
    }

    const mrpIconDir = path.join(PUBLIC_WWW, 'mrp-icon');

    // ---------- 获取 Mrp 列表 ----------
    console.log('获取Mrp列表');
    let mrpList = [];
    const mrpDir = path.join(PUBLIC_WWW, 'mrp-files');
    if (fs.existsSync(mrpDir)) {
        for (const name of fs.readdirSync(mrpDir)) {
            const file = path.join(mrpDir, name);
            if (!fs.statSync(file).isFile()) continue;
            if (getFileType(file) !== 'mrp') continue;
            if (SKY.isMrpFile(file)) {
                try {
                    getMrpInfo(file); // 校验可读取
                    const tmpFile = renameFile(file);
                    const config = getMrpInfo(tmpFile);
                    mrpList.push({ type: 'mrp', file: tmpFile, name: config.displayName, config: config });
                } catch (e) {
                    console.log('Mrp读取失败：' + path.basename(file));
                    if (isResSite) {
                        console.log('异常文件删除：' + path.basename(file));
                        deletePath(file);
                    }
                }
            } else {
                console.log('非MRP文件：' + name);
                if (isResSite) {
                    console.log('异常文件删除：' + name);
                    deletePath(file);
                }
            }
        }
    }

    // ---------- 获取 Jar 列表 ----------
    console.log('获取Jar列表');
    const jarDir = path.join(PUBLIC_WWW, 'jar-files');
    if (fs.existsSync(jarDir)) {
        for (const name of fs.readdirSync(jarDir)) {
            const file = path.join(jarDir, name);
            if (!fs.statSync(file).isFile()) continue;
            if (getFileType(file) !== 'jar') continue;
            const tmpFile = renameFile(file);
            try {
                const jarName = JarUtils.getJarAppName(tmpFile);
                mrpList.push({ type: 'jar', file: tmpFile, name: jarName, jarInfo: JarUtils.getJarInfo(tmpFile) });
            } catch (e) {
                console.log('添加失败：' + tmpFile);
            }
        }
    }

    console.log('共计：' + mrpList.length);
    if (mrpList.length === 0) {
        // Java 版此处会因空列表崩溃，Node 版直接跳过列表生成
        console.log('未发现任何应用，仅生成基础页面');
    }

    // ---------- 第一次文件名排序（中文 Collator） ----------
    mrpList.sort((a, b) => collatorCompare(a.name || '', b.name || ''));

    // ---------- 二次整理：ASCII 开头在前，非 ASCII 在后 ----------
    {
        const tmpList = [...mrpList];
        mrpList = [];
        for (let i = 0; i < 2; i++) {
            for (const item of tmpList) {
                try {
                    const type = (item.name || '').substring(0, 1).charCodeAt(0) >= 128 ? 3 : 1;
                    if (type < 2 && i === 0) {
                        mrpList.push(item);
                    }
                    if (type >= 2 && i !== 0) {
                        mrpList.push(item);
                    }
                } catch (e) {
                    console.log('异常文件：' + path.basename(item.file));
                }
            }
        }
    }

    // ---------- mrp 分类排序：顶置 sky_ / 新程序 new_ / 普通 / 置底 ----------
    {
        const topList = [];    // 顶置程序 文件名开始包含 sky_
        const newList = [];    // 新程序 文件名开始包含 new_
        const endList = [];    // 置底程序 文件名开始包含 [免费] [壁纸] [网游] (免费)
        const normalList = []; // 普通程序

        for (const item of mrpList) {
            const fileName = path.basename(item.file);
            const itemName = item.name || '';
            if (fileName.startsWith('sky_')) {
                console.log('顶置程序：' + itemName);
                topList.push(item);
            } else if (fileName.startsWith('new_')) {
                console.log('新程序：' + itemName);
                newList.push(item);
            } else if (itemName.startsWith('[免费]') || itemName.startsWith('[壁纸]') ||
                itemName.startsWith('[网游]') || itemName.startsWith('(免费)')) {
                console.log('置底程序：' + itemName);
                endList.push(item);
            } else {
                normalList.push(item);
            }
        }
        mrpList = [...topList, ...newList, ...normalList, ...endList];
    }

    // ---------- 本地 SKY 图标修复 ----------
    {
        console.log('本地SKY图标修复');
        SKY.fixLocalSkyBmp({ workDir: process.cwd(), mrpIconDir: mrpIconDir });
        console.log('获取小蟀应用商店mrp图标');
        // 获取小蟀 apihost（迁移自 Main 中下载 netConfig.json 的逻辑）
        const configFile = path.join(process.cwd(), 'netConfig.json');
        try {
            await downLoadFromUrl('https://gddhy.net/data/MrpStoreUpdate.json', 'netConfig.json', process.cwd());
        } catch (e) {
            console.error(e.message);
        }
        const jsonStr = read(configFile);
        let apiHost = '';
        try {
            const jsonObject = JSON.parse(jsonStr);
            apiHost = jsonObject.sai_api_host || '';
        } catch (e) {
            console.error(e.message);
        }
        // 与 Java 版逻辑一致：apiHost 为空时尝试获取图标
        if (apiHost == null || apiHost === '') {
            for (const item of mrpList) {
                if (item.type !== 'mrp') continue;
                const id = item.config.appid;
                await SKY.getNetWorkIco(id, apiHost, { workDir: process.cwd(), mrpIconDir: mrpIconDir });
                console.log('获取图标：' + item.config.displayName);
            }
        }
    }

    // ---------- 生成应用介绍页面 ----------
    if (mrpList.length > 0) {
        console.log('生成应用介绍');
        for (const item of mrpList) {
            const relPath = path.relative(PUBLIC_WWW, item.file).replaceAll('\\', '/');
            const down = '/' + relPath;

            if (item.type === 'mrp') {
                // mrp 文件处理逻辑
                const c = item.config;
                const size = fs.statSync(item.file).size;

                let res = '';
                let resZipFile = '';
                const resFile = path.join(path.dirname(item.file), getFileName(item.file) + '.zip');
                if (fs.existsSync(resFile)) {
                    resZipFile = '/' + path.relative(PUBLIC_WWW, resFile).replaceAll('\\', '/');
                    res += '<br/><br/>[资源包下载]: <a href="' + resZipFile + '">' + path.basename(resFile) + '</a>' +
                        '<br/>[资源包大小]: ' + getFormatSize(fs.statSync(resFile).size);

                    const resInfoFile = path.join(path.dirname(item.file), getFileName(item.file) + '.txt');
                    if (fs.existsSync(resInfoFile)) {
                        res += '<br/>[资源包说明]: ' + read(resInfoFile);
                    }
                }

                const iconId = change10To32(String(c.appid)).toUpperCase() + '.png';
                const iconFile = path.join(mrpIconDir, iconId);
                const icon = fs.existsSync(iconFile) ? '/mrp-icon/' + iconId : '/mrp-icon/C6N5.png';

                const scr = extractResolution(item.file.toLowerCase()) || '240x320';

                const itemHtml = Html.getItem(c, icon, getFormatSize(size), scr, down, res, resZipFile);
                save(path.join(PUBLIC_WWW, 'mrp', getFileName(item.file), 'index.html'), itemHtml);
            } else {
                // jar 处理逻辑
                const jarInfo = item.jarInfo;
                const savePath = path.join(PUBLIC_WWW, 'jar', getFileName(item.file));
                let res = '';
                const resInfoFile = path.join(path.dirname(item.file), getFileName(item.file) + '.txt');
                if (fs.existsSync(resInfoFile)) {
                    res = '<br/>[应用说明]: ' + read(resInfoFile);
                }
                const icon = path.join(savePath, 'icon.png');
                let isSaveIcon = false;
                if (jarInfo && jarInfo.icon) {
                    isSaveIcon = JarUtils.saveJarIcon(item.file, jarInfo.icon, icon);
                }
                const iconPath = isSaveIcon ? ('/' + path.relative(PUBLIC_WWW, icon).replaceAll('\\', '/')) : '';
                save(path.join(savePath, 'index.html'),
                    Html.getJarItem(jarInfo, iconPath, getFormatSize(fs.statSync(item.file).size), down, res));
            }
        }

        // ---------- 生成列表分页 ----------
        console.log('生成列表分页');
        let j = 0; // 记录每页应用数量
        let k = 0; // 记录页号
        let info = ''; // 页中列表
        let allInfo = ''; // 总列表
        for (let i = 0; i < mrpList.length; i++) {
            const item = mrpList[i];
            allInfo += Html.getListItem(item, true);
            if (i === mrpList.length - 1) {
                j = PAGE_NUMBER;
            }
            if (j < PAGE_NUMBER - 1) {
                j++;
                info += Html.getListItem(item, true);
            } else {
                j = 0;
                const end = getPages(mrpList.length);
                info += Html.getListItem(item, false);
                save(path.join(pageDir, String(k), 'index.html'), Html.getList(info, k, end, '/pages/all/'));
                if (k === 0) {
                    save(path.join(PUBLIC_WWW, 'index.html'), Html.getList(info, k, end, '/pages/all/'));
                }
                k++;
                info = '';
            }
        }
        save(path.join(pageDir, 'all', 'index.html'), Html.getList(allInfo, 0, 0, './'));

        // ---------- 生成搜索索引 ----------
        console.log('生成搜索索引');
        const searchInfo = [];
        let log = '';
        for (const item of mrpList) {
            const link = item.type === 'mrp' ? '/mrp/' + getFileName(item.file) : '/jar/' + getFileName(item.file);
            searchInfo.push({ name: item.name, link: link });
            log += getMrpLogInfo(item);
        }
        save(path.join(PUBLIC_WWW, 'search.json'), JSON.stringify(searchInfo));
        save(path.join(PUBLIC_WWW, 'log.txt'), log);
    }

    save(path.join(PUBLIC_WWW, 'about', 'index.html'), Html.getAbout());
    save(path.join(PUBLIC_WWW, '404.html'), Html.get404());

    // ---------- 生成在线商店信息-包含Md5 ----------
    console.log('生成在线商店信息-包含Md5');
    const onlineInfo = [];
    for (const item of mrpList) {
        if (item.type !== 'mrp') continue;
        const c = item.config;
        const fileLen = fs.statSync(item.file).size;
        const down = '/' + path.relative(PUBLIC_WWW, item.file).replaceAll('\\', '/');

        let resLen = 0;
        let res = '';
        let resSize = '';
        let resInfo = '';
        const resFile = path.join(path.dirname(item.file), getFileName(item.file) + '.zip');
        if (fs.existsSync(resFile)) {
            res = '/' + path.relative(PUBLIC_WWW, resFile).replaceAll('\\', '/');
            resSize = getFormatSize(fs.statSync(resFile).size);
            resLen = fs.statSync(resFile).size;

            const resInfoFile = path.join(path.dirname(item.file), getFileName(item.file) + '.txt');
            if (fs.existsSync(resInfoFile)) {
                resInfo = read(resInfoFile);
            }
        }

        const iconId = change10To32(String(c.appid)).toUpperCase() + '.png';
        const iconFile = path.join(mrpIconDir, iconId);
        const icon = fs.existsSync(iconFile) ? '/mrp-icon/' + iconId : '/mrp-icon/C6N5.png';

        const scr = extractResolution(item.file.toLowerCase()) || '240x320';

        let md5Str = md5(item.file);
        if (md5Str == null) {
            md5Str = '';
        }

        onlineInfo.push({
            label: c.displayName,
            name: c.fileName,
            id: c.appid,
            vendor: c.vendor,
            version: c.version,
            detail: c.desc,
            icon: icon,
            scr: scr,
            size: getFormatSize(fileLen),
            down: down,
            res: res,
            resSize: resSize,
            resInfo: resInfo,
            len: fileLen,
            resLen: resLen,
            md5: md5Str
        });
    }
    const json = JSON.stringify(onlineInfo);
    const apiPath = path.join(PUBLIC_WWW, (isResSite ? '' : 'api'), 'list.json');
    save(apiPath, json);
    // 生成压缩数据
    gzipFile(apiPath, apiPath + '.gz');

    // ---------- 合并线上数据生成 v2 接口 ----------
    if (!isResSite) {
        console.log('获取更多补充信息');
        const onlineJson = path.join(process.cwd(), 'online.json');
        let onlineFresh = false;
        try {
            await downLoadFromUrl('https://full.mrp.gddhy.net/list.json', 'online.json', process.cwd());
            onlineFresh = true;
        } catch (e) {
            console.error(e.message);
        }

        // 与 Java 版一致：仅使用本次新下载的数据（Java 版会先删除旧文件，这里用标志位保证语义相同）
        const onlineData = onlineFresh ? read(onlineJson) : null;
        if (onlineData != null) {
            console.log('合并json数据');
            const prefix = 'https://full.mrp.gddhy.net';
            const result = mergeJsonWithPrefix(json, onlineData, prefix);
            console.log('合计mrp数量：' + result.length);

            // 排序并保存
            const sortedArray2 = sortApps(result);
            const fullApiPath = path.join(PUBLIC_WWW, 'api', 'v2', 'list.json');
            save(fullApiPath, JSON.stringify(sortedArray2));
            // 生成压缩数据
            gzipFile(fullApiPath, fullApiPath + '.gz');
        }
    }

    // ---------- 生成在线商店信息分页（240x320） ----------
    if (!isResSite) {
        console.log('生成在线商店信息分页');
        const pageApps = 5; // 每个分页应用数量
        console.log('筛选240320程序');
        const onlineInfo240320 = onlineInfo.filter((o) => o.scr === '240x320');
        console.log('240320程序共' + onlineInfo240320.length + '个');
        const k = Math.ceil(onlineInfo240320.length / pageApps); // 合计多少页
        console.log('每页' + pageApps + '个应用，共' + k + '页');
        let j = 0; // 记录当前第几页
        let tmp = [];
        for (let i = 0; i < onlineInfo240320.length; i++) {
            let nowSize = tmp.length;
            if (i === onlineInfo240320.length - 1) {
                nowSize = pageApps;
            }
            if (nowSize < pageApps - 1) {
                tmp.push(onlineInfo240320[i]);
            } else {
                tmp.push(onlineInfo240320[i]);
                j++;
                const pageItem = { allPages: k, now: j, data: JSON.parse(JSON.stringify(tmp)) };
                tmp = [];
                save(path.join(PUBLIC_WWW, 'api', 'list_' + j + '.json'), JSON.stringify(pageItem));
            }
        }
    }

    // ---------- 资源站模式：删除非必要文件 ----------
    if (isResSite) {
        console.log('资源站删除非必要文件');
        if (fs.existsSync(PUBLIC_WWW)) {
            for (const name of fs.readdirSync(PUBLIC_WWW)) {
                if (name !== 'mrp-files' && name !== 'list.json' && name !== '.git') {
                    deletePath(path.join(PUBLIC_WWW, name));
                }
            }
        }
        save(path.join(PUBLIC_WWW, 'index.html'), Html.getJumpHtml());
        save(path.join(PUBLIC_WWW, '404.html'), Html.getJumpHtml());
    }

    console.log('程序执行完成');
}

main().catch((e) => {
    console.error('执行出错：', e);
    process.exit(1);
});
