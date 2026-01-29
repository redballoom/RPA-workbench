# RPA Workbench 状态设计分析

> 文档版本: v1.0
> 创建日期: 2026-01-29
> 作者: Claude Code

## 1. 当前状态定义

### 1.1 Account (账号管理)
| 状态 | 说明 | 枚举名 |
|------|------|--------|
| pending | 待启动/空闲 | account_status |
| completed | 已完成 | account_status |
| running | 运行中 | account_status |

**语义**: 代表账号下**最近应用**的执行状态

### 1.2 Task (任务控制)
| 状态 | 说明 | 枚举名 |
|------|------|--------|
| pending | 待启动 | task_status |
| completed | 已完成 | task_status |
| running | 运行中 | task_status |
| failed | 失败 | task_status |

### 1.3 ExecutionLog (执行日志)
| 状态 | 说明 | 枚举名 |
|------|------|--------|
| completed | 执行成功 | log_status |
| failed | 执行失败 | log_status |
| running | 运行中 | log_status |

---

## 2. 状态流转逻辑

### 2.1 任务启动流程 (确认模式)

```
用户点击启动 → /api/v1/tasks/{id}/start → /resources/proxy/intranet
                                        ↓
                              等待影刀确认
                                        ↓
                           /webhook/confirm (action=START)
                                        ↓
                           Task.status = "running"
                           Account.status = "running"
```

### 2.2 任务完成流程

```
影刀执行完成 → /webhook/execution-complete
                      ↓
              创建 ExecutionLog (status = completed/failed)
                      ↓
              Task.status = "pending"  ← 核心逻辑
              Account.status = webhook.status
```

### 2.3 心跳保活流程

```
影刀运行中 → /webhook/heartbeat
                  ↓
          Account.status = "running"
```

---

## 3. 用户建议的状态设计

### 3.1 建议的 Account 状态

| 状态 | 说明 | 来源 |
|------|------|------|
| **pending** | 空闲/待启动 | 默认状态 |
| **completed** | 最近任务已完成 | execution-complete 回调 |  补充： execution-complete的回调应该是两种状态，completed 和 failed，代表最近执行应用的运行结果
| **running** | 最近任务运行中 | heartbeat / confirm 回调 |

**语义**: 账号状态与最近一次任务执行结果挂钩

### 3.2 建议的 Task 状态 (简化为 2 种)

| 状态 | 说明 | 触发 |
|------|------|------|
| **pending** | 待启动/空闲 | 任务创建 / execution-complete |
| **running** | 运行中 | webhook/confirm (START) |

**关键**: 任务执行完成后，应该变回 `pending`，而不是 `completed` 或 `failed`
- 成功/失败结果记录在 **ExecutionLog** 中

### 3.3 建议的 ExecutionLog 状态 (简化为 2 种)

| 状态 | 说明 |
|------|------|
| **completed** | 执行成功 |
| **failed** | 执行失败 |

**关键**: Log 只记录**执行结果**，不需要 `running` 状态

---

## 4. 需要修改的代码

### 4.1 后端模型修改

**文件**: `backend/app/models/task.py`
```python
# 修改前
status = Column(Enum("pending", "completed", "running", "failed", name="task_status"), ...)

# 修改后
status = Column(Enum("pending", "running", name="task_status"), ...)
```

**文件**: `backend/app/models/execution_log.py`
```python
# 修改前
status = Column(Enum("completed", "failed", "running", name="log_status"), ...)

# 修改后
status = Column(Enum("completed", "failed", name="log_status"), ...)
```

### 4.2 后端 Schema 修改

**文件**: `backend/app/schemas/common.py`
```python
# 修改前
class TaskStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    running = "running"
    failed = "failed"

class LogStatus(str, Enum):
    completed = "completed"
    failed = "failed"
    running = "running"

# 修改后
class TaskStatus(str, Enum):
    pending = "pending"
    running = "running"

class LogStatus(str, Enum):
    completed = "completed"
    failed = "failed"
```

### 4.3 前端 API 类型修改

**文件**: `frontend/src/lib/api.ts`
```typescript
// 修改前
status: 'pending' | 'completed' | 'running' | 'failed'  // Task
status: 'completed' | 'failed' | 'running'             // Log

// 修改后
status: 'pending' | 'running'                          // Task
status: 'completed' | 'failed'                         // Log
```

### 4.4 后端 webhook 逻辑检查

**文件**: `backend/app/api/v1/webhook.py`

`/webhook/execution-complete` 已有正确逻辑:
```python
# 第 232 行
task_status = "pending" if payload.status in ["completed", "failed"] else payload.status
await task_service.update_task_status_by_app(...)
```

需要确认 `else` 分支是否需要处理。

---

## 5. 数据库迁移

由于状态枚举修改，需要重建数据库或执行 ALTER TABLE：

```bash
# 方式 1: 删除旧数据库（开发环境）
rm backend/rpa_app.db
# 重启后端自动创建新结构

# 方式 2: SQLite ALTER TABLE（生产环境）
# SQLite 不支持直接修改枚举，需要重建表
```

---

## 6. 待确认问题

1. **ExecutionLog 是否需要 `running` 状态？**
   - 如果心跳需要在 log 中也体现 running，需要保留
   - 如果只需要最终结果，可以移除

2. **Task 的 `failed` 状态是否完全不需要？**
   - 任务执行失败的场景如何记录？
   - 目前失败也记录到 log，然后 task 变回 pending

3. **Account 的 `completed` 状态语义**
   - 是否需要区分"成功完成"和"失败完成"？
   - 还是只需要知道"最近执行已结束"？

---

## 7. 变更清单

- [ ] 修改 `backend/app/models/task.py` - 移除 completed, failed
- [ ] 修改 `backend/app/models/execution_log.py` - 移除 running
- [ ] 修改 `backend/app/schemas/common.py` - 更新枚举
- [ ] 修改 `frontend/src/lib/api.ts` - 更新类型定义
- [ ] 重建数据库 `rpa_app.db`
- [ ] 测试完整状态流转流程

---

## 8. 参考文件路径

| 文件 | 路径 |
|------|------|
| 账号模型 | `backend/app/models/account.py:22` |
| 任务模型 | `backend/app/models/task.py:24` |
| 日志模型 | `backend/app/models/execution_log.py:22` |
| 公共枚举 | `backend/app/schemas/common.py` |
| Webhook 逻辑 | `backend/app/api/v1/webhook.py` |
| 前端 API 类型 | `frontend/src/lib/api.ts:28-70` |
