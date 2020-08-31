"use strict";
const path = require("path");
const fs = require("fs");
const querystring = require("querystring");
const url = require("url");
const crypto = require("crypto");
const oicq = require("oicq");
const http = require("http");
const https = require("https");
const WebSocket = require("ws");
const api = require("./api");
const global_config = require("../config");
const default_config = {
    host:     "0.0.0.0",
    port:     5700,
    use_http: true,
    use_ws:   false,

    platform: 2,
    kickoff: false,
    ignore_self: true,

    access_token: "",
    secret: "",
    post_timeout: 30,
    post_message_format: "string",
    post_url: [],
    ws_reverse_url: [],
    ws_reverse_reconnect_interval: 3000,
}
const config = {};
let bot, account, dir, server, wss, online = false, websockets = new Set();

function startup(arg) {
    account = arg;
    if (!global_config[account]) {
        console.log("未找到该账号的配置，请确认配置文件。");
        process.exit();
    }
    dir = path.join(global_config.cache_root, account.toString());
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, {recursive: true, mode: 0o755});
    Object.assign(config, default_config, global_config[account]);
    if (global_config.debug)
        config.log_level = "debug";
    config.device_path = dir;
    createBot();
    createServer();
    createReverseWS();
}

function inputPassword() {
    console.log("请输入密码：");
    process.stdin.once("data", (input)=>{
        input = input.toString().trim();
        const password = crypto.createHash("md5").update(input).digest();
        fs.writeFileSync(path.join(dir, "password"), password);
        bot.login(password);
    })
}

function createBot() {
    bot = oicq.createClient(account, config);
    api.setBot(bot);
    bot.on("system.login.captcha", (data)=>{
        const filepath = path.join(dir, `captcha.jpg`);
        fs.writeFileSync(filepath, data.image);
        bot.logger.info(`验证码已更新并保存到文件(${filepath})，请查看并输入: `);
        process.stdin.once("data", (input)=>{
            bot.captchaLogin(input);
        });
    });
    bot.on("system.login.device", (data)=>{
        process.stdin.once("data", bot.login.bind(bot));
    });
    bot.on("system.login.error", (data)=>{
        if (data.message.includes("密码错误"))
            inputPassword();
        else
            bot.terminate();
    });

    bot.on("system.online", ()=>{
        online = true;
        dipatch({
            self: account,
            time: parseInt(Date.now()/1000),
            post_type: "meta_event",
            meta_event_type: "lifecycle",
            sub_type: "enable",
        });
    });
    bot.on("system.offline", (data)=>{
        online = false;
        dipatch({
            self: account,
            time: parseInt(Date.now()/1000),
            post_type: "meta_event",
            meta_event_type: "lifecycle",
            sub_type: "disable",
        });
        if (data.sub_type === "network") {
            bot.logger.warn("网络断开，10秒后尝试重新连接。");
            setTimeout(createBot, 10000);
        }
    });

    bot.on("request", dipatch);
    bot.on("notice", dipatch);
    bot.on("message", (data)=>{
        if (config.post_message_format === "string")
            data.message = data.raw_message;
        dipatch(data);
    });

    const filepath = path.join(dir, "password");
    if (fs.existsSync(filepath)) {
        bot.login(fs.readFileSync(filepath));
    } else {
        inputPassword();
    }
}

function dipatch(event) {
    const json = JSON.stringify(event);
    const options = {
        method: 'POST',
        timeout: config.post_timeout,
        headers: {
            'Content-Type': 'application/json',
            "X-Self-ID": account.toString()
        }
    }
    if (config.secret) {
        options.headers["X-Signature"] = crypto.createHmac("sha1", config.secret.toString()).update(json).digest("hex");
    }
    for (let url of config.post_url) {
        const protocol = url.startsWith("https") ? https: http;
        try {
            const req = protocol.request(url, options, (res)=>{
                bot.logger.debug(`post上报事件到${url}: ` + json);
                onHttpRes(event, res);
            }).on("error", ()=>{});
            req.end(json);
        } catch (e) {}
    }
    if (wss) {
        wss.clients.forEach((ws)=>{
            bot.logger.debug(`正向ws上报事件: ` + json);
            ws.send(json);
        });
    }
    websockets.forEach((ws)=>{
        bot.logger.debug(`反向ws上报事件: ` + json);
        ws.send(json);
    });
}

