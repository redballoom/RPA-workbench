1. 问题描述：Task Control 页面任务状态持久化异常
+ 当前行为（Issue）： 在 Task Control 页面点击“执行”后，若中途切换到其他页面再返回，任务的执行状态会被重置（重置为初始态），导致无法看到进度。

+ 预期行为（Expected）： 任务状态应保持“执行中”，直到满足以下任一条件时才触发状态变更（更新至 Execution Logs 并结束执行态）：
    1.用户主动点击 “结束” 按钮。

    2.后端通过 Webhook /api/v1/webhook/execution-complete 推送了完成信号（Payload 参考下方 JSON）。
    {
        "shadow_bot_account": "account_name",
        "app_name": "Excel自动化",
        "status": "completed",
        "end_time": "2026-01-21T14:00:00",
        "duration": 120.5,
        "log_info": false,
        "screenshot": false
    }

+ 数据同步： 状态变更时，需确保 Execution Logs 页面同步更新 Task Control 的 Last Run 字段的接口信息。