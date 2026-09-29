/**
 * HTML 模板生成（迁移自 Html.java，模板内容 1:1 对齐）
 */
const path = require('path');

function getOnlinePlay(title, mrpFile, screen, resZipFile) {
    return '[在线打开]: <a href="/vmrp/?f=' + mrpFile + '&title=' + title + '&scr=' + screen +
        ((resZipFile != null && resZipFile.length > 0) ? ('&res=' + resZipFile) : '') +
        '" target="_blank">' + title + '</a><br/>';
}

function getItem(c, icon, size, SCR_Type, downFile, res, resZipFile) {
    return '<!DOCTYPE html>' + '\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">' + '\n' +
        '<head>' + '\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=0.9">' + '\n' +
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' + '\n' +
        '<title id="title">' + c.displayName + ' - WAP下载站</title>' + '\n' +
        '</head>' + '\n' +
        '<body><div id="div_b">' + '\n' +
        '<p>' + c.displayName + ' - WAP下载站<br/><br/>应用程序详细信息</p>' + '\n' +
        '<hr/>' + '\n' +
        '<p>' + (icon.length !== 0 ? ('[应用图标]: <img src="' + icon + '" alt="icon" /><br/>') : '') +
        '[应用名称]: ' + c.displayName + '<br/>[内部名称]: ' + c.fileName +
        '<br/>[版本]: ' + c.version + '<br/>[应用ID]: ' + c.appid +
        '<br/>[开发者]: ' + c.vendor + '<br/>[分辨率]: ' + SCR_Type +
        '<br/>[平台]: Mrp<br/>[大小]: ' + size + '<br/>[应用介绍]: ' + c.desc + '<p/>' + '\n' +
        '<hr/>' + '\n' +
        '<p>' + getOnlinePlay(c.displayName, downFile, SCR_Type, resZipFile) +
        '[应用下载]: <a href="' + downFile + '" target="_blank">' + path.basename(downFile) + '</a>' + res + '</p>' + '\n' +
        '<hr/>' + '\n' +
        getInput() + '\n' +
        '<hr id="inhr"/>' + '\n' +
        getFoot() + '</div>' + getJs() + getCloudflareWebAnalytics() +
        '</body>' + '\n' +
        '</html>';
}

function getJarItem(jarInfo, icon, size, downFile, res) {
    return '<!DOCTYPE html>' + '\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">' + '\n' +
        '<head>' + '\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=0.9">' + '\n' +
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' + '\n' +
        '<title id="title">' + jarInfo.name + ' - WAP下载站</title>' + '\n' +
        '</head>' + '\n' +
        '<body><div id="div_b">' + '\n' +
        '<p>' + jarInfo.name + ' - WAP下载站<br/><br/>应用程序详细信息</p>' + '\n' +
        '<hr/>' + '\n' +
        '<p>' + (icon.length !== 0 ? ('[应用图标]: <img src="' + icon + '" alt="icon" /><br/>') : '') +
        '[应用名称]: ' + jarInfo.name + '<br/>[版本]: ' + jarInfo.version +
        '<br/>[开发者]: ' + jarInfo.vendor + '<br/>[平台]: J2me/Java<br/>[大小]: ' + size +
        (jarInfo.detail != null ? ('<br/>[应用介绍]: ' + jarInfo.detail) : '') + '<p/>' + '\n' +
        '<hr/>' + '\n' +
        '<p>[应用下载]: <a href="' + downFile + '" target="_blank">' + path.basename(downFile) + '</a>' + res + '</p>' + '\n' +
        '<hr/>' + '\n' +
        getInput() + '\n' +
        '<hr id="inhr"/>' + '\n' +
        getFoot() + '</div>' + getJs() + getCloudflareWebAnalytics() +
        '</body>' + '\n' +
        '</html>';
}

