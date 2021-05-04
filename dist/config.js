"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIfNotExists = exports.default_config = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.default_config = {
    use_cqhttp_notice: false,
    host: "0.0.0.0",
    port: 5700,
    use_http: false,
    use_ws: false,
    access_token: "",
    secret: "",
    post_timeout: 30,
    post_message_format: "array",
    enable_cors: false,
    event_filter: "",
    enable_heartbeat: false,
    heartbeat_interval: 15000,
    rate_limit_interval: 500,
    post_url: [],
    ws_reverse_url: [],
    ws_reverse_reconnect_interval: 3000,
};
function createIfNotExists(filepath) {
    const dirname = path_1.default.dirname(filepath);
    if (!fs_1.default.existsSync(dirname)) {
        fs_1.default.mkdirSync(dirname, { recursive: true });
    }
    if (!fs_1.default.existsSync(filepath)) {
        fs_1.default.writeFileSync(filepath, JSON.stringify({
            general: exports.default_config,
            123456789: {}
        }, null, 4));
    }
}
exports.createIfNotExists = createIfNotExists;
