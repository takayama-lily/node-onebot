"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transNotice = exports.genMetaEvent = exports.toBool = exports.BOOLS = exports.toHump = exports.ARGS = exports.APIS = void 0;
const oicq_1 = __importDefault(require("oicq"));
exports.APIS = [
    "sendPrivateMsg",
    "sendGroupMsg",
    "sendDiscussMsg",
    // "sendMsg", //非机器人api
    "deleteMsg",
    "getMsg",
    "getForwardMsg",
    "sendLike",
    "setGroupKick",
    "setGroupBan",
    "setGroupAnonymousBan",
    "setGroupWholeBan",
    "setGroupAdmin",
    "setGroupAnonymous",
    "setGroupCard",
    "setGroupName",
    "setGroupLeave",
    "sendGroupNotice",
    "setGroupSpecialTitle",
    "setFriendAddRequest",
    "setGroupAddRequest",
    "getLoginInfo",
    "getStrangerInfo",
    "getFriendList",
    "getStrangerList",
    "getGroupInfo",
    "getGroupList",
    "getGroupMemberInfo",
    "getGroupMemberList",
    // "getGroupHonorInfo",
    "getCookies",
    "getCsrfToken",
    // "getCredentials",
    // "getRecord",
    // "getImage",
    "canSendImage",
    "canSendRecord",
    "getStatus",
    "getVersionInfo",
    // "setRestart", //非机器人api
    "cleanCache",
    "setOnlineStatus",
    "sendGroupPoke",
    "addGroup",
    "addFriend",
    "deleteFriend",
    "inviteFriend",
    "sendLike",
    "setNickname",
    "setDescription",
    "setGender",
    "setBirthday",
    "setSignature",
    "setPortrait",
    "setGroupPortrait",
    "getSystemMsg",
    "getChatHistory",
    "sendTempMsg",
];
exports.ARGS = {};
for (let fn of exports.APIS) {
    if (fn in oicq_1.default.Client.prototype) {
        exports.ARGS[fn] = String(Reflect.get(oicq_1.default.Client.prototype, fn)).match(/\(.*\)/)?.[0].replace("(", "").replace(")", "").split(",");
        exports.ARGS[fn].forEach((v, i, arr) => {
            arr[i] = v.replace(/=.+/, "").trim();
        });
    }
}
function toHump(action) {
    return action.replace(/_[\w]/g, (s) => {
        return s[1].toUpperCase();
    });
}
exports.toHump = toHump;
exports.BOOLS = ["no_cache", "auto_escape", "as_long", "enable", "reject_add_request", "is_dismiss", "approve", "block"];
function toBool(v) {
    if (v === "0" || v === "false")
        v = false;
    return Boolean(v);
}
exports.toBool = toBool;
function genMetaEvent(uin, type) {
    return {
        self_id: uin,
        time: Math.floor(Date.now() / 1000),
        post_type: "meta_event",
        meta_event_type: "lifecycle",
        sub_type: type,
    };
}
exports.genMetaEvent = genMetaEvent;
function transNotice(data) {
    if (data.sub_type === "poke") {
        data.notice_type = "notify";
        data.target_id = data.user_id;
        data.user_id = data.operator_id;
        data.operator_id = undefined;
        return;
    }
    if (data.notice_type === "friend") {
        if (data.sub_type === "increase")
            data.sub_type = undefined, data.notice_type = "friend_add";
        else if (data.sub_type === "recall")
            data.sub_type = undefined, data.notice_type = "friend_recall";
    }
    else if (data.notice_type === "group") {
        if (data.sub_type === "increase") {
            data.sub_type = undefined, data.notice_type = "group_increase";
        }
        else if (data.sub_type === "decrease") {
            data.notice_type = "group_decrease";
            if (data.operator_id === data.user_id)
                data.sub_type = "leave";
            else if (data.self_id === data.user_id)
                data.sub_type = "kick_me";
            else
                data.sub_type = "kick";
        }
        else if (data.sub_type === "recall") {
            data.sub_type = undefined, data.notice_type = "group_recall";
        }
        else if (data.sub_type === "ban") {
            data.notice_type = "group_ban";
            data.sub_type = data.duration ? "ban" : "lift_ban";
        }
        else if (data.sub_type === "admin") {
            data.notice_type = "group_admin";
            data.sub_type = data.set ? "set" : "unset";
        }
    }
}
exports.transNotice = transNotice;
