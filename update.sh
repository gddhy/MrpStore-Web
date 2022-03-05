#!/bin/sh
echo "脚本开始执行"
str=$(date "+%Y-%m-%d %H:%M:%S")
info="update: ${str} (UTC+8)"
echo $info
git add .
git commit -m "${info}"
git pull origin master
git push origin master