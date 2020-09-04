"use strict";
const path = require("path");
module.exports = {

    //全局配置
    web_image_timeout: 30,  //下载网络图片的超时时间(秒)
    web_record_timeout: 30, //下载网络语音的超时时间(秒)
    debug: false,

    //单个账号的配置(可以添加多个)
    123456789: {
        host:     "0.0.0.0",
        port:     5700,
        use_http: true,
        use_ws:   false, //和http使用相同端口(暂不支持分端口)

        platform: 2, //1手机 2平板 3手表
        kickoff: false, //被挤下线是否在3秒后反挤对方
        ignore_self: true, //群聊是否无视自己的发言

        access_token: "", //访问api的token
        secret: "", //上报数据的sha1签名密钥
        post_timeout: 30, //post超时时间(秒)
        post_message_format: "string", //string或array
        enable_heartbeat: false, //是否启用ws心跳
        heartbeat_interval: 15000, //ws心跳间隔
        event_filter: "", //事件过滤器
        post_url: [
            // "http://your.address.com:8080", //可以添加多个url，不用了注释掉即可
        ],
        ws_reverse_url: [ 
            // "ws://your.address.com:8080", //可以添加多个url(暂不支持将api和event分两个通道)
        ],
        ws_reverse_reconnect_interval: 3000, //反向ws断线重连间隔(毫秒)
    },

};
