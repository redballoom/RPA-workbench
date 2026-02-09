# Issue #12 分析报告：任务状态与账号状态同步问题

## 1. What (是什么问题)

### 问题描述
- 在"任务控制"页面，用户启动一个任务后执行一段时间
- 用户点击"强制退出"按钮
- **任务控制页面**：状态正确更新为"待启动"
- **账号管理页面**：该账号关联的状态仍显示"运行中"

### 预期行为
两个页面的状态应该保持一致，任一页面操作后另一页面也应同步更新。

---

## 2. Why (为什么会出现问题)

### 根本原因分析

#### 原因一：后端只发送了 `task_updated` 事件

**位置**：`backend/app/services/task_service.py` 第369-381行

```python
# SSE 广播
try:
    from app.services.sse_service import sse_service
    await sse_service.broadcast({
        "type": "task_updated",  # ← 只发送了 task_updated
        "data": {
            "shadow_bot_account": task.shadow_bot_account,
            "app_name": task.app_name,
            "changes": {"status": "pending"}
        }
    })
except Exception as e:
    print(f"[强制停止] SSE 广播失败: {e}")
```

虽然代码在第359-367行更新了账号状态：
```python
if account:
    await self.account_repo.update(
        account.id,
        {
            "status": TaskStatus.pending.value,
            "recent_app": task.app_name,
        }
    )
```

但是**没有发送 `account_updated` 事件**来通知前端账号状态已改变。

#### 原因二：前端账号管理页面没有订阅 `task_updated` 事件

**任务控制页面** (`frontend/src/pages/TaskControl.tsx` 第80-98行)：
```typescript
useEffect(() => {
  const unsubTask = subscribe('task_updated', (event) => {  // ✓ 订阅了 task_updated
    loadTasks();
  });
  const unsubLog = subscribe('log_created', (event) => {
    loadTasks();
  });
}, [subscribe]);
```

**账号管理页面** (`frontend/src/pages/AccountManagement.tsx` 第58-83行)：
```typescript
useEffect(() => {
  const unsubAccount = subscribe('account_updated', (event) => {  // 只订阅了 account_updated
    loadAccounts();
  });
  const unsubLog = subscribe('log_created', (event) => {
    loadAccounts();
  });
}, [subscribe]);
// ❌ 没有订阅 task_updated
```

### 事件流程分析

```
用户点击"强制退出"
    ↓
前端调用 tasksApi.forceStop()
    ↓
后端 force_stop_task() 执行：
    1. 更新任务状态为 pending
    2. 更新账号状态为 pending
    3. 只发送了 "task_updated" 事件 ← 问题点
    ↓
SSE 广播：
    ✗ 任务控制页面 ← 收到 task_updated → 刷新 ✓
    ✗ 账号管理页面 ← 没订阅 task_updated → 不刷新 ✗
```

---

## 3. Who/Where (影响范围)

### 受影响组件
1. **前端**：
   - `frontend/src/pages/AccountManagement.tsx` - 账号管理页面
   - `frontend/src/hooks/useSSE.ts` - SSE Hook (正常)

2. **后端**：
   - `backend/app/services/task_service.py` - `force_stop_task()` 函数

### 触发场景
- 用户在任务控制页面点击"强制退出"按钮
- 任何会同时更新任务和账号状态的操作

### 不受影响场景
- 在账号管理页面直接刷新（会重新从后端获取最新数据）
- 重新进入账号管理页面

---

## 4. How (如何解决)

### 解决方案

#### 方案一：在后端发送 `account_updated` 事件（推荐）

修改 `backend/app/services/task_service.py` 第369-381行：

```python
# SSE 广播 - 发送任务更新事件
try:
    from app.services.sse_service import sse_service
    await sse_service.broadcast({
        "type": "task_updated",
        "data": {
            "shadow_bot_account": task.shadow_bot_account,
            "app_name": task.app_name,
            "changes": {"status": "pending"}
        }
    })
    print(f"[强制停止] 已发送 task_updated 事件: {task.shadow_bot_account}")
except Exception as e:
    print(f"[强制停止] SSE 广播失败: {e}")

# 同时发送 account_updated 事件（解决同步问题）
if account:
    try:
        await sse_service.broadcast({
            "type": "account_updated",
            "data": {
                "account_id": account.id,
                "shadow_bot_account": account.shadow_bot_account,
                "changes": {
                    "status": "pending",
                    "recent_app": task.app_name
                }
            }
        })
        print(f"[强制停止] 已发送 account_updated 事件: {account.shadow_bot_account}")
    except Exception as e:
        print(f"[强制停止] account_updated 事件广播失败: {e}")
```

#### 方案二：在前端账号管理页面订阅 `task_updated`（备选）

修改 `frontend/src/pages/AccountManagement.tsx`：

```typescript
useEffect(() => {
  // 账号更新事件
  const unsubAccount = subscribe('account_updated', (event) => {
    loadAccounts();
  });

  // 任务更新事件（当任务状态改变时也需要刷新账号状态）
  const unsubTask = subscribe('task_updated', (event: SSEEvent) => {
    console.log('[账号管理] 收到任务更新事件:', event.data);
    loadAccounts();  // 刷新账号列表
  });

  // 日志创建事件
  const unsubLog = subscribe('log_created', (event) => {
    loadAccounts();
  });

  return () => {
    unsubAccount();
    unsubTask();  // 清理订阅
    unsubLog();
  };
}, [subscribe]);
```

### 推荐方案

**优先选择方案一**（后端发送 `account_updated` 事件），理由：
1. 从数据完整性角度，账号状态改变应该发送 `account_updated` 事件
2. 符合单一职责原则 - 任务状态改变发 `task_updated`，账号状态改变发 `account_updated`
3. 前端不需要关心内部实现细节

---

## 5. 潜在风险

### 风险一：SSE 连接状态不一致
- 用户可能同时打开多个页面
- 不同页面的 SSE 连接是独立的
- 某些页面可能因网络问题断开连接

**缓解措施**：
- 前端增加轮询降级机制（当 SSE 断开时定期拉取数据）
- SSE 心跳检测自动重连

### 风险二：事件风暴
- 多个操作可能触发大量 SSE 事件
- 可能导致前端频繁刷新

**缓解措施**：
- 后端可以考虑事件合并/节流
- 前端增加防抖处理

### 风险三：事件顺序问题
- 如果用户快速执行多个操作
- 事件可能不按顺序到达

**缓解措施**：
- 前端使用最新数据覆盖旧数据
- 实现乐观更新机制

---

## 6. 相关文件

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `backend/app/services/task_service.py` | 后端修复 | `force_stop_task()` 添加 `account_updated` 事件广播 |
| `frontend/src/pages/AccountManagement.tsx` | 观察 | 前端目前无需修改（方案一情况下） |

---

## 7. 测试验证

### 测试步骤
1. 打开"账号管理"页面，确认某账号状态为"运行中"
2. 打开"任务控制"页面，找到该账号关联的任务
3. 点击任务的"强制退出"按钮
4. 观察两个页面的状态变化

### 预期结果
- 两个页面的状态都应该在几秒内更新为"待启动"

### 实际结果（修复前）
- 任务控制页面更新为"待启动"
- 账号管理页面仍显示"运行中"

---

## 8. 总结

| 项目 | 内容 |
|-----|------|
| **问题类型** | 数据同步/事件广播不完整 |
| **影响范围** | 账号管理页面状态不同步 |
| **严重程度** | 中等（不影响核心功能，但用户体验不佳） |
| **修复方案** | 后端在更新账号状态时发送 `account_updated` 事件 |
| **预估工作量** | 约 10-15 分钟 |
