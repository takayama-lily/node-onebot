"use strict";
let bot;
class NotFoundError extends Error {}

const available_actions = [
    "sendPrivateMsg",
    "sendGroupMsg",
    "sendMsg", //todo
    "deleteMsg",
    "getMsg", //todo
    "getForwardMsg", //todo
    "sendLike", //todo
    "setGroupKick",
    "setGroupBan",
    "setGroupAnonymousBan", //todo
    "setGroupWholeBan",
    "setGroupAdmin", //todo
    "setGroupAnonymous", //todo
    "setGroupCard",
    "setGroupName",
    "setGroupLeave",
    "setGroupSpecialTitle", //todo
    "setFriendAddRequest",
    "setGroupAddRequest",
    "getLoginInfo",
    "getStrangerInfo", //△
    "getFriendList",
    "getGroupInfo",
    "getGroupList",
    "getGroupMemberInfo",
    "getGroupMemberList",
    "getGroupHonorInfo", //todo
    "getCookies", //todo
    "getCsrfToken", //todo
    "getCredentials", //todo
    "getRecord", //todo
    "getImage", //todo
    "canSendImage",
    "canSendRecord",
    "getStatus",
    "getVersionInfo",
    "setRestart", //todo
    "cleanCache", //todo
];

const fn_sign = {};
function setBot(client) {
    bot = client;
    for (let fn of available_actions) {
        if (bot[fn]) {
            fn_sign[fn] = bot[fn].toString().match(/\(.*\)/)[0].replace("(","").replace(")","").split(",");
            fn_sign[fn].forEach((v, i, arr)=>{
                arr[i] = v.replace(/=.+/, "").trim();
            });
        }
    }
}

function toHump(action) {
    return action.replace(/_[\w]/g, (s)=>{
        return s[1].toUpperCase();
    })
}

function quickOperate(event, res) {
    if (event.post_type === "message" && res.reply) {
        const action = event.message_type === "private" ? "sendPrivateMsg" : "sendGroupMsg";
        const id = event.message_type === "private" ? event.user_id : event.group_id;
        bot[action](id, res.reply, res.auto_escape);
        if (event.group_id) {
            if (res.delete)
                bot.deleteMsg(event.message_id);
            if (res.kick && !event.anonymous)
                bot.setGroupKick(event.group_id, event.user_id, res.reject_add_request);
            if (res.ban)
                bot.setGroupBan(event.group_id, event.user_id, res.ban_duration?res.ban_duration:1800);
        }
    }
    if (event.post_type === "request" && res.hasOwnProperty("approve")) {
        const action = event.request_type === "friend" ? "setFriendAddRequest" : "setGroupAddRequest";
        bot[action](event.flag, res.approve, res.reason?res.reason:"", res.block?true:false);
    }
}

function handleQuickOperation(data) {
    const event = data.params.context, res = data.params.operation;
    quickOperate(event, res);
}

async function apply(req) {
    let {action, params, echo} = req;
    let is_async = action.includes("_async");
    if (is_async)
        action = action.replace("_async", "");
    action = toHump(action);
    if (bot[action] && available_actions.includes(action)) {

        const param_arr = [];
        for (let v of fn_sign[action]) {
            if (params[v])
                param_arr.push(params[v]);
        }
        let ret = bot[action].apply(bot, param_arr);
        if (ret instanceof Promise) {
            if (is_async)
                ret = {
                    retcode: 1,
                    status: "async",
                    data: null
                }
            else
                ret = await ret;
        }

        switch (action) {
            case "getFriendList":
            case "getGroupList":
            case "getGroupMemberList":
                if (ret.retcode === 0)
                    ret.data = [...ret.data.values()];
        }
        if (echo)
            ret.echo = echo;
        return JSON.stringify(ret);
    } else {
        throw new NotFoundError();
    }
}

module.exports = {
    setBot, quickOperate, handleQuickOperation, apply, NotFoundError
}
