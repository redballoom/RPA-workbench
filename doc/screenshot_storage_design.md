# 截图与日志存储方案设计

> 最后更新: 2026-01-27

## 背景

影刀执行完成后，webhook 需要传递：
- 截图图片
- 详细日志文本

当前实现支持两种方式：
1. **云端 OSS 存储**（推荐）：影刀上传到阿里云 OSS 后传递 URL
2. **本地文件系统**（兼容）：Base64 编码传入，后端保存到本地

---

## 方案对比

### 方案 A：SQLite 存储 Base64

直接将 Base64 编码的图片/文本存入 SQLite BLOB 字段。

| 指标 | 评估 |
|------|------|
| 实现复杂度 | 低 |
| 5万张图片可行性 | ⚠️ 不推荐（数据库膨胀到 GB 级） |
| 性能 | 差（每次查询都读取大字段） |
| 备份 | 困难（全量备份） |

### 方案 B：本地文件系统（兼容）

数据库存储路径，文件存储在本地文件系统。

```
后端目录结构:
backend/
└── app/
    └── static/                    # FastAPI 静态文件目录
        └── uploads/
            ├── screenshots/       # 截图文件
            └── logs/              # 详细日志文件

访问 URL:
http://localhost:8888/static/uploads/screenshots/[uuid].jpg
```

| 指标 | 评估 |
|------|------|
| 实现复杂度 | 低 |
| 5万张图片可行性 | ✅ 轻松胜任 |
| 性能 | 优（数据库只存路径） |
| 备份 | 优（文件/数据库独立备份） |
| 可扩展性 | 优（可迁移到对象存储） |

### 方案 C：对象存储 OSS/S3（推荐）

上传到阿里云 OSS 服务。

| 指标 | 评估 |
|------|------|
| 实现复杂度 | 中 |
| 成本 | 中等（存储费用） |
| 可扩展性 | 优（无限扩展） |
| 适用场景 | 生产环境、分布式部署 |

---

## 推荐方案：云端 OSS + URL 传递

### 实现方式

1. 影刀执行任务完成后
2. 先上传截图和日志到阿里云 OSS
3. 获取返回的公开访问 URL
4. 通过 Webhook 将 URL 传递给后端
5. 后端保存 URL 到数据库
6. 前端通过 URL 直接展示

### Webhook 请求格式

```json
{
  "shadow_bot_account": "tygj001",
  "app_name": "云仓收藏",
  "status": "completed",
  "start_time": "2026-01-27 10:00:00",
  "end_time": "2026-01-27 10:30:00",
  "duration_seconds": 1800,
  "result_summary": {
    "total_items": 50,
    "success_items": 48,
    "failed_items": 2
  },
  "log_info": true,
  "screenshot": true,
  "screenshot_url": "https://rps-workbench-oss-images.oss-cn-shenzhen.aliyuncs.com/2026/01/27/screenshot.png",
  "log_url": "https://rps-workbench-oss-images.oss-cn-shenzhen.aliyuncs.com/2026/01/27/log.txt"
}
```

### 数据库设计

```sql
-- 新增字段
ALTER TABLE execution_logs ADD COLUMN screenshot_path VARCHAR(255);
ALTER TABLE execution_logs ADD COLUMN log_content TEXT;
```

### Pydantic Schema

```python
class WebhookExecutionComplete(BaseModel):
    # ... 现有字段
    screenshot_url: Optional[str] = Field(default=None, description="截图云端 OSS URL")
    log_url: Optional[str] = Field(default=None, description="日志云端 OSS URL")
```

### 前端 API 类型

```typescript
interface ExecutionLog {
  // ... 现有字段
  screenshot_path?: string | null;  // 截图 URL
  log_content?: string | null;      // 日志 URL
}

// 获取完整 URL
export function getResourceUrl(path?: string | null): string {
  if (!path) return '';
  // 直接返回（云端 URL）或添加本地地址（本地路径）
  if (path.startsWith('http')) return path;
  return path.startsWith('/') ? `http://localhost:8888${path}` : path;
}
```

---

## 本地存储方案（兼容）

### 文件存储路径

```
static/uploads/
├── screenshots/
│   └── {year}/{month}/{day}/{log_id}.jpg
└── logs/
    └── {year}/{month}/{day}/{log_id}.txt
