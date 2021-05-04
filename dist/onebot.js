"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
const querystring_1 = __importDefault(require("querystring"));
const ws_1 = __importDefault(require("ws"));
const rfdc_1 = __importDefault(require("rfdc"));
const filter_1 = require("./filter");
const static_1 = require("./static");
const config_1 = require("./config");
const clone = rfdc_1.default();
class NotFoundError extends Error {
}
class Onebot {
    constructor(bot) {
        this.bot = bot;
        this.config = config_1.default_config;
        this.wsr = new Set(); //反向ws连接
        this._queue = [];
        this.queue_running = false;
        this.timestamp = Date.now();
    }
    /**
     * 上报事件
     */
    _dipatch(unserialized) {
        const serialized = JSON.stringify(unserialized);
        for (const ws of this.wsr) {
            ws.send(serialized, (err) => {
                if (err)
                    this.bot.logger.error(`插件Onebot - 反向WS(${ws.url})上报事件失败: ` + err.message);
                else
                    this.bot.logger.debug(`插件Onebot - 反向WS(${ws.url})上报事件成功: ` + serialized);
            });
        }
        if (this.wss) {
            for (const ws of this.wss.clients) {
                ws.send(serialized, (err) => {
                    if (err)
                        this.bot.logger.error(`插件Onebot - 反向WS(${ws.url})上报事件失败: ` + err.message);
                    else
                        this.bot.logger.debug(`插件Onebot - 反向WS(${ws.url})上报事件成功: ` + serialized);
                });
            }
        }
        if (!(this.config.post_url?.length > 0))
            return;
        const options = {
            method: "POST",
            timeout: this.config.post_timeout * 1000,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(serialized),
                "X-Self-ID": String(this.bot.uin),
                "User-Agent": "OneBot",
            }
        };
        if (this.config.secret) {
            //@ts-ignore
            options.headers["X-Signature"] = "sha1=" + crypto.createHmac("sha1", String(this.config.secret)).update(serialized).digest("hex");
        }
        for (const url of this.config.post_url) {
            const protocol = url.startsWith("https") ? https_1.default : http_1.default;
            try {
                protocol.request(url, options, (res) => {
                    if (res.statusCode !== 200)
                        return this.bot.logger.warn(`插件Onebot - POST(${url})上报事件收到非200响应：` + res.statusCode);
                    let data = "";
                    res.setEncoding("utf-8");
                    res.on("data", (chunk) => data += chunk);
                    res.on("end", () => {
                        this.bot.logger.debug(`插件Onebot - 收到HTTP响应 ${res.statusCode} ：` + data);
                        try {
                            this._quickOperate(unserialized, JSON.parse(data));
                        }
                        catch (e) {
                            this.bot.logger.error(`插件Onebot - 快速操作遇到错误：` + e.message);
                        }
                    });
                }).on("error", (err) => {
                    this.bot.logger.error(`插件Onebot - POST(${url})上报事件失败：` + err.message);
                }).end(serialized, () => {
                    this.bot.logger.debug(`插件Onebot - POST(${url})上报事件成功: ` + serialized);
                });
            }
            catch (e) {
                this.bot.logger.error(`插件Onebot - POST(${url})上报失败：` + e.message);
            }
        }
    }
    /**
     * 上报业务事件
     */
    dipatch(data) {
        let unserialized = data;
        switch (data.post_type) {
            case "message":
                if (this.config.post_message_format === "string") {
                    unserialized = clone(unserialized);
                    unserialized.message = data.raw_message;
                }
                break;
            case "notice":
                if (this.config.use_cqhttp_notice) {
                    unserialized = clone(unserialized);
                    static_1.transNotice(unserialized);
                }
                break;
        }
        if (!filter_1.assert(this.filter, unserialized))
            return;
        this._dipatch(unserialized);
    }
    /**
     * 创建反向ws
     */
    _createWsr(url) {
        const timestmap = Date.now();
        const headers = {
            "X-Self-ID": String(this.bot.uin),
            "X-Client-Role": "Universal",
            "User-Agent": "OneBot",
        };
        if (this.config.access_token)
            headers.Authorization = "Bearer " + this.config.access_token;
        const ws = new ws_1.default(url, { headers });
        ws.on("error", (err) => {
            this.bot.logger.error(err.message);
        });
        ws.on("open", () => {
            this.bot.logger.info(`插件Onebot - 反向ws(${url})连接成功。`);
            this.wsr.add(ws);
            this._webSocketHandler(ws);
        });
        ws.on("close", (code) => {
            this.wsr.delete(ws);
            if (timestmap < this.timestamp)
                return;
            this.bot.logger.warn(`插件Onebot - 反向ws(${url})被关闭，关闭码${code}，将在${this.config.ws_reverse_reconnect_interval}毫秒后尝试重连。`);
            setTimeout(() => {
                if (timestmap < this.timestamp)
                    return;
                this._createWsr(url);
            }, this.config.ws_reverse_reconnect_interval);
        });
    }
    /**
     * 实例启动
     */
    async start() {
        this.config = await readConfig(this.bot.uin);
        for (const url of this.config.ws_reverse_url)
            this._createWsr(url);
        this._dipatch(static_1.genMetaEvent(this.bot.uin, "enable"));
        if (this.config.enable_heartbeat) {
            this.heartbeat = setInterval(() => {
                this._dipatch({
                    self_id: this.bot.uin,
                    time: Math.floor(Date.now() / 1000),
                    post_type: "meta_event",
                    meta_event_type: "heartbeat",
                    interval: this.config.heartbeat_interval,
                });
            }, this.config.heartbeat_interval);
        }
        if (this.config.event_filter) {
            try {
                this.filter = JSON.parse(await fs_1.default.promises.readFile(this.config.event_filter, "utf-8"));
                this.bot.logger.info("插件Onebot - 事件过滤器加载成功。");
            }
            catch (e) {
                this.bot.logger.error(e.message);
                this.bot.logger.error("插件Onebot - 事件过滤器加载失败，将不会进行任何过滤。");
            }
        }
        if (!this.config.use_http && !this.config.use_ws)
            return;
        this.server = http_1.default.createServer(this._httpRequestHandler.bind(this));
        if (this.config.use_ws) {
            this.wss = new ws_1.default.Server({ server: this.server });
            this.wss.on("error", (err) => {
                this.bot.logger.error(err.message);
            });
            this.wss.on("connection", (ws, req) => {
                ws.on("error", (err) => {
                    this.bot.logger.error(err.message);
                });
                ws.on("close", (code, reason) => {
                    this.bot.logger.warn(`插件Onebot - 正向ws连接关闭，关闭码${code}，关闭理由：` + reason);
                });
                if (this.config.access_token) {
                    const url = new url_1.URL(req.url, "http://127.0.0.1");
                    const token = url.searchParams.get('access_token');
                    if (token)
                        req.headers["authorization"] = token;
                    if (!req.headers["authorization"] || !req.headers["authorization"].includes(this.config.access_token))
                        return ws.close(1002, "wrong access token");
                }
                this._webSocketHandler(ws);
            });
        }
        return new Promise((resolve) => {
            try {
                this.server?.listen(this.config.port, this.config.host, () => {
                    this.bot.logger.info(`插件Onebot - 开启http服务器成功，监听${this.config.host}:${this.config.port}`);
                    resolve(undefined);
                }).on("error", (e) => {
                    this.bot.logger.error(e.message);
                    const msg = `插件Onebot - 开启http服务器失败，在${this.config.host}:${this.config.port}`;
                    this.bot.logger.error(msg);
                    resolve(undefined);
                });
            }
            catch (e) {
                this.bot.logger.error(e.message);
                resolve(undefined);
            }
        });
    }
    /**
     * 实例停止
     */
    async stop() {
        this.timestamp = Date.now();
        this._dipatch(static_1.genMetaEvent(this.bot.uin, "disable"));
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
            this.heartbeat = undefined;
        }
        for (const ws of this.wsr)
            ws.close();
        if (this.server) {
            if (this.wss) {
                for (const ws of this.wss.clients)
                    ws.close();
            }
            return new Promise((resolve) => {
                this.server?.close(resolve);
            });
        }
    }
    /**
     * 处理http请求
     */
    async _httpRequestHandler(req, res) {
        if (!this.config.use_http)
            return res.writeHead(404).end();
        if (req.method === 'OPTIONS' && this.config.enable_cors) {
            return res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, authorization'
            }).end();
        }
        const url = new url_1.URL(req.url, "http://127.0.0.1");
        if (this.config.access_token) {
            if (req.headers["authorization"]) {
                if (!req.headers["authorization"].includes(this.config.access_token))
                    return res.writeHead(403).end();
            }
            else {
                const access_token = url.searchParams.get("access_token");
                if (!access_token)
                    return res.writeHead(401).end();
                else if (!access_token.includes(this.config.access_token))
                    return res.writeHead(403).end();
            }
        }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        if (this.config.enable_cors)
            res.setHeader("Access-Control-Allow-Origin", "*");
        const action = url.pathname.slice(1);
        if (req.method === "GET") {
            this.bot.logger.debug(`插件Onebot - 收到GET请求: ` + req.url);
            const params = querystring_1.default.parse(url.search);
            try {
                const ret = await this.apply({ action, params });
                res.end(ret);
            }
            catch (e) {
                res.writeHead(404).end();
            }
        }
        else if (req.method === "POST") {
            let data = "";
            req.setEncoding("utf-8");
            req.on("data", (chunk) => data += chunk);
            req.on("end", async () => {
                try {
                    this.bot.logger.debug(`插件Onebot - 收到POST请求: ` + data);
                    let params, ct = req.headers["content-type"];
                    if (!ct || ct.includes("json"))
                        params = data ? JSON.parse(data) : {};
                    else if (ct && ct.includes("x-www-form-urlencoded"))
                        params = querystring_1.default.parse(data);
                    else
                        return res.writeHead(406).end();
                    const ret = await this.apply({ action, params });
                    res.end(ret);
                }
                catch (e) {
                    if (e instanceof NotFoundError)
                        res.writeHead(404).end();
                    else
                        res.writeHead(400).end();
                }
            });
        }
        else {
            res.writeHead(405).end();
        }
    }
    /**
     * 处理ws消息
     */
    _webSocketHandler(ws) {
        ws.on("message", async (msg) => {
            this.bot.logger.debug("插件Onebot - 收到ws消息：" + msg);
            var data;
            try {
                data = JSON.parse(String(msg));
                let ret;
                if (data.action.startsWith(".handle_quick_operation")) {
                    const event = data.params.context, res = data.params.operation;
                    this._quickOperate(event, res);
                    ret = JSON.stringify({
                        retcode: 1,
                        status: "async",
                        data: null,
                        error: null,
                        echo: data.echo
                    });
                }
                else {
                    ret = await this.apply(data);
                }
                ws.send(ret);
            }
            catch (e) {
                let code, message;
                if (e instanceof NotFoundError) {
                    code = 1404;
                    message = "不支持的api";
                }
                else {
                    code = 1400;
                    message = "请求格式错误";
                }
                ws.send(JSON.stringify({
                    retcode: code,
                    status: "failed",
                    data: null,
                    error: {
                        code, message
                    },
                    echo: data?.echo
                }));
            }
        });
        ws.send(JSON.stringify(static_1.genMetaEvent(this.bot.uin, "connect")));
        ws.send(JSON.stringify(static_1.genMetaEvent(this.bot.uin, "enable")));
    }
    /**
     * 调用api
     */
    async apply(req) {
        let { action, params, echo } = req;
        let is_async = action.includes("_async");
        if (is_async)
            action = action.replace("_async", "");
        let is_queue = action.includes("_rate_limited");
        if (is_queue)
            action = action.replace("_rate_limited", "");
        if (action === "send_msg") {
            if (["private", "group", "discuss"].includes(params.message_type))
                action = "send_" + params.message_type + "_msg";
            else if (params.user_id)
                action = "send_private_msg";
            else if (params.group_id)
                action = "send_group_msg";
            else if (params.discuss_id)
                action = "send_discuss_msg";
        }
        if (action === "set_restart") {
            this.stop().then(this.start.bind(this));
            const ret = {
                retcode: 1,
                status: "async",
                data: null,
                error: null
            };
            if (echo) {
                //@ts-ignore
                ret.echo = echo;
            }
            return JSON.stringify(ret);
        }
        const method = static_1.toHump(action);
        if (static_1.APIS.includes(method)) {
            const args = [];
            for (let k of static_1.ARGS[method]) {
                if (Reflect.has(params, k)) {
                    if (static_1.BOOLS.includes(k))
                        params[k] = static_1.toBool(params[k]);
                    args.push(params[k]);
                }
            }
            let ret;
            if (is_queue) {
                this._queue.push({ method, args });
                this._runQueue();
                ret = {
                    retcode: 1,
                    status: "async",
                    data: null,
                    error: null
                };
            }
            else {
                ret = this.bot[method].apply(this.bot, args);
                if (ret instanceof Promise) {
                    if (is_async)
                        ret = {
                            retcode: 1,
                            status: "async",
                            data: null,
                            error: null
                        };
                    else
                        ret = await ret;
                }
            }
            if (ret.data instanceof Map)
                ret.data = [...ret.data.values()];
            if (echo) {
                //@ts-ignore
                ret.echo = echo;
            }
            return JSON.stringify(ret);
        }
        else {
            throw new NotFoundError();
        }
    }
    /**
     * 快速操作
     */
    _quickOperate(event, res) {
        if (event.post_type === "message") {
            if (res.reply) {
                if (event.message_type === "discuss")
                    return;
                const action = event.message_type === "private" ? "sendPrivateMsg" : "sendGroupMsg";
                const id = event.message_type === "private" ? event.user_id : event.group_id;
                this.bot[action](id, res.reply, res.auto_escape);
            }
            if (event.message_type === "group") {
                if (res.delete)
                    this.bot.deleteMsg(event.message_id);
                if (res.kick && !event.anonymous)
                    this.bot.setGroupKick(event.group_id, event.user_id, res.reject_add_request);
                if (res.ban)
                    this.bot.setGroupBan(event.group_id, event.user_id, res.ban_duration > 0 ? res.ban_duration : 1800);
            }
        }
        if (event.post_type === "request" && "approve" in res) {
            const action = event.request_type === "friend" ? "setFriendAddRequest" : "setGroupAddRequest";
            this.bot[action](event.flag, res.approve, res.reason ? res.reason : "", res.block ? true : false);
        }
    }
    /**
     * 限速队列调用
     */
    async _runQueue() {
        if (this.queue_running)
            return;
        while (this._queue.length > 0) {
            this.queue_running = true;
            const task = this._queue.shift();
            const { method, args } = task;
            this.bot[method].apply(this.bot, args);
            await new Promise((resolve) => {
                setTimeout(resolve, this.config.rate_limit_interval);
            });
            this.queue_running = false;
        }
    }
}
exports.default = Onebot;
async function readConfig(uin) {
    const global_config = JSON.parse(await fs_1.default.promises.readFile(filepath, { encoding: "utf-8" }));
    return Object.assign({}, config_1.default_config, global_config.general, global_config[uin]);
}
const filepath = path_1.default.join(require.main?.path, "../data/plugins/onebot/config.json");
config_1.createIfNotExists(filepath);
