# Issue #5 解决方案：云端日志存储

> 创建日期: 2026-01-27
> 状态: 已完成

## 问题描述

> "目前的日志仅为本地用户日志，建议优化为云端存储模式。影刀端在生成日志和截图后，直接上传至服务器或云存储，并将生成的网络 URL 随 Webhook 发送。这样前端只需负责展示网络链接，无需处理本地文件路径，彻底解决路径失效和跨设备访问问题。"

## 解决方案

采用 **云端 OSS + URL 传递** 模式，影刀端上传文件到阿里云 OSS 后，将 URL 通过 Webhook 传递给后端。

### 数据流程

```
影刀 RPA → 上传文件到 OSS → 获取 URL → Webhook 发送 URL → 后端保存 → 前端展示
```

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
  "screenshot_url": "https://your-bucket.oss-cn-shenzhen.aliyuncs.com/screenshots/2026/01/27/abc123.png",
  "log_url": "https://your-bucket.oss-cn-shenzhen.aliyuncs.com/logs/2026/01/27/abc123.txt"
}
```

---

## 实现内容

### 后端修改

| 文件 | 修改 |
|------|------|
| `backend/app/api/v1/webhook.py` | 新增 `screenshot_url` 和 `log_url` 字段 |
| `backend/app/models/execution_log.py` | 新增 `screenshot_path` 和 `log_content` 字段 |
| `backend/app/schemas/execution_log.py` | Schema 添加云端 URL 字段 |

### 前端修改

| 文件 | 修改 |
|------|------|
| `frontend/src/lib/api.ts` | `ExecutionLog` 接口添加 `screenshot_path`、`log_content` 字段 |
| `frontend/src/pages/ExecutionLogs.tsx` | 截图缩略图、放大模态框、日志查看器、下载功能 |

---

## 测试验证

### 测试命令

```bash
curl -X POST "http://localhost:8888/api/v1/webhook/execution-complete" \
  -H "Content-Type: application/json" \
  -d '{
    "shadow_bot_account": "tygj001",
    "app_name": "云仓收藏-test",
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
    "screenshot_url": "https://your-bucket.oss-cn-shenzhen.aliyuncs.com/screenshot.png",
    "log_url": ""
  }'
```

### 预期响应

```json
{
  "success": true,
  "message": "执行日志已记录",
  "log_id": "7debb2b2-b3af-4391-b874-a3af3a89eaa6",
  "screenshot_url": "https://your-bucket.oss-cn-shenzhen.aliyuncs.com/screenshot.png",
  "log_url": null
}
```

---

## OSS 配置要求

### 1. Bucket 设置

- 设置为**公共读**
- 或配置 CORS 允许前端域名访问

### 2. 文件上传设置

- 设置正确的 Content-Type（`image/png`、`image/jpeg`、`text/plain`）
- 文件名使用 UUID 确保唯一性

### 3. CORS 配置（如果需要前端直接访问）

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
```

---

## 影刀端集成示例

### Python 上传脚本

```python
# -*- coding: utf-8 -*-
"""
影刀 RPA 文件上传到阿里云 OSS
"""

import oss2
import uuid
from datetime import datetime

class OSSUploader:
    def __init__(self, access_key_id, access_key_secret, bucket_name, endpoint='oss-cn-shenzhen.aliyuncs.com'):
        self.auth = oss2.Auth(access_key_id, access_key_secret)
        self.bucket = oss2.Bucket(self.auth, endpoint, bucket_name)
        self.bucket_name = bucket_name
        self.endpoint = endpoint

    def upload_screenshot(self, local_path: str) -> str:
        """上传截图，返回公开访问 URL"""
        ext = '.png' if local_path.endswith('.png') else '.jpg'
        date_str = datetime.now().strftime("%Y/%m/%d")
        object_name = f"screenshots/{date_str}/{uuid.uuid4()}{ext}"

        self.bucket.put_object_from_file(object_name, local_path)
        return f"https://{self.bucket_name}.{self.endpoint}/{object_name}"

    def upload_log(self, local_path: str) -> str:
        """上传日志文件，返回公开访问 URL"""
        date_str = datetime.now().strftime("%Y/%m/%d")
        object_name = f"logs/{date_str}/{uuid.uuid4()}.txt"

        self.bucket.put_object_from_file(object_name, local_path)
        return f"https://{self.bucket_name}.{self.endpoint}/{object_name}"


# 使用示例
if __name__ == "__main__":
    uploader = OSSUploader(
        access_key_id="your-access-key-id",
        access_key_secret="your-access-key-secret",
        bucket_name="your-bucket-name"
    )

    screenshot_url = uploader.upload_screenshot("screenshot.png")
    log_url = uploader.upload_log("execution.log")

    print(f"截图 URL: {screenshot_url}")
    print(f"日志 URL: {log_url}")
```

---

## 优势

1. **跨设备访问**：前端无需处理本地路径，直接访问云端 URL
2. **解决路径失效**：云端 URL 永久有效，不受本地文件影响
3. **性能优化**：数据库只存储 URL，查询性能更好
4. **扩展性强**：可轻松迁移到其他云存储服务
5. **备份简单**：云存储自动备份，无需额外操作

---

## 相关文档

- [截图存储设计](../doc/screenshot_storage_design.md)
- [任务进度](../doc/TASKS_PROGRESS.md)
- [云端日志存储技术方案](./rob-issue4.md)
