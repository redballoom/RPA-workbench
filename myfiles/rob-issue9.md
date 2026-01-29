# Issue #9 分析报告：任务配置功能

> 创建日期: 2026-01-28
> 状态: ✅ 已完成

---

## 1. 需求概述

### 1.1 功能需求

1. **任务配置方式选择**：在编辑任务时，提供两种配置方式的选择
   - **配置文件**：勾选后显示文件上传控件，上传文件到阿里云 OSS
   - **配置信息**：勾选后显示 JSON 输入框，保存 JSON 格式的配置信息

2. **OSS 上传接口**：支持将配置文件上传到阿里云 OSS

3. **影刀获取配置接口**：影刀可以通过账号和应用名称获取配置信息

---

## 2. 当前代码状态分析

### 2.1 已有的字段

**Task 模型** (`backend/app/models/task.py`):
```python
config_file = Column(Boolean, default=False, nullable=False)  # 是否使用配置文件
config_info = Column(Boolean, default=False, nullable=False)  # 是否使用配置信息
```

**问题**: 只有布尔标记，**没有存储实际配置内容的字段**

### 2.2 前端现状

**TaskControl.tsx**:
- 有 `config_file` 和 `config_info` 复选框
- **没有**文件上传控件
- **没有** JSON 输入框
- 勾选后没有交互反馈

### 2.3 缺失的功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 配置文件上传 UI | ❌ 缺失 | 勾选 config_file 后应显示上传控件 |
| JSON 输入 UI | ❌ 缺失 | 勾选 config_info 后应显示 JSON 编辑器 |
| OSS 上传接口 | ❌ 缺失 | 后端没有文件上传到 OSS 的接口 |
| 配置存储字段 | ❌ 缺失 | 没有 config_file_path 和 config_json 字段 |
| 影刀获取配置接口 | ❌ 缺失 | 影刀无法获取任务配置 |

---

## 3. 数据库模型修改

### 3.1 Task 模型扩展

```python
# backend/app/models/task.py

class Task(Base):
    # ... 现有字段 ...

    # ============ 配置相关字段 ============
    # 配置文件路径 (OSS URL)
    config_file_path = Column(String(500), nullable=True)

    # 配置信息 (JSON 格式)
    config_json = Column(String(2000), nullable=True)
```

### 3.2 Pydantic Schema 修改

```python
# backend/app/schemas/task.py

class TaskUpdate(BaseModel):
    # ... 现有字段 ...
    config_file_path: Optional[str] = Field(default=None, max_length=500)
    config_json: Optional[str] = Field(default=None, max_length=2000)
```

### 3.3 前端类型扩展

```typescript
// frontend/src/lib/api.ts

export interface Task {
  // ... 现有字段 ...
  config_file_path?: string | null;  // 配置文件 OSS URL
  config_json?: string | null;        // 配置信息 JSON
}
```

---

## 4. 后端实现方案

### 4.1 OSS 上传接口

```python
# backend/app/api/v1/resources.py

@router.post("/upload/config")
async def upload_config_file(
    file: UploadFile = File(...),
    shadow_bot_account: str = Form(...),
    app_name: str = Form(...),
):
    """
    上传配置文件到 OSS

    Parameters:
        - file: 配置文件
        - shadow_bot_account: 机器人账号
        - app_name: 应用名称

    Returns:
        - file_url: OSS 文件访问 URL
    """
    # 生成 OSS 文件名
    object_name = f"config/{shadow_bot_account}/{app_name}/{file.filename}"

    # 上传到 OSS
    result = bucket.put_object(object_name, await file.read())

    if result.status == 200:
        file_url = f"https://{bucket_name}.{endpoint}/{object_name}"
        return {"success": True, "file_url": file_url}
    else:
        raise HTTPException(status_code=500, detail="上传失败")
```

### 4.2 影刀获取配置接口

```python
# backend/app/api/v1/resources.py

class ConfigGetRequest(BaseModel):
    shadow_bot_account: str = Field(..., description="机器人账号")
    app_name: str = Field(..., description="应用名称")


@router.post("/config/get")
async def get_task_config(payload: ConfigGetRequest):
    """
    获取任务配置信息（供影刀调用）

    影刀应用启动时调用此接口获取配置信息。

    Returns:
        - config_file: 是否使用配置文件
        - config_file_url: 配置文件 OSS URL (如有)
        - config_info: 是否使用配置信息
        - config_json: 配置信息 JSON (如有)
    """
    task = await task_repo.get_by_account_and_app(
        shadow_bot_account=payload.shadow_bot_account,
        app_name=payload.app_name
    )

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "config_file": task.config_file,
        "config_file_url": task.config_file_path,
        "config_info": task.config_info,
        "config_json": task.config_json,
    }
```

---

## 5. 前端实现方案

### 5.1 编辑任务表单增强

```typescript
// frontend/src/pages/TaskControl.tsx

// 添加状态
const [configFile, setConfigFile] = useState(false);
const [configInfo, setConfigInfo] = useState(false);
const [configFileObj, setConfigFileObj] = useState<File | null>(null);
const [configJsonContent, setConfigJsonContent] = useState("");

// 配置方式选择变化处理
const handleConfigTypeChange = (type: 'file' | 'info', checked: boolean) => {
  if (type === 'file') {
    setConfigFile(checked);
    if (checked) setConfigInfo(false);  // 互斥
  } else {
    setConfigInfo(checked);
    if (checked) setConfigFile(false);  // 互斥
  }
};

// 文件上传处理
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) setConfigFileObj(file);
};
```