function getList(list, th, end, all) {
    let next = th + 1;
    if (next >= end) {
        next = end;
    }
    let up = th - 1;
    if (up < 0) {
        up = 0;
    }
    return '<!DOCTYPE html>' + '\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">' + '\n' +
        '<head>' + '\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=0.9">' + '\n' +
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' + '\n' +
        '<title id="title">第' + (th + 1) + '页 - WAP下载站</title>' + '\n' +
        '</head>' + '\n' +
        '<body><div id="div_b">' + '\n' +
        '<p>WAP下载站 - 第' + (th + 1) + '页<br/><br/>软件列表</p>' + '\n' +
        '<hr/>' + '\n' +
        '<p>' + list + '<p/>' + '\n' +
        '<hr/>' + '\n' +
        '<p><a href="/" target="_blank">首页</a> . <a href="/pages/' + up + '" target="_blank">上一页</a> . ' +
        '<a href="/pages/' + next + '" target="_blank">下一页</a> . <a target="_blank" href="/pages/' + end + '">末页</a>' +
        '<br/><a target="_blank" href="' + all + '">全部</a>' + getGotoPage(th + 1, end + 1) + '</p>' + '\n' +
        '<hr/>' + '\n' +
        getInput() + '\n' +
        '<hr id="inhr"/>' + getFoot() + '</div>' + getJs() + getCloudflareWebAnalytics() +
        '</body>' + '\n' +
        '</html>';
}

function getJs() {
    return '<script>' + '\n' +
        'if(navigator.userAgent.match(/QQ\\//i)||navigator.userAgent.match(/MicroMessenger\\//i)||navigator.userAgent.match(/Alipay/i)) {' + '\n' +
        'document.getElementById("title").innerHTML="WAP下载站";' + '\n' +
        'document.getElementById("div_b").style.display = "none";' + '\n' +
        'document.write(\'<h1>WAP下载站</h1><br/><br/>网站维护中<br/>你可以先点击右上角，选择浏览器打开查看该网站\');' + '\n' +
        'document.write(\'<br/><br/><a href="javascript:getlink();">在浏览器打开</a>\');' + '\n' +
        '}' + '\n' +
        'function getlink(){ window.location.href="https://gddhy.net/brw#"+btoa(encodeURIComponent(window.location.href));}' +
        '</script>';
}

function getGotoPage(th, all) {
    return '  第 ' + th + ' 页/共 ' + all + '页<br/>' +
        '<form id="inputtxt" action="https://mrp-search.gddhy.net/" method="get">' + '\n' +
        '<input type="number" name="page"/>' + '\n' +
        '<input type="submit" value="跳转页"/>' + '\n' +
        '</form>';
}

function getInput() {
    return '<div id="indiv">' + '\n' +
        '搜索站内收录的应用程序<br/>' + '\n' +
        '<form id="inputtxt3" action="https://mrp-search.gddhy.net/" method="get">' + '\n' +
        '<input type="text" name="name"/>' + '\n' +
        '<input type="submit" value="搜索"/>' + '\n' +
        '</form></div>' + '\n' +
        '<font id="toast_text"></font>';
}

function getAbout() {
    return '<!DOCTYPE html>' + '\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">' + '\n' +
        '<head>' + '\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=0.9">' + '\n' +
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' + '\n' +
        '<title id="title">免责声明 - WAP下载站</title>' + '\n' +
        '</head>' + '\n' +
        '<body><div id="div_b">' + '\n' +
        '<p>免责声明 - WAP下载站</p>' + '\n' +
        '<hr/>' + '\n' +
        '<p>本网站上的所有游戏软件均来自互联网公开内容分享收集，仅供个人学习和研究使用，不得用于任何商业用途。如有侵犯您的商标权、著作权或其他合法权利，请联系我们并提供相关证明材料，本站将在第一时间对此进行核实并删除。<br/><br/>MRP是杭州斯凯网络科技有限公司开发的中间件手机软件平台，功能机平台已不再维护，本人收集建设此网站供怀旧玩家下载游玩，网页支持功能机/智能机，智能机可以使用模拟器游玩本站软件<br/><br/>部分软件可能包含收费内容，请自行替换付费插件或开关飞行模式解决，若因此产生的付费问题，自行负责，与本站无关，本站仅分享程序<p/>' + '\n' +
        '<hr/>' + '\n' +
        '<p>如有问题，请联系<a target="_blank" href="mailto:gddhy@foxmail.com">Email:gddhy@foxmail.com</a><p/>' + '\n' +
        '<hr/>' + '\n' +
        getFoot() + '</div>' + getJs() + '\n' + getCloudflareWebAnalytics() +
        '</body>' + '\n' +
        '</html>';
}

