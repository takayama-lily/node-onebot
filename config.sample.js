"use strict";
// 将此文件更名为config.js才能生效哦
// 如果需要更详细的日志，可以在general中添加配置项 log_level: "trace",
// 其他可用的日志等级："debug", "info", warn", "error", "off"

module.exports = {

    //通用配置
    general: {
        platform:           2,      //1手机 2平板 3手表(部分事件不支持)
        ignore_self:        true,   //群聊和私聊是否无视自己的发言
        resend:             true,   //被风控的消息是否尝试以另一种方式再次发送(目前不清楚会有什么弊端，但是确实有效)
        debug:              false,  //开启debug
        use_cqhttp_notice:  false,  //是否使用cqhttp标准的notice事件格式

        host:               "0.0.0.0",  //监听主机名
        port:               5700,       //端口
        use_http:           false,      //启用http
        use_ws:             false,      //启用ws，和http使用相同端口(暂不支持分端口)
        access_token:       "",         //访问api的token
        secret:             "",         //上报数据的sha1签名密钥
        post_timeout:       30,         //post超时时间(秒)
        post_message_format:"string",   //string或array
        enable_heartbeat:   false,      //是否启用ws心跳
        heartbeat_interval: 15000,      //ws心跳间隔
        rate_limit_interval:500,        //使用_rate_limited后缀限速调用api的排队间隔时间(毫秒)
        event_filter:       "",         //事件过滤器
        post_url: [
            // "http://your.address.com:80", //上报地址，可以添加多个url
        ],
        ws_reverse_url: [ 
            // "ws://your.address.com:8080", //反向ws地址，可以添加多个url(暂不支持将api和event分两个通道)
        ],
        ws_reverse_reconnect_interval: 3000, //反向ws断线重连间隔(毫秒)
    },

    //每个账号的单独配置(用于覆盖通用配置)
    123456789: {

    },

    987654321: {

    }
};