### 5.2 条件渲染 UI

```tsx
{/* 配置方式选择 */}
<div className="flex items-center space-x-6">
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={configFile}
      onChange={(e) => handleConfigTypeChange('file', e.target.checked)}
    />
    <span className="ml-2">配置文件</span>
  </label>
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={configInfo}
      onChange={(e) => handleConfigTypeChange('info', e.target.checked)}
    />
    <span className="ml-2">配置信息</span>
  </label>
</div>

{/* 条件显示：文件上传 */}
{configFile && (
  <div className="mt-4">
    <label>上传配置文件</label>
    <input type="file" onChange={handleFileChange} />
  </div>
)}

{/* 条件显示：JSON 输入 */}
{configInfo && (
  <div className="mt-4">
    <label>配置信息 (JSON)</label>
    <textarea
      value={configJsonContent}
      onChange={(e) => setConfigJsonContent(e.target.value)}
      className="w-full h-32 font-mono text-sm"
    />
  </div>
)}
```

---

## 6. API 接口汇总

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 上传配置 | POST | `/api/v1/resources/upload/config` | 上传配置文件到 OSS |
| 获取配置 | POST | `/api/v1/resources/config/get` | 影刀获取任务配置 |

---

## 7. 工作流程

### 7.1 用户配置任务

```
用户编辑任务
    │
    ├── 勾选"配置文件"
    │       │
    │       └── 显示上传控件
    │       │
    │       └── 用户选择文件
    │       │
    │       └── 提交时上传到 OSS，保存 URL
    │
    └── 勾选"配置信息"
            │
            └── 显示 JSON 输入框
            │
            └── 用户输入 JSON
            │
            └── 提交时保存 JSON 内容
```

### 7.2 影刀获取配置

```
影刀启动应用
    │
    └── POST /api/v1/resources/config/get
            └── body: {shadow_bot_account, app_name}
    │
    └── 返回配置信息
            └── {config_file, config_file_url, config_info, config_json}
```

---

## 8. 实现优先级

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 数据库字段扩展 | 添加 config_file_path 和 config_json |
| P0 | 后端 OSS 上传接口 | 实现文件上传到 OSS |
| P0 | 影刀获取配置接口 | 供影刀调用获取配置 |
| P1 | 前端配置 UI | 文件上传和 JSON 输入 |
| P2 | 前端编辑回显 | 编辑时显示已有配置 |

---

## 9. 需要修改的文件

| 文件路径 | 修改内容 | 状态 |
|---------|---------|------|
| `backend/app/models/task.py` | 添加 config_file_path, config_json 字段 | ✅ 已完成 |
| `backend/app/schemas/task.py` | 添加对应字段的 Schema | ✅ 已完成 |
| `backend/app/api/v1/resources.py` | 添加 OSS 上传和获取配置接口 | ✅ 已完成 |
| `backend/app/repositories/task_repository.py` | 添加 get_by_account_and_app 方法 | ✅ 已完成 |
| `backend/.env.example` | 添加 OSS 配置项 | ✅ 已完成 |
| `frontend/src/lib/api.ts` | 添加类型定义 | ✅ 已完成 |
| `frontend/src/pages/TaskControl.tsx` | 添加配置 UI 和交互逻辑 | ✅ 已完成 |

---

## 10. 环境变量配置

### 10.1 阿里云 OSS 配置

在 `backend/.env` 文件中配置：

```bash
# ==================== 阿里云 OSS 配置 ====================
# 用于存储配置文件、截图等资源
OSS_ACCESS_KEY_ID=your_access_key_id          # RAM 用户 AccessKey
OSS_ACCESS_KEY_SECRET=your_access_key_secret  # RAM 用户 AccessKey Secret
OSS_BUCKET_NAME=rpa-workbench                  # Bucket 名称
OSS_ENDPOINT=oss-cn-shenzhen.aliyuncs.com      # 地域节点
```

**OSS 配置说明**：
- `OSS_ACCESS_KEY_ID/SECRET`: RAM 用户的 AccessKey，建议只授予 OSS 操作权限
- `OSS_BUCKET_NAME`: 存储桶名称，需要先在阿里云创建
- `OSS_ENDPOINT`: 地域节点，如 `oss-cn-shenzhen.aliyuncs.com`

### 10.2 未配置 OSS 的降级方案

如果未配置 OSS（`OSS_ACCESS_KEY_ID` 为空），系统会自动降级为**本地存储**：
- 配置文件保存在 `backend/static/configs/` 目录
- 通过 `/static/configs/filename` 访问

### 10.3 前端环境变量

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 11. 测试步骤

1. 重启后端服务（加载新代码）
   ```bash
   cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
   ```

2. 重启前端服务
   ```bash
   cd frontend && pnpm dev
   ```

3. 测试流程
   - 访问"任务控制"页面
   - 添加/编辑任务，勾选"配置文件"或"配置信息"
   - 上传文件或输入 JSON 配置
   - 保存后配置会存储到数据库