function get404() {
    return '<!DOCTYPE html>' + '\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml">' + '\n' +
        '<head>' + '\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=0.9">' + '\n' +
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' + '\n' +
        '<title id="title">404 - WAP下载站</title>' + '\n' +
        '</head>' + '\n' +
        '<body><div id="div_b">' + '\n' +
        '<p>404 - WAP下载站</p>' + '\n' +
        '<hr/>' + '\n' +
        '<p>网页不存在<p/>' + '\n' +
        '<hr/>' + '\n' +
        getFoot() + '</div>' + getJs() + '\n' + getCloudflareWebAnalytics() +
        '</body>' + '\n' +
        '</html>';
}

function getFoot() {
    return '<p><a target="_blank" href="/">回首页</a> . <a target="_blank" href="/about">免责声明</a> . ' +
        '<a target="_blank" href="https://gddhy.net/2023/mrp-shang-dian/">Mrp商店(安卓版)</a> . ' +
        '<a target="_blank" href="https://vmrp.gddhy.net">网页版模拟器</a></p>';
}

/** 列表条目（迁移自 Html.getListItem；item 为已解析的应用信息对象） */
function getListItem(item, isEnter) {
    const base = path.basename(item.file, path.extname(item.file));
    const link = item.type === 'mrp' ? '/mrp/' + base : '/jar/' + base;
    let name = item.name;
    if (path.basename(item.file).startsWith('sky_')) {
        name = name + ' [顶]';
    } else if (path.basename(item.file).startsWith('new_')) {
        name = name + ' [新]';
    }
    return '<a target="_blank" href="' + link + '">' + name + '</a>' + (isEnter ? '<br/><br/>' : '');
}

function getCloudflareWebAnalytics() {
    return '<!-- Cloudflare Web Analytics --><script defer src=\'https://static.cloudflareinsights.com/beacon.min.js\' data-cf-beacon=\'{"token": "17d2cb4c617347b9a939346f542ca423"}\'></script><!-- End Cloudflare Web Analytics -->';
}

function getJumpHtml() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API接口服务 - 跳转提示</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: #333;
            line-height: 1.6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            width: 100%;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, #3498db, #2ecc71);
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 28px;
        }
        
        p {
            margin-bottom: 20px;
            font-size: 16px;
            color: #555;
        }
        
        .api-info {
            background: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 25px 0;
            text-align: left;
            border-radius: 0 8px 8px 0;
        }
        
        .countdown {
            font-size: 18px;
            font-weight: bold;
            color: #e74c3c;
            margin: 25px 0;
        }
        
        .redirect-link {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 25px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .redirect-link:hover {
            background: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #7f8c8d;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 25px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>API 接口服务</h1>
        <p>当前网站提供API接口服务，不提供直接访问的页面内容。</p>
        
        <div class="api-info">
            <p>此站点为后端API服务，主要用于数据交互和处理。</p>
            <p>如需访问网站内容，请前往我们的主站。</p>
        </div>
        
        <div class="countdown" id="countdown">
            3秒后自动跳转到主站...
        </div>
        
        <a href="https://gddhy.net" class="redirect-link" id="manualRedirect">
            立即前往主站
        </a>
        
        <div class="footer">
            <p>当前网站提供API接口服务</p>
        </div>
    </div>

    <script>
        // 设置跳转目标
        const redirectUrl = "https://gddhy.net";
        
        // 更新倒计时显示
        let countdownElement = document.getElementById('countdown');
        let countdown = 3;
        
        const countdownInterval = setInterval(function() {
            countdown--;
            countdownElement.textContent = \`\${countdown}秒后自动跳转到主站...\`;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.location.href = redirectUrl;
            }
        }, 1000);
        
        // 设置手动跳转链接
        document.getElementById('manualRedirect').href = redirectUrl;
    </script>
</body>
</html>`;
}

module.exports = {
    getItem: getItem,
    getJarItem: getJarItem,
    getList: getList,
    getAbout: getAbout,
    get404: get404,
    getListItem: getListItem,
    getJumpHtml: getJumpHtml
};
