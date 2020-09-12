"use strict";
const path = require("path");
const fs = require("fs");
require("oicq");
const logger = process.OICQ.logger;
const root_dir = path.join(__dirname, "data");
try {
    const testfile = path.join(root_dir, "test");
    fs.writeFileSync(testfile, "");
    fs.unlinkSync(testfile);
} catch(e) {
    logger.error("数据文件夹不可写，进程退出。")
    process.exit(0);
}

let account = parseInt(process.argv[2]);
inputAccount();

function inputAccount() {
    if (account > 10000 && account < 0xffffffff) {
        return require("./lib/core")(account);
    }
    logger.info("请输入账号：");
    process.stdin.once("data", (input)=>{
        account = parseInt(input.toString().trim());
        inputAccount();
    });
}
