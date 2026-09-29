#!/bin/bash
echo "cf bulid start"
rm -f MrpWeb/mrp-files/new_动态壁纸.mrp
rm -f MrpWeb/mrp-files/动态壁纸_美鸠.mrp
# java -jar MrpStoreWeb.jar  v3环境java已弃用
rm -f MrpWeb/update.sh
node ./node/src/main.js              # 普通站点构建
# node ./node/src/main.js ResSite=true # 资源站模式
# node ./node/src/mrp-res-api.js       # MrpRes 资源索引