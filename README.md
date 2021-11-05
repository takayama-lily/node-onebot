## 为了更好的维护和更新，该项目作为官方http-api与oicq仓库合并，今后请前往[这里](https://github.com/takayama-lily/oicq/tree/master/http-api)查看
## ↓↓推荐该项目的使用者迁移到更方便管理和维护的模式
```bash
> npm i -g oicq@1
> oicq <account>
```

## 该仓库的代码以及衍生fork等仍可以正常使用不受影响

# node-onebot

> 基于 [oicq](https://github.com/takayama-lily/oicq) 的 [onebot(cqhttp)](https://cqhttp.cc) QQ机器人协议的实现  
> 将机器人部署为独立的服务，通过http或ws与外界通信  
> 已支持手机QQ扫码直接登录(提示输入密码时直接按回车)  
> master分支是独立运行版，另提供[插件版](https://github.com/takayama-lily/node-onebot/tree/v2)

[![core](https://img.shields.io/badge/core-oicq-brightgreen)](https://www.npmjs.com/package/oicq)
[![node engine](https://img.shields.io/node/v/oicq.svg)](https://nodejs.org)
[![discord](https://img.shields.io/static/v1?label=chat&message=discord&color=7289da&logo=discord)](https://discord.gg/gKnU7BARzv)

**使用方法：**

1. 下载安装 [nodejs](https://nodejs.org) 安装版 (版本必须高于v12.16)
2. 下载此源码包 (建议用`git clone`)  
3. 重命名 `config.sample.js` 为 `config.js` 并配置
4. 运行 `node main 123456789` (数字是登陆账号)

* 今后启动只需最后一步
* 只有首次登陆时需要交互(密码、验证码、设备锁)，之后推荐使用pm2或forever等部署工具。

> config.js 支持更多的配置，可参考 [ConfBot](https://github.com/takayama-lily/oicq/blob/4e24fa15728fcf7e305b08425227b6cbb094550b/client.d.ts#L12)  
> [如何获得滑动验证码的ticket](https://github.com/takayama-lily/oicq/wiki/01.%E6%BB%91%E5%8A%A8%E9%AA%8C%E8%AF%81%E7%A0%81%E5%92%8C%E8%AE%BE%E5%A4%87%E9%94%81)  
> [其他常见问题](https://github.com/takayama-lily/oicq/wiki/02.%E5%85%B6%E4%BB%96%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)  
> 当前master分支下只进行http/ws的bug修复，及时更新依赖即可获得新特性。

----

## 通信

* [x] HTTP和正向WS服务器
* [x] POST上报(多点)
* [x] 反向WS连接(多点)

----

## API ([参考文档](https://github.com/howmanybots/onebot/blob/master/v11/specs/api/public.md))

<details>

<summary>已实现(文档中已列出)</summary>

|名称|备注|
|-|-|
|get_friend_list        |
|get_group_list         |
|get_group_info         |
|get_group_member_list  |
|get_group_member_info  |
|get_stranger_info      |
|**send_private_msg**   |message_id是string
|**send_group_msg**     |message_id是string
|send_msg               |
|delete_msg             |
|get_msg                |
|set_friend_add_request |
|set_group_add_request  |
|set_group_special_title|
|set_group_admin        |
|set_group_card         |
|set_group_kick         |
|set_group_ban          |
|set_group_leave        |
|set_group_name         |
|set_group_whole_ban    |
|set_group_anonymous_ban|仅支持flag字段，不支持另外两种
|set_group_anonymous    |
|send_like              |
|get_login_info         |
|can_send_image         |
|can_send_record        |
|get_status             |
|get_version_info       |
|.handle_quick_operation|仅WS有效
|get_cookies            |
|get_csrf_token         |
|clean_cache            |

</details>

<details>

<summary>已实现(新增)</summary>

|名称|参数|备注|
|-|-|-|
|get_stranger_list      ||获取陌生人列表
|send_discuss_msg       |discuss_id<br>message<br>auto_escape|发讨论组消息，没有message_id
|send_group_notice      |content|发送群公告
|send_group_poke        |group_id<br>user_id|群戳一戳，未来可能会用CQ码实现
|set_online_status      |status|设置在线状态(※仅限手机协议支持)<br>11我在线上 31离开 41隐身 50忙碌 60Q我吧 70请勿打扰|
|add_friend             |group_id<br>user_id<br>comment|添加群员为好友
|delete_friend          |user_id<br>block|删除好友<br>block默认为true
|invite_friend          |group_id<br>user_id|邀请好友入群
|set_nickname           |nickname|设置昵称
|set_gender             |gender|设置性别 0未知 1男 2女
|set_birthday           |birthday|设置生日 格式：20110202
|set_description        |description|设置个人说明
|set_signature          |signature|设置签名
|set_portrait           |file|设置个人头像，与CQ码中的file格式相同
|set_group_portrait     |file|设置群头像
|get_system_msg         ||获得未处理的申请
|get_chat_history       |message_id<br>count|返回message_id往前的count条消息<br>count默认20
|get_forward_msg        |resid|
|send_temp_msg          |group_id<br>user_id<br>message<br>auto_escape|

</details>

<details>

<summary>尚未实现</summary>

|名称|
|-|
|get_group_honor_info|
|get_credentials|
|get_vip_info|
|get_record|
|get_image|
|set_restart|

</details>

----

## Events

<details>

<summary>点开</summary>

新版事件的notice部分的上报格式默认与cqhttp中的格式不同。  
如需使用cqhttp格式，在config.js中将`use_cqhttp_notice`设置为`true`。

||新版格式([文档](https://github.com/takayama-lily/oicq/wiki/92.%E4%BA%8B%E4%BB%B6%E6%96%87%E6%A1%A3))|cqhttp格式([文档](https://github.com/howmanybots/onebot/blob/master/v11/specs/event/README.md))|
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
|群组文件|表现为CQ码              |notice.group_upload    |
|群戳一戳|notice.group.poke      |                       |
|群设置变|notice.group.setting   |                       |
|元事件|meta_event.lifecycle.enable|meta_event.lifecycle.enable|
|元事件|meta_event.lifecycle.disable|meta_event.lifecycle.disable|
|元事件|meta_event.lifecycle.connect|meta_event.lifecycle.connect|
|元事件|meta_event.heartbeat|meta_event.heartbeat|

</details>

----

[支持的CQ码](https://github.com/takayama-lily/oicq/wiki/90.%E5%A6%82%E4%BD%95%E5%8F%91%E9%80%81%E5%A4%9A%E5%AA%92%E4%BD%93%E5%86%85%E5%AE%B9(CQ%E7%A0%81))

----

## 其他

* [x] 字符串或数组消息段
* [x] 鉴权
* [x] WS心跳
* [x] _async异步调用api
* [x] _rate_limited限速调用api
* [x] [事件过滤器](https://richardchien.gitee.io/coolq-http-api/docs/4.15/#/EventFilter)
* [x] 设置允许跨域请求
* [x] 自动更新内核版本

## 考古

[旧版cqhttp文档](https://richardchien.gitee.io/coolq-http-api/docs/4.15/#/Configuration)
