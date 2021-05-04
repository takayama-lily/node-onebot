"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const onebot_1 = __importDefault(require("./onebot"));
const bots = new Map();
function listener(data) {
    bots.get(this.uin)?.dipatch(data);
}
async function activate(bot) {
    const onebot = new onebot_1.default(bot);
    await onebot.start();
    bots.set(bot.uin, onebot);
    bot.on("message", listener);
    bot.on("notice", listener);
    bot.on("request", listener);
}
exports.activate = activate;
async function deactivate(bot) {
    bot.off("message", listener);
    bot.off("notice", listener);
    bot.off("request", listener);
    await bots.get(bot.uin)?.stop();
    bots.delete(bot.uin);
}
exports.deactivate = deactivate;
