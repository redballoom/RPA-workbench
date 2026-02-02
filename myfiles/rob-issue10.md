# 任务修改账号后账号未同步问题

> 2026-01-30

## 问题描述

在"任务控制"页面修改任务的所属账号时，对应的账号 `task_count` 没有被修改，还是绑定的原来的账号。

## 问题分析

### 现状

| 操作 | 是否同步 task_count |
|------|---------------------|
| 创建任务 | ✅ 是 |
| 删除任务 | ✅ 是 |
| 修改任务 | ❌ 否 |

### 根因分析

**代码位置**: `backend/app/services/task_service.py`

**create_task** (第111-118行) - ✅ 有同步：
```python
async def create_task(self, task_in: TaskCreate) -> TaskResponse:
    task = await self.repo.create(task_in.model_dump())
    # Sync task_count to associated accounts
    await self._sync_task_count(task.shadow_bot_account)  # ✅ 有调用
    return TaskResponse.model_validate(task)
```

**delete_task** (第139-168行) - ✅ 有同步：
```python
async def delete_task(self, task_id: str) -> bool:
    # ...
    if deleted:
        await self._sync_task_count(shadow_bot_account)  # ✅ 有调用
    return deleted
```

**update_task** (第120-137行) - ❌ 没有同步：
```python
async def update_task(self, task_id: str, task_in: TaskUpdate) -> Optional[TaskResponse]:
    # ...
    updated_task = await self.repo.update(task_id, update_data)
    # ❌ 没有调用 _sync_task_count
    return TaskResponse.model_validate(updated_task)
```

## 问题根因

当修改任务的 `shadow_bot_account` 时：
- 原账号的 `task_count` 不会减少
- 新账号的 `task_count` 不会增加
- 因为 `update_task` 方法没有调用 `_sync_task_count`

## 修复方案

在 `update_task` 中添加账号切换时的 `task_count` 同步逻辑：

**修改文件**: `backend/app/services/task_service.py`

**修改后**:
```python
async def update_task(self, task_id: str, task_in: TaskUpdate) -> Optional[TaskResponse]:
    """Update an existing task and sync task_count"""
    task = await self.repo.get(task_id)
    if not task:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": f"Task with ID '{task_id}' not found",
            },
        )

    # 记录修改前的账号
    old_shadow_bot_account = task.shadow_bot_account

    # Filter out None values for update
    update_data = {k: v for k, v in task_in.model_dump().items() if v is not None}

    updated_task = await self.repo.update(task_id, update_data)

    # 检查是否修改了 shadow_bot_account
    new_shadow_bot_account = task_in.shadow_bot_account
    if new_shadow_bot_account and new_shadow_bot_account != old_shadow_bot_account:
        # 同步原账号和新账号的 task_count
        await self._sync_task_count(old_shadow_bot_account)
        await self._sync_task_count(new_shadow_bot_account)
        print(f"[更新任务] 账号从 '{old_shadow_bot_account}' 改为 '{new_shadow_bot_account}'")

    return TaskResponse.model_validate(updated_task)
```

## 验证步骤

1. 创建一个任务绑定到账号 A（账号 A 的 task_count = 1）
2. 修改任务的所属账号为账号 B
3. 检查：
   - 账号 A 的 task_count 是否变为 0
   - 账号 B 的 task_count 是否变为 1