```

### API 返回格式

```json
{
  "success": true,
  "message": "执行日志已记录",
  "log_id": "abc123-def456",
  "screenshot_url": "http://localhost:8888/static/uploads/screenshots/2026/01/27/abc123.jpg",
  "log_url": "http://localhost:8888/static/uploads/logs/2026/01/27/abc123.txt"
}
```

---

## 依赖修改

### 后端

| 文件 | 修改内容 |
|------|---------|
| `models/execution_log.py` | 新增 `screenshot_path` 和 `log_content` 字段 |
| `schemas/execution_log.py` | Pydantic 模型添加字段 |
| `api/v1/webhook.py` | 支持 `screenshot_url` 和 `log_url` 字段 |
| `main.py` | 静态文件服务（本地存储时需要） |

### 前端

| 文件 | 修改内容 |
|------|---------|
| `lib/api.ts` | `ExecutionLog` 接口添加新字段，`getResourceUrl()` 函数 |
| `pages/ExecutionLogs.tsx` | 显示截图缩略图、日志内容、放大模态框、下载功能 |

---

## 已实施功能

### 后端 (2026-01-27)

- ✅ Webhook 接口支持云端 URL
- ✅ 数据库字段扩展
- ✅ SSE 实时推送

### 前端 (2026-01-27)

- ✅ 截图缩略图展示
- ✅ 截图放大模态框 (25%-300% 缩放)
- ✅ 日志内容查看器
- ✅ 截图下载功能
- ✅ 日志复制/下载功能
- ✅ SSE 实时更新

---

## 实施步骤（云端 OSS 方式）

### 1. 影刀端上传文件到 OSS

```python
# Python 示例
import oss2

def upload_screenshot(file_path: str) -> str:
    """上传截图到 OSS，返回公开访问 URL"""
    auth = oss2.Auth('access_key_id', 'access_key_secret')
    bucket = oss2.Bucket(auth, 'oss-cn-shenzhen.aliyuncs.com', 'your-bucket')

    # 上传文件
    object_name = f"screenshots/2026/01/27/{uuid.uuid4()}.png"
    bucket.put_object_from_file(object_name, file_path)

    # 返回公开访问 URL
    return f"https://your-bucket.oss-cn-shenzhen.aliyuncs.com/{object_name}"
```

### 2. 发送 Webhook

```bash
curl -X POST "http://localhost:8888/api/v1/webhook/execution-complete" \
  -H "Content-Type: application/json" \
  -d '{
    "shadow_bot_account": "tygj001",
    "app_name": "云仓收藏",
    "status": "completed",
    "start_time": "2026-01-27 10:00:00",
    "end_time": "2026-01-27 10:30:00",
    "duration_seconds": 1800,
    "log_info": true,
    "screenshot": true,
    "screenshot_url": "https://your-bucket.oss-cn-shenzhen.aliyuncs.com/screenshot.png",
    "log_url": "https://your-bucket.oss-cn-shenzhen.aliyuncs.com/log.txt"
  }'
```

### 3. OSS 配置

1. 设置 Bucket 为**公共读**
2. 或配置 CORS 允许前端跨域访问
3. 上传时设置正确的 Content-Type

---

## 待确认事项

1. **OSS 配置**：是否需要设置 Referer 防盗链？
2. **图片格式**：是否需要压缩或限制大小？
3. **日志格式**：纯文本还是 JSON？

---

## 参考资料

- [FastAPI 静态文件](https://fastapi.tiangolo.com/tutorial/static-files/)
- [阿里云 OSS Python SDK](https://help.aliyun.com/document_detail/32008.html)
- [OSS CORS 配置](https://help.aliyun.com/document_detail/32084.html)
