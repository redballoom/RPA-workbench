# RPA Workbench - Issue2 修复计划

> 创建日期: 2026-01-21
> 原始问题: issue2.md

---

## 问题概述

**问题描述**: Task Control 页面任务状态持久化异常
- 当前行为: 点击"执行"后切换页面再返回，任务状态被重置
- 预期行为: 任务状态应保持"执行中"，直到用户点击结束或收到 Webhook 完成信号

---

## 根本原因分析

**不是数据库问题**，问题在于前端数据来源设计不合理：

1. **前端使用 LocalStorage 作为唯一数据源**
   - 组件挂载时只从 LocalStorage 读取，不调用后端 API
   - 切换页面时组件卸载，重新挂载时可能读取到旧数据

2. **handleStartTask 只更新本地状态**
   - 只调用外部 URL (`qn-v.xf5920.cn`)
   - 没有调用 `POST /api/v1/tasks/{id}/start` 更新后端状态

3. **没有轮询机制**
   - 无法实时获取任务最新状态
   - 切换回页面时不会自动刷新数据

---

## 解决方案

### 修改文件
`frontend/src/pages/TaskControl.tsx`

### 修改内容

#### 1. 添加 API 调用函数

```typescript
// API 基础地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api/v1';

// 从后端获取任务列表
const fetchTasksFromAPI = async (): Promise<Task[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Failed to fetch tasks from API:', error);
        return [];
    }
};

// 启动任务
const startTaskAPI = async (taskId: string, task: Task) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to start task');
        return await response.json();
    } catch (error) {
        console.error('Failed to start task:', error);
        throw error;
    }
};

// 停止任务
const stopTaskAPI = async (taskId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to stop task');
        return await response.json();
    } catch (error) {
        console.error('Failed to stop task:', error);
        throw error;
    }
};
```

#### 2. 修改 useState 初始化

```typescript
// 优先从后端加载任务数据，如果没有则使用 LocalStorage
const [tasks, setTasks] = useState<Task[]>(() => {
    return []; // 初始为空字符串，由 useEffect 加载
});
```

#### 3. 添加 useEffect 加载数据

```typescript
useEffect(() => {
    const loadTasks = async () => {
        const apiTasks = await fetchTasksFromAPI();
        if (apiTasks.length > 0) {
            setTasks(apiTasks);
        } else {
            // 如果后端没有数据，从 LocalStorage 读取
            try {
                const storedTasks = localStorage.getItem('tasks');
                if (storedTasks) {
                    setTasks(JSON.parse(storedTasks));
                }
            } catch (error) {
                console.error('Failed to load tasks from localStorage:', error);
            }
        }
    };
    loadTasks();
}, []);

// 添加轮询机制：每5秒刷新任务状态
useEffect(() => {
    const pollInterval = setInterval(async () => {
        const apiTasks = await fetchTasksFromAPI();
        setTasks(prevTasks => {
            // 合并后端数据，保留本地状态中的某些字段
            const mergedTasks = apiTasks.map(apiTask => {
                const localTask = prevTasks.find(t => t.id === apiTask.id);
                if (localTask) {
                    return { ...apiTask, configFile: localTask.configFile, configInfo: localTask.configInfo };
                }
                return apiTask;
            });
            return mergedTasks;
        });
    }, 5000);

    return () => clearInterval(pollInterval);
}, []);
```

#### 4. 修改 handleStartTask

```typescript
const handleStartTask = async (task: Task) => {
    setIsLoading(prev => ({
        ...prev,
        [task.id]: true
    }));

    const controlUrl = `https://qn-v.xf5920.cn/yingdao?backend_ip=${task.hostIp}&tak=${encodeURIComponent(task.appName)}&target=START`;

    try {
        // 调用后端 API 启动任务
        await startTaskAPI(task.id, task);

        // 调用外部控制 URL
        window.open(controlUrl, '_blank');

        // 更新本地状态
        setTasks(prev => prev.map(t => t.id === task.id ? {
            ...t,
            status: "running",
            lastRunTime: new Date().toLocaleString("zh-CN")
        } : t));

        toast.success(`Task started successfully!`);
    } catch (error) {
        toast.error('Failed to start task');
    } finally {
        setIsLoading(prev => ({
            ...prev,
            [task.id]: false
        }));
    }
};
```

#### 5. 修改 handleStopTask

```typescript
const handleStopTask = async (task: Task) => {
    setIsLoading(prev => ({
        ...prev,
        [task.id]: true
    }));

    try {
        // 调用后端 API 停止任务
        await stopTaskAPI(task.id);

        // 更新本地状态
        setTasks(prev => prev.map(t => t.id === task.id ? {
            ...t,
            status: "completed",
            lastRunTime: new Date().toLocaleString("zh-CN")
        } : t));

        toast.success(`Task stopped successfully!`);
    } catch (error) {
        toast.error('Failed to stop task');
    } finally {
        setIsLoading(prev => ({
            ...prev,
            [task.id]: false
        }));
    }
};
```

---

## 验证步骤

1. 启动后端服务: `cd backend && uvicorn app.main:app --reload --port 8888`
2. 启动前端服务: `cd frontend && pnpm dev`
3. 打开浏览器访问 http://localhost:3000
4. 创建或选择一个任务
5. 点击"执行"按钮，观察状态是否变为"运行中"
6. 切换到其他页面，等待几秒
7. 返回 Task Control 页面，验证任务状态是否保持"运行中"
8. 测试结束按钮是否正常工作

---

## 修改文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `frontend/src/pages/TaskControl.tsx` | 修改 | 添加 API 调用、useEffect 加载数据、轮询机制 |
