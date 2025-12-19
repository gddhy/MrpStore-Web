#!/bin/bash
echo "cf bulid start"
rm -f MrpWeb/mrp-files/new_动态壁纸.mrp
java -jar MrpStoreWeb.jar
rm -f MrpWeb/update.sh