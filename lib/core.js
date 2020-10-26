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
const transNotice = require("./cq-notice");
const global_config = require("../config");
const default_config = {
    platform: 2,
    kickoff: false,
    ignore_self: true,
    web_image_timeout: 30,
    web_record_timeout: 30,
    debug: false,
    host: "0.0.0.0",
    port: 5700,
    use_http: false,
    use_ws: false,
    access_token: "",
    secret: "",
    post_timeout: 30,
    post_message_format: "string",
    enable_heartbeat: false,
    heartbeat_interval: 15000,
    rate_limit_interval: 500,
    post_url: [],
    ws_reverse_url: [],
    ws_reverse_reconnect_interval: 3000,
}
const config = {};
let bot, account, dir, server, wss, online = false, websockets = new Set(), wsrCreated = false;

function startup(arg) {
    account = arg;
    dir = path.join(process.mainModule.path, "data", String(account));
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, {recursive: true, mode: 0o755});
    Object.assign(config, default_config, global_config.general, global_config[account]);
    console.log("已加载配置文件：", config);
    if (config.debug && !config.log_level)
        config.log_level = "debug";
    config.device_path = dir;
    oicq.setGlobalConfig(config);
    if (config.enable_heartbeat && (config.use_ws || config.ws_reverse_url.length)) {
        setInterval(()=>{
            const json = JSON.stringify({
                self_id: account,
                time: parseInt(Date.now()/1000),
                post_type: "meta_event",
                meta_event_type: "heartbeat",
                interval: config.heartbeat_interval,
            })
            websockets.forEach((ws)=>{
                ws.send(json);
            });
            if (wss) {
                wss.clients.forEach((ws)=>{
                    ws.send(json);
                });
            }
        }, config.heartbeat_interval);
    }
    createServer();
    setTimeout(createBot, 1000);
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
    api.setBot(bot, config.rate_limit_interval);
    bot.on("system.login.captcha", ()=>{
        process.stdin.once("data", (input)=>{
            bot.captchaLogin(input);
        });
    });
    bot.on("system.login.device", (data)=>{
        process.stdin.once("data", ()=>{
            bot.login();
        });
    });
    bot.on("system.login.error", (data)=>{
        if (data.message.includes("密码错误"))
            inputPassword();
        else if (data.message.includes("当前版本过低")) {
            bot.logger.error("请检查密码是否正确，或账号是否被冻结。");
            inputPassword();
        }
        else
            bot.terminate();
    });

    bot.on("system.online", ()=>{
        online = true;
        dipatch({
            self_id: account,
            time: parseInt(Date.now()/1000),
            post_type: "meta_event",
            meta_event_type: "lifecycle",
            sub_type: "enable",
        });
        if (!wsrCreated)
            createReverseWS();
    });
    bot.on("system.offline", (data)=>{
        online = false;
        dipatch({
            self_id: account,
            time: parseInt(Date.now()/1000),
            post_type: "meta_event",
            meta_event_type: "lifecycle",
            sub_type: "disable",
        });
        if (data.sub_type === "network" || data.sub_type === "unknown") {
            bot.logger.warn("网络断开，5秒后尝试重新连接。");
            setTimeout(createBot, 5000);
        }
    });

    bot.on("request", dipatch);
    bot.on("notice", (data)=>{
        if (config.use_cqhttp_notice)
            transNotice(data);
        dipatch(data);
    });
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
            "X-Self-ID": String(account),
            "User-Agent": "OneBot"
        }
    }
    if (config.secret) {
        options.headers["X-Signature"] = "sha1=" + crypto.createHmac("sha1", config.secret.toString()).update(json).digest("hex");
    }
    for (let url of config.post_url) {
        const protocol = url.startsWith("https") ? https: http;
        try {
            const req = protocol.request(url, options, (res)=>{
                bot.logger.debug(`POST(${url})上报事件: ` + json);
                onHttpRes(event, res);
            }).on("error", (e)=>{
                bot.logger.error(`POST(${url})上报失败：` + e.message);
            });
            req.end(json);
        } catch (e) {
            bot.logger.error(`POST(${url})上报失败：` + e.message);
        }
    }
    if (wss) {
        wss.clients.forEach((ws)=>{
            bot.logger.debug(`正向WS上报事件: ` + json);
            ws.send(json);
        });
    }
    websockets.forEach((ws)=>{
        bot.logger.debug(`反向WS(${ws.url})上报事件: ` + json);
        ws.send(json);
    });
}

