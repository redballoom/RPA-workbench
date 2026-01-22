# RPA Workbench 问题修复记录

> 创建日期: 2026-01-21
> 原始问题: issue1.md

---

## 问题概述

在前端和后端联调测试中，发现了3个关键问题，现已全部修复。

---

## 问题1: Task启动时Account状态未同步

### 问题描述
在新增Account用户信息后，其绑定的Task任务点击启动后，Account Management页面的Current Status未与Task状态同步。

### 解决方案
修改 `backend/app/services/task_service.py`：

**start_task 方法:**
```python
# 启动Task时，同步Account状态为running
accounts = await self.account_repo.get_by_shadow_bot_account_list(task.shadow_bot_account)
for account in accounts:
    await self.account_repo.update(
        account.id,
        {"status": "running", "recent_app": task.app_name}
    )
```

**stop_task 方法:**
```python
# 停止Task时，同步Account状态为completed
accounts = await self.account_repo.get_by_shadow_bot_account_list(task.shadow_bot_account)
for account in accounts:
    await self.account_repo.update(
        account.id,
        {"status": "completed", "end_time": datetime.utcnow()}
    )
```

### 修改文件
- `backend/app/services/task_service.py`
- `backend/app/repositories/account_repository.py` (新增 `get_by_shadow_bot_account_list` 方法)

---

## 问题2: 缺少Webhook接口供影刀应用回调

### 问题描述
影刀应用执行完毕后需要向网页发起回调请求，完成以下功能闭环：
1. 在Execution Logs记录执行日志
2. 更新Account的recent_app为最后执行的应用名称
3. 更新Account的end_time为执行完成时间

### 解决方案
新建 `backend/app/api/v1/webhook.py` 文件，新增两个Webhook接口：

**1. execution-complete 接口**
```
POST /api/v1/webhook/execution-complete
```
请求体：
```json
{
  "shadow_bot_account": "account_name",
  "app_name": "Excel自动化",
  "status": "completed",
  "end_time": "2026-01-21T14:00:00",
  "duration": 120.5,
  "log_info": false,
  "screenshot": false
}
```
功能：
- 创建执行日志记录
- 更新Account的recent_app
- 更新Account的status为completed
- 更新Account的end_time

**2. heartbeat 接口**
```
POST /api/v1/webhook/heartbeat?shadow_bot_account=xxx&app_name=xxx
```
功能：
- 影刀应用执行中定期调用
- 更新Account状态为running
- 更新Account的recent_app

### 修改文件
- `backend/app/api/v1/webhook.py` (新建)
- `backend/app/api/v1/__init__.py` (注册Webhook路由)

---

## 问题3: 数据未持久化

### 问题描述
前端网页新增的账号信息和任务信息在 `backend/app.db` 中无法持久化存储。

### 原因分析
1. 数据库URL配置使用的是相对路径 `./app.db`
2. 存在两个数据库文件：
   - `backend/app.db` (正确位置，有数据)
   - `根目录/app.db` (空文件)

### 解决方案
1. 修改 `backend/app/core/config.py`：
```python
DATABASE_URL: str = "sqlite+aiosqlite:////home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend/app.db"
```

2. 清理空数据库文件
```bash
rm -f /home/redballooon/Desktop/claude_code_projects/RPA-workbench/app.db
```

### 修改文件
- `backend/app/core/config.py`

---

## 辅助修复

### 1. Schema验证修复
修改 `backend/app/schemas/execution_log.py`：
- `host_ip` 字段设为可选（允许空字符串）

### 2. Repository方法修复
修改 `backend/app/repositories/account_repository.py`：
- 新增 `get_by_shadow_bot_account_list` 方法返回Account列表

### 3. Service层修复
修改 `backend/app/services/account_service.py`：
- `update_account` 方法支持dict和Pydantic model两种输入
- 添加datetime字符串转datetime对象的处理

### 4. Repository日期处理修复
修改 `backend/app/repositories/log_repository.py`：
- `create_log` 方法添加字符串转datetime处理

---

## 修改文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `backend/app/services/task_service.py` | 修改 | 同步Account状态 |
| `backend/app/repositories/account_repository.py` | 修改 | 新增列表查询方法 |
| `backend/app/api/v1/webhook.py` | 新建 | Webhook接口 |
| `backend/app/api/v1/__init__.py` | 修改 | 注册Webhook路由 |
| `backend/app/core/config.py` | 修改 | 修复数据库URL |
| `backend/app/schemas/execution_log.py` | 修改 | host_ip设为可选 |
| `backend/app/services/account_service.py` | 修改 | 支持dict输入 |
| `backend/app/repositories/log_repository.py` | 修改 | 日期字符串处理 |

---

## 验证结果

### API测试
```bash
# 测试Webhook接口
curl -X POST http://localhost:8888/api/v1/webhook/execution-complete \
  -H "Content-Type: application/json" \
  -d '{"shadow_bot_account": "service_test_bot", "app_name": "Excel自动化", "status": "completed", "duration": 120.5}'

# 响应
{"success": true, "message": "Execution log created successfully", "log_id": "xxx"}
```

### 数据库验证
- 数据正确保存到 `backend/app.db`
- 前端页面数据与数据库同步
- Account状态与Task状态正确联动
