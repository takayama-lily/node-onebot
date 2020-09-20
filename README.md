# http-api (文档参考[onebot](https://cqhttp.cc)）

[![core](https://img.shields.io/badge/core-oicq-brightgreen)](https://github.com/takayama-lily/oicq)
[![node engine](https://img.shields.io/node/v/oicq.svg)](https://nodejs.org)

**使用方法：**

1. 下载安装 [nodejs](https://nodejs.org)
2. 下载此源码包
3. 在目录下执行 `npm up` 安装依赖(今后也可使用此命令一键更新内核)
4. 配置 `config.js` (参考里面的注释)
5. 运行 `node main 123456789` (数字是你的登陆账号)

* 今后启动只需最后一步
* 只有首次登陆时需要交互，推荐使用pm2或forever等部署工具。

----

## 通信

* [x] HTTP和正向WS服务器
* [x] POST上报(多点)
* [x] 反向WS连接(多点)

## API

<details>

<summary>点开</summary>

|名称|备注|
|-|-|
|get_friend_list        ||
|get_stranger_list      ||
|get_group_list         ||
|get_group_info         ||
|get_group_member_list  ||
|get_group_member_info  ||
|get_stranger_info      ||
|send_private_msg       |得到的message_id是字符串格式|
|send_group_msg         |得到的message_id是字符串格式|
|send_discuss_msg       |发讨论组消息，无message_id|
|delete_msg             |message_id是字符串格式|
|set_friend_add_request ||
|set_group_add_request  ||
|send_group_notice      |title参数无效，仅content有效|
|send_group_poke        |群戳一戳，参数 group_id, user_id (未来可能会用CQ码实现)|
|set_group_special_title||
|set_group_admin        ||
|set_group_card         ||
|set_group_kick         ||
|set_group_ban          ||
|set_group_leave        ||
|set_group_name         ||
|send_like              |风险接口，勿频繁调用|
|get_login_info         ||
|can_send_image         ||
|can_send_record        ||
|get_status             ||
|get_version_info       |暂时返回的是内核版本|
|.handle_quick_operation|仅WS有效|
|set_online_status      |改状态，参数 status (11我在线上 31离开 41隐身 50忙碌 60Q我吧 70请勿打扰)|
|add_group              |添加群，参数 group_id (注：加群和加好友是风险接口，每日添加超过一定数量账号必然被风控)|
|add_friend             |添加群员为好友，参数 group_id, user_id, comment(可省略)|
|delete_friend          |删除好友，参数 user_id, block(是否屏蔽,默认为true)|
|invite_friend          |邀请好友入群，参数 group_id, user_id|
|set_nickname           |设置昵称，参数 nickname|
|set_gender             |设置性别，参数 gender (0未知 1男 2女)|
|set_birthday           |设置生日，参数 birthday (格式：20110202)|
|set_description        |设置个人说明，参数 description|
|set_signature          |设置签名，参数 signature|

</details>

## 其他

* [x] _async异步调用
* [x] 字符串或数组消息段
* [x] 鉴权
* [x] WS心跳
* [ ] 事件上报过滤

[内核功能支持和CQ码](https://github.com/takayama-lily/oicq/blob/dev/docs/project.md)