function createServer() {
    if (!config.use_http && !config.use_ws)
        return;
    server = http.createServer((req, res)=>{
        if (!config.use_http)
            return res.writeHead(404).end();
        if (config.access_token) {
            if (!req.headers["authorization"]) {
                const access_token = querystring.parse(url.parse(req.url).query).access_token;
                if (access_token)
                    req.headers["authorization"] = access_token;
                else
                    return res.writeHead(401).end();
            }
            if (!req.headers["authorization"].includes(config.access_token))
                return res.writeHead(403).end();
        }
        onHttpReq(req, res);
    });
    if (config.use_ws) {
        wss = new WebSocket.Server({server});
        wss.on("connection", (ws, req)=>{
            ws.on("error", ()=>{});
            if (config.access_token) {
                if (!req.headers["authorization"])
                    return ws.close(1401);
                if (!req.headers["authorization"].includes(config.access_token))
                    return ws.close(1403);
            }
            onWSOpen(ws);
        });
    }
    server.listen(config.port, config.host, ()=>{
        console.log(`开启http服务器成功，监听${server.address().address}:${server.address().port}`);
    }).on("error", (e)=>{
        console.log(e.message);
        console.log("开启http服务器失败，进程退出。");
        process.exit(0);
    })
}

function onWSOpen(ws) {
    ws.on("message", (data)=>{
        onWSMessage(ws, data);
    });
    ws.send(JSON.stringify({
        self_id: account,
        time: parseInt(Date.now()/1000),
        post_type: "meta_event",
        meta_event_type: "lifecycle",
        sub_type: "connect",
    }));
    if (online) {
        ws.send(JSON.stringify({
            self_id: account,
            time: parseInt(Date.now()/1000),
            post_type: "meta_event",
            meta_event_type: "lifecycle",
            sub_type: "enable",
        }));
    }
}

function createReverseWS() {
    wsrCreated = true;
    const headers = {
        "X-Self-ID": String(account),
        "X-Client-Role": "Universal",
        "User-Agent": "OneBot"
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
        ws.on("error", ()=>{});
        ws.on("open", ()=>{
            bot.logger.info(`反向ws连接(${url})连接成功。`);
            websockets.add(ws);
            onWSOpen(ws);
        });
        ws.on("close", ()=>{
            bot.logger.error(`反向ws连接(${url})被关闭，将在${config.ws_reverse_reconnect_interval}毫秒后尝试连接。`);
            websockets.delete(ws);
            setTimeout(()=>{
                createWSClient(url, headers);
            }, config.ws_reverse_reconnect_interval);
        });
    } catch (e) {
        bot.logger.error(e.message);
    }
}

function onHttpRes(event, res) {
    let data = [];
    res.on("data", (chunk)=>data.push(chunk));
    res.on("end", ()=>{
        if (!online) return;
        data = Buffer.concat(data).toString();
        debug(`收到HTTP响应：${res.statusCode} ` + data);
        try {
            data = JSON.parse(data);
            api.quickOperate(event, data);
        } catch (e) {}
    })
}
async function onHttpReq(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (!online) {
        return res.end(JSON.stringify({
            retcode: 104, status: "failed"
        }));
    }
    const qop = url.parse(req.url);
    const action = qop.pathname.replace("/", "");
    if (req.method === "GET") {
        debug(`收到GET请求: ` + req.url);
        const params = querystring.parse(qop.query);
        try {
            const ret = await api.apply({action, params});
            res.end(ret);
        } catch (e) {
            res.writeHead(404).end();
        }
    } else if (req.method === "POST") {
        let data = [];
        req.on("data", (chunk)=>data.push(chunk));
        req.on("end", async()=>{
            try {
                data = Buffer.concat(data).toString();
                debug(`收到POST请求: ` + data);
                let params;
                if (req.headers["content-type"] === "application/x-www-form-urlencoded")
                    params = querystring.parse(data);
                else
                    params = JSON.parse(data);
                const ret = await api.apply({action, params});
                res.end(ret);
            } catch (e) {
                if (e instanceof api.NotFoundError)
                    res.writeHead(404).end();
                else
                    res.writeHead(400).end();
            }
        });
    } else {
        res.writeHead(405).end();
    }
}
async function onWSMessage(ws, data) {
    debug(`收到WS消息: ` + data);
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

function debug(msg) {
    if (bot && bot.logger)
        bot.logger.debug(msg);
    else
        console.log(msg);
}

module.exports = startup;
