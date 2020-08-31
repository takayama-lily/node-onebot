"use strict";
const path = require("path");
const fs = require("fs");
const oicq = require("oicq");
const global_config = require("./config");
if (!global_config.cache_root)
    global_config.cache_root = path.join(__dirname, "data");
try {
    const testfile = path.join(global_config.cache_root, "test");
    fs.writeFileSync(testfile, "");
    fs.unlinkSync(testfile);
} catch(e) {
    console.log("数据文件夹不可写，进程退出。")
    process.exit(0);
}
oicq.setGlobalConfig(global_config);

let account = parseInt(process.argv[2]);
inputAccount();

function inputAccount() {
    if (account > 10000 && account < 0xffffffff) {
        return require("./lib/core")(account);
    }
    console.log("请输入账号：");
    process.stdin.once("data", (input)=>{
        account = parseInt(input.toString().trim());
        inputAccount();
    });
}
