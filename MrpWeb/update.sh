#!/bin/sh
echo "脚本开始执行"
echo "update.sh" >> .gitignore
echo "log.txt" >> .gitignore
echo "mrp.gddhy.net" > CNAME
str=$(date "+%Y-%m-%d %H:%M:%S")
info="update: ${str} (UTC+8)"
echo $info
git add .
git commit -m "${info}"
git push -u origin master -f