function createServer() {
    if (!config.use_http && !config.use_ws)
        return;
    server = http.createServer(async(req, res)=>{
        if (config.access_token) {
            if (!req.headers["authorization"])
                return res.writeHead(401).end();
            if (!req.headers["authorization"].includes(config.access_token))
                return res.writeHead(403).end();
        }
        if (req.method === "GET") {
            bot.logger.debug(`收到GET请求: ` + req.url);
            const qop = url.parse(req.url);
            let query = querystring.parse(qop.query);
            try {
                const ret = await api.apply({
                    action: qop.pathname.replace("/", ""),
                    params: query
                });
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(ret);
            } catch (e) {
                res.writeHead(404).end();
            }
        } else if (req.method === "POST") {
            onHttpReq(req, res);
        }
    });
    if (config.use_ws) {
        wss = new WebSocket.Server({server});
        wss.on("connection", (ws)=>{
            ws.on("message", (data)=>{
                onWSMessage(ws, data);
            });
        });
    }
    try {
        server.listen(config.port, config.host, ()=>{
            bot.logger.info(`开启http服务器成功，监听${server.address().address}:${server.address().port}`);
        });
    } catch (e) {
        bot.logger.error(e);
        process.exit(0);
    }
}
function createReverseWS() {
    const headers = {
        "X-Self-ID": account.toString(),
        "X-Client-Role": "Universal",
    };
    if (config.access_token)
        headers.Authorization = "Bearer " + config.access_token;
    for (let url of config.ws_reverse_url) {
        createWSClient(url, headers);
    }
}
function createWSClient(url, headers) {
    try {
        const ws = new WebSocket(url, {headers});
        websockets.add(ws);
        ws.on("open", ()=>{
            bot.logger.info(`反向ws连接(${url})连接成功。`)
        });
        ws.on("message", (data)=>{
            onWSMessage(ws, data);
        });
        ws.on("error", ()=>{});
        ws.on("close", ()=>{
            bot.logger.error(`反向ws连接(${url})被关闭，将在${config.ws_reverse_reconnect_interval}毫秒后尝试连接。`)
            websockets.delete(ws);
            setTimeout(()=>{
                createWSClient(url, headers);
            }, config.ws_reverse_reconnect_interval)
        })
    } catch (e) {}
}

async function onHttpRes(event, res) {
    let data = [];
    res.on("data", (chunk)=>data.push(chunk));
    res.on("end", async()=>{
        if (!online) return;
        data = Buffer.concat(data).toString();
        try {
            data = JSON.parse(data);
            api.quickOperate(event, data);
        } catch (e) {}
    })
}
function onHttpReq(req, res) {
    let data = [];
    req.on("data", (chunk)=>data.push(chunk));
    req.on("end", async()=>{
        try {
            if (!online) {
                var ret = JSON.stringify({
                    retcode: 104, status: "failed"
                });
            } else {
                data = Buffer.concat(data).toString();
                bot.logger.debug(`收到POST请求: ` + data);
                data = JSON.parse(data);
                var ret = await api.apply(data);
            }
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(ret);
        } catch (e) {
            if (e instanceof api.NotFoundError)
                res.writeHead(404).end();
            else
                res.writeHead(400).end();
        }
    })
}
async function onWSMessage(ws, data) {
    bot.logger.debug(`收到ws消息: ` + data);
    if (!online) {
        return ws.send(JSON.stringify({
            retcode: 104, status: "failed"
        }));
    }
    try {
        data = JSON.parse(data);
        if (data.action === ".handle_quick_operation") {
            api.handleQuickOperation(data);
            var ret = JSON.stringify({
                retcode: 1,
                status: "async",
                data: null
            });
        } else {
            var ret = await api.apply(data);
        }
        ws.send(ret);
    } catch (e) {
        if (e instanceof api.NotFoundError)
            var retcode = 1404;
        else
            var retcode = 1400;
        ws.send(JSON.stringify({
            retcode: retcode,
            status: "failed",
            data: null,
            echo: data.echo
        }));
    }
}

module.exports = startup;
