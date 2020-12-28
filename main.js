"use strict";
const ver = process.version.substr(1).split(".");
if (ver[0] < 12 || (ver[0] == 12 && ver[1] < 16)) {
    console.log("你的nodejs版本过低，需要更新至v12.16以上");
    process.exit();
}
const path = require("path");
const fs = require("fs");

try {
    require("./config.js");
} catch (e) {
    console.log(e);
    console.log(`
未找到config.js文件或配置有语法错误
`);
    process.exit(0);
}

try {
    console.log(`正在检查&更新内核版本..`);
    require("child_process").execSync("npm up --no-save", {stdio: "ignore"});
} catch (e) {
    console.log(`"npm up --no-save"执行失败，你可能需要手动执行。`);
}

require("oicq");
const data_dir = path.join(process.mainModule.path, "data");
try {
    if (!fs.existsSync(data_dir))
        fs.mkdirSync(data_dir, {mode: 0o755});
    const testfile = path.join(data_dir, "test");
    fs.writeFileSync(testfile, "");
    fs.unlinkSync(testfile);
} catch(e) {
    console.log(e);
    console.log("数据文件夹不可写，进程退出。");
    process.exit(0);
}

let account = parseInt(process.argv[2]);
inputAccount();

function inputAccount() {
    if (account > 10000 && account < 0xffffffff) {
        process.title = "OICQ/OneBot - " + account;
        return require("./lib/core")(account);
    }
    console.log("请输入账号：");
    process.stdin.once("data", (input)=>{
        account = parseInt(input.toString().trim());
        inputAccount();
    });
}
