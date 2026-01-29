1. 为什么需要端口，端口是未来内网穿透使用的，比如我需要的内网穿透连接格式：”https://qn-v.xf5920.cn/yingdao?backend_ip=192.168.6.52&backend_port=8000&tak=AMZ-GPSR%E8%87%AA%E5%8A%A8%E6%8F%90%E4%BA%A4_52_v2&target=ALL&timestamp=1768386942“  backend_ip：就是主机ip地址
backend_port： 就是端口
tak：是任务名称
target: 等于 START 是启动应用
        等于 ALL  是关闭应用
timestamp： 是点击按钮的时间戳

2. 整个workflow:
    用户添加账户  ->  用户为任务绑定对应的账户   ->  用户在任务管理页面启动对应的应用， 启动是向：https://qn-v.xf5920.cn/yingdao?backend_ip=192.168.6.52&backend_port=8000&tak=AMZ-GPSR%E8%87%AA%E5%8A%A8%E6%8F%90%E4%BA%A4_52_v2&target=START&timestamp=1768386942  发起请求，停止是向：https://qn-v.xf5920.cn/yingdao?backend_ip=192.168.6.52&backend_port=8000&tak=AMZ-GPSR%E8%87%AA%E5%8A%A8%E6%8F%90%E4%BA%A4_52_v2&target=START&timestamp=1768387865 发起请求

    启动后，请求的地址会被远程电脑的监听程序获取（已完成）从而触发影刀应用执行，影刀应用执行结束后发起 webhook/execution-complete 请求，将执行状况写入到日志的数据库，此时前端同步将此账户的任务状态修改会待启动状态，



AI 优化：
## 1. 背景与需求 (Context)
为了支持远程触发局域网内的影刀应用，系统需要通过内网穿透（frp/ddns 等）将指令路由至特定主机。为此，我们需要在任务触发请求中明确定义主机 IP 与端口信息，以建立精准的点对点控制。

## 2. 控制协议规范 (Protocol)
请求采用 HTTP GET 方式，通过 URL 参数传递控制指令。

API 基准地址: https://qn-v.xf5920.cn/yingdao

参数说明:
    backend_ip: 目标主机的局域网 IP（用于监听程序内网识别）。

    backend_port: 目标监听程序的通讯端口。

    tak: 任务唯一标识（Task Name）。

    target: 指令动作。START (启动应用) / ALL (停止/关闭应用)。

    timestamp: 请求发起的时间戳（用于防止请求重放或过期校验）。

请求示例 (启动)： https://qn-v.xf5920.cn/yingdao?backend_ip=192.168.6.52&backend_port=8000&tak=AMZ-GPSR_v2&target=START&timestamp=1768386942

## 3. 业务流程 (Workflow)
完整的自动化闭环流程如下：
    资产准备: 用户在前端页面添加账户，并将账户与特定任务（Task）进行绑定。

    触发指令: 用户在任务管理页面点击“启动”或“停止”。

    前端/后端根据绑定关系拼接上述协议 URL 并发起请求。

远程执行:
    部署在远程电脑的监听程序接收请求（已完成）。

    监听程序唤起影刀 RPA 应用执行具体业务逻辑。

状态回传 (Webhook):
    影刀应用执行完毕后，发起请求至 webhook/execution-complete。

数据落库与反馈:
    后端接收 Webhook，将执行结果、日志写入数据库。

前端同步更新: 将该账户对应的任务状态重置为“待启动”，以便用户进行下一次操作。