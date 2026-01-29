# 任务控制按钮修改计划

> 创建日期: 2026-01-28
> 状态: ✅ 已完成

---

## 1. 问题分析

### 1.1 当前状态

**后端** (`task_service.py`):
- `start_task()`: 发送请求后立即将任务状态更新为 `running`
- `stop_task()`: 发送请求后立即将任务状态更新为 `pending`

**前端** (`TaskControl.tsx`):
- `handleStartTask()`: 只调用代理接口，不更新状态
- `handleStopTask()`: 只调用代理接口，不更新状态

### 1.2 问题

前端按钮逻辑被破坏：
- 点击启动按钮后，任务状态没有变化
- 没有等待影刀确认的逻辑
- 后端原生的状态更新逻辑与新的代理模式冲突

---

## 2. 期望的工作流程

```
┌─────────┐     1. 点击启动      ┌─────────┐     2. 代理请求      ┌─────────────┐
│  前端   │ ─────────────────▶ │  后端   │ ─────────────────▶ │ 内网穿透API │
│ 浏览器  │                    │  代理   │                    │ qn-v.xf...  │
└─────────┘                    └─────────┘                    └─────────────┘
                                      │
                                      │ 3. 不更新状态
                                      ▼
                               ┌─────────┐
                               │  等待中 │ (状态保持 pending)
                               └─────────┘
                                      │
                                      │ 4. 影刀确认启动
                                      ▼
                               ┌─────────────────┐
                               │ POST /webhook/  │
                               │   confirm       │
                               │ (影刀调用)      │
                               └─────────────────┘
                                      │
                                      ▼
                               ┌─────────┐
                               │ 运行中  │ (状态变为 running)
                               └─────────┘
                                      │
                                      │ 5. 执行完成
                                      ▼
                               ┌─────────────────┐
                               │ POST /webhook/  │
                               │ execution-      │
                               │   complete      │
                               └─────────────────┘
                                      │
                                      ▼
                               ┌─────────┐
                               │ 待启动  │ (状态变为 pending)
                               └─────────┘
```

---

## 3. 修改方案

### 3.1 后端修改 (`backend/app/services/task_service.py`)

**修改 `start_task()` 方法**:
```python
async def start_task(self, task_id: str) -> TaskStartResponse:
    # ... 验证逻辑 ...

    # 发送内网穿透控制请求
    success, message = await self._send_control_request(...)

    if not success:
        raise HTTPException(...)

    # 【修改】不立即更新状态，等待 /webhook/confirm 确认
    # 只记录日志，不更新状态
    print(f"启动请求已发送，等待影刀确认: task={task_id}, app={task.app_name}")

    return TaskStartResponse(
        message=f"启动请求已发送，等待确认",
        task_id=task_id,
        status=TaskStatus.pending,  # 保持 pending 状态
    )
```

**修改 `stop_task()` 方法**:
```python
async def stop_task(self, task_id: str) -> TaskStopResponse:
    # ... 验证逻辑 ...

    # 发送停止请求
    success, message = await self._send_control_request(...)

    if not success:
        raise HTTPException(...)

    # 【修改】不立即更新状态，等待 /webhook/confirm 确认
    print(f"停止请求已发送，等待影刀确认: task={task_id}, app={task.app_name}")

    return TaskStopResponse(
        message=f"停止请求已发送，等待确认",
        task_id=task_id,
        status=TaskStatus.running,  # 保持 running 状态
    )
```

### 3.2 前端修改 (`frontend/src/pages/TaskControl.tsx`)

**修改 `handleStartTask()` 方法**:
```typescript
const handleStartTask = async (task: Task) => {
  // 1. 调用后端代理接口
  const url = `${API_BASE_URL}/resources/proxy/intranet?...`;
  const response = await fetch(url, { method: "GET" });
  const result = await response.json();

  if (result.success) {
    // 2. 成功：调用后端 startTask API 更新状态
    await tasksApi.startTask(task.id);
    toast.success("任务启动成功");
    loadTasks();  // 刷新列表
  } else {
    toast.error(`启动失败: ${result.message}`);
  }
};
```

**修改 `handleStopTask()` 方法**:
```typescript
const handleStopTask = async (task: Task) => {
  // 1. 调用后端代理接口
  const url = `${API_BASE_URL}/resources/proxy/intranet?...`;
  const response = await fetch(url, { method: "GET" });
  const result = await response.json();

  if (result.success) {
    // 2. 成功：调用后端 stopTask API 更新状态
    await tasksApi.stopTask(task.id);
    toast.success("任务停止成功");
    loadTasks();  // 刷新列表
  } else {
    toast.error(`停止失败: ${result.message}`);
  }
};
```

---

## 4. 状态变更总结

| 操作 | 修改前行为 | 修改后行为 |
|------|-----------|-----------|
| 点击启动 | 后端更新为 running | 后端保持 pending，等待 webhook 确认 |
| 点击停止 | 后端更新为 pending | 后端保持 running，等待 webhook 确认 |
| webhook/confirm (START) | - | 状态变为 running |
| webhook/confirm (STOP) | - | 状态变为 pending |
| webhook/execution-complete | 状态变为 pending | 状态变为 pending |

---

## 5. 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `backend/app/services/task_service.py` | start_task() 和 stop_task() 不立即更新状态 |
| `frontend/src/pages/TaskControl.tsx` | handleStartTask() 和 handleStopTask() 调用后端 API |

---

## 6. 测试计划

1. **启动测试**:
   - 点击启动按钮
   - 确认任务状态保持 `pending`
   - 调用 `/webhook/confirm` 确认
   - 确认任务状态变为 `running`

2. **停止测试**:
   - 点击停止按钮
   - 确认任务状态保持 `running`
   - 调用 `/webhook/confirm` 确认
   - 确认任务状态变为 `pending`

3. **完整流程测试**:
   - 启动 → 确认 → 执行完成 → 状态变为 pending

---

## 7. 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 状态不一致 | 低 | webhook 会更新状态，SSE 会同步前端 |
| 用户体验 | 低 | 按钮点击后有 toast 提示 |

---

请确认是否按此计划执行修改。
