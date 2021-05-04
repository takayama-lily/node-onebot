import oicq from "oicq"

export const APIS: Array<keyof oicq.Client> = [
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
]

export const ARGS: {[k: string]: string[]} = {}
for (let fn of APIS) {
    if (fn in oicq.Client.prototype) {
        ARGS[fn] = String(Reflect.get(oicq.Client.prototype, fn)).match(/\(.*\)/)?.[0].replace("(","").replace(")","").split(",") as string[]
        ARGS[fn].forEach((v, i, arr)=>{
            arr[i] = v.replace(/=.+/, "").trim()
        })
    }
}

export function toHump(action: string) {
    return action.replace(/_[\w]/g, (s)=>{
        return s[1].toUpperCase()
    })
}

export const BOOLS = ["no_cache", "auto_escape", "as_long", "enable", "reject_add_request", "is_dismiss", "approve", "block"]
export function toBool(v: any) {
    if (v === "0" || v === "false")
        v = false
    return Boolean(v)
}

export function genMetaEvent(uin: number, type: string) {
    return {
        self_id: uin,
        time: Math.floor(Date.now() / 1000),
        post_type: "meta_event",
        meta_event_type: "lifecycle",
        sub_type: type,
    }
}

export function transNotice(data: any) {
    if (data.sub_type === "poke") {
        data.notice_type = "notify"
        data.target_id = data.user_id
        data.user_id = data.operator_id
        data.operator_id = undefined
        return
    }
    if (data.notice_type === "friend") {
        if (data.sub_type === "increase")
            data.sub_type = undefined, data.notice_type = "friend_add"
        else if (data.sub_type === "recall")
            data.sub_type = undefined, data.notice_type = "friend_recall"
    } else if (data.notice_type === "group") {
        if (data.sub_type === "increase") {
            data.sub_type = undefined, data.notice_type = "group_increase"
        } else if (data.sub_type === "decrease") {
            data.notice_type = "group_decrease"
            if (data.operator_id === data.user_id)
                data.sub_type = "leave"
            else if (data.self_id === data.user_id)
                data.sub_type = "kick_me"
            else
                data.sub_type = "kick"
        } else if (data.sub_type === "recall") {
            data.sub_type = undefined, data.notice_type = "group_recall"
        } else if (data.sub_type === "ban") {
            data.notice_type = "group_ban"
            data.sub_type = data.duration ? "ban" : "lift_ban"
        } else if (data.sub_type === "admin") {
            data.notice_type = "group_admin"
            data.sub_type = data.set ? "set" : "unset"
        }
    }
}