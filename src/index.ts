import oicq from "oicq"
import Onebot from "./onebot"

const bots = new Map<number, Onebot>()

function listener(this: oicq.Client, data: oicq.EventData) {
    bots.get(this.uin)?.dipatch(data)
}

export async function activate(bot: oicq.Client) {
    const onebot = new Onebot(bot)
    await onebot.start()
    bots.set(bot.uin, onebot)
    bot.on("message", listener)
    bot.on("notice", listener)
    bot.on("request", listener)
}

export async function deactivate(bot: oicq.Client) {
    bot.off("message", listener)
    bot.off("notice", listener)
    bot.off("request", listener)
    await bots.get(bot.uin)?.stop()
    bots.delete(bot.uin)
}
