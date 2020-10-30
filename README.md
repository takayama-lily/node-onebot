# http-api

[![core](https://img.shields.io/badge/core-oicq-brightgreen)](https://github.com/takayama-lily/oicq)
[![node engine](https://img.shields.io/node/v/oicq.svg)](https://nodejs.org)

**使用方法：**

1. 下载安装 [nodejs](https://nodejs.org) (v12.16以上)
2. 下载此源码包 (建议用`git clone`)  
<s>执行 `npm up` 安装依赖 (已集成自动安装)</s>  
3. 重命名 `config.sample.js` 为 `config.js` 并配置(参考注释)
4. 运行 `node main 123456789` (数字是你的登陆账号)

* 今后启动只需最后一步
* 只有首次登陆时需要交互(密码、验证码、设备锁)，之后推荐使用pm2或forever等部署工具。

----

## 通信

* [x] HTTP和正向WS服务器
* [x] POST上报(多点)
* [x] 反向WS连接(多点)

----

## API ([文档](https://github.com/howmanybots/onebot/blob/master/v11/specs/api/public.md)）

<details>

<summary>点开</summary>

|名称|参数(文档里有的不列了)|备注|
|-|-|-|
|get_friend_list        ||
|get_stranger_list      ||
|get_group_list         ||
|get_group_info         ||
|get_group_member_list  ||
|get_group_member_info  ||
|get_stranger_info      ||
|send_private_msg       ||返回的message_id是字符串格式
|send_group_msg         ||返回的message_id是字符串格式
|send_discuss_msg       |discuss_id<br>message<br>auto_escape|发讨论组消息，没有message_id
|delete_msg             ||
|set_friend_add_request ||
|set_group_add_request  ||
|send_group_notice      ||
|send_group_poke        ||群戳一戳，未来可能会用CQ码实现
|set_group_special_title||
|set_group_admin        ||
|set_group_card         ||
|set_group_kick         ||
|set_group_ban          ||
|set_group_leave        ||
|set_group_name         ||
|set_group_whole_ban    ||
|set_group_anonymous    ||
|send_like              ||
|get_login_info         ||
|can_send_image         ||
|can_send_record        ||
|get_status             ||
|get_version_info       ||暂时返回的是内核版本
|.handle_quick_operation||仅WS有效
|set_online_status      |status|设置在线状态(※仅限手机协议支持)<br>11我在线上 31离开 41隐身 50忙碌 60Q我吧 70请勿打扰|
|add_group              |group_id<br>comment|加群和加好友是风险接口，每日添加超过一定数量账号会被风控
|add_friend             |group_id<br>user_id<br>comment|添加好友<br>暂时只能添加群员
|delete_friend          |user_id<br>block|删除好友<br>block默认为true
|invite_friend          |group_id<br>user_id|邀请好友入群
|set_nickname           |nickname|设置昵称
|set_gender             |gender|设置性别 0未知 1男 2女
|set_birthday           |birthday|设置生日 格式：20110202
|set_description        |description|设置个人说明
|set_signature          |signature|设置签名
|set_portrait           |file|设置个人头像，与CQ码中的file格式相同

</details>

----

## Events

<details>

<summary>点开</summary>

新版事件的notice部分的上报格式默认与cqhttp中的格式不同。  
如需使用cqhttp格式，在config.js中将`use_cqhttp_notice`设置为`true`。

||新版格式([文档](https://github.com/takayama-lily/oicq/blob/master/docs/event.md))|cqhttp格式([文档](https://github.com/howmanybots/onebot/blob/master/v11/specs/event/README.md))|
|-|-|-|
|好友请求|request.friend.add     |request.friend         |
|加群请求|request.group.add      |request.group.add      |
|加群邀请|request.group.invite   |request.group.invite   |
|好友消息|message.private.friend |message.private.friend |
|单向好友|message.private.single |                       |
|临时会话|message.private.group  |message.private.group  |
|临时会话|message.private.other  |message.private.other  |
|群聊消息|message.group.normal   |message.group.normal   |
|匿名消息|message.group.anonymous|message.group.anonymous|
|讨论组消|message.discuss        |                       |
|好友增加|notice.friend.increase |notice.friend_add      |
|好友减少|notice.friend.decrease |                       |
|好友撤回|notice.friend.recall   |notice.friend_recall   |
|资料变更|notice.friend.profile  |                       |
|群员增加|notice.group.increase  |notice.group_increase  |
|群员减少|notice.group.decrease  |notice.group_decrease  |
|群组撤回|notice.group.recall    |notice.group_recall    |
|管理变更|notice.group.admin     |notice.group_admin     |
|群组禁言|notice.group.ban       |notice.group_ban       |
|群组转让|notice.group.transfer  |                       |
|群组文件|                       |notice.group_upload    |
|头衔变更|notice.group.title     |                       |
|群戳一戳|notice.group.poke      |                       |
|群设置变|notice.group.setting   |                       |
|元事件|meta_event.lifecycle.enable|meta_event.lifecycle.enable|
|元事件|meta_event.lifecycle.disable|meta_event.lifecycle.disable|
|元事件|meta_event.lifecycle.connect|meta_event.lifecycle.connect|
|元事件|meta_event.heartbeat|meta_event.heartbeat|

</details>

----

## 其他

* [x] _async异步调用api
* [x] 字符串或数组消息段
* [x] 鉴权
* [x] WS心跳
* [ ] 事件上报过滤
* [x] _rate_limited限速调用api
* [x] 自动更新内核版本

[内核功能支持和CQ码](https://github.com/takayama-lily/oicq/blob/dev/docs/project.md)
