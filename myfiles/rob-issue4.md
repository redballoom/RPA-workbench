# 云端日志存储技术方案

## 一、概述

本方案解决 RPA 影刀机器人执行日志的云端存储问题，实现：
- 截图和日志文件直接上传至云存储
- Webhook 仅传输网络 URL
- 前端安全展示网络资源

---

## 二、文件上传实现（Python）

### 2.1 方案一：阿里云 OSS 上传

```python
# -*- coding: utf-8 -*-
"""
影刀 RPA 文件上传模块
支持阿里云 OSS 和通用 HTTP POST 两种方式
"""

import os
import re
import base64
import json
import requests
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path


# ============ 阿里云 OSS 配置 ============
class AliyunOSSUploader:
    """阿里云 OSS 文件上传器"""

    def __init__(
        self,
        access_key_id: str,
        access_key_secret: str,
        bucket_name: str,
        endpoint: str = "oss-cn-hangzhou.aliyuncs.com"
    ):
        """
        初始化 OSS 上传器

        Args:
            access_key_id: 阿里云 AccessKey ID
            access_key_secret: 阿里云 AccessKey Secret
            bucket_name: OSS Bucket 名称
            endpoint: OSS 访问节点
        """
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self.bucket_name = bucket_name
        self.endpoint = endpoint

        # 尝试导入 oss2
        try:
            import oss2
            self.oss2 = oss2
        except ImportError:
            raise ImportError("请安装 oss2: pip install oss2")

    def _normalize_path(self, file_path: str) -> str:
        """
        清理 Windows 路径中的隐藏字符
        常见问题：U+202A (Left-To-Right Embedding), U+202B, U+202C, U+200E (LRM)
        """
        # 移除 Unicode 控制字符
        normalized = re.sub(r'[\u200B-\u200F\u202A-\u202F\u2060-\u206F]', '', file_path)
        # 清理首尾空白
        normalized = normalized.strip()
        # 规范化路径分隔符
        normalized = normalized.replace('\\', '/')
        return normalized

    def _generate_object_name(self, file_path: str, prefix: str = "rpa/logs") -> str:
        """生成 OSS 对象名称"""
        # 获取文件扩展名
        ext = Path(file_path).suffix.lower() or '.bin'

        # 使用时间戳+随机数确保唯一性
        timestamp = datetime.now().strftime("%Y%m%d/%H%M%S")
        import uuid
        unique_id = str(uuid.uuid4())[:8]

        return f"{prefix}/{timestamp}/{unique_id}{ext}"

    def upload_file(
        self,
        local_file_path: str,
        object_name: Optional[str] = None,
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        上传本地文件到 OSS

        Args:
            local_file_path: 本地文件路径
            object_name: OSS 对象名称（可选，自动生成）
            callback_url: 上传完成后的回调地址（可选）

        Returns:
            dict: 包含 success, url, object_name, error 等字段
        """
        try:
            # 1. 清理路径
            clean_path = self._normalize_path(local_file_path)

            # 2. 验证文件存在
            if not os.path.exists(clean_path):
                return {
                    "success": False,
                    "error": f"文件不存在: {clean_path}"
                }

            # 3. 生成对象名称
            if not object_name:
                object_name = self._generate_object_name(clean_path)

            # 4. 构建 OSS URL
            oss_url = f"https://{self.bucket_name}.{self.endpoint}/{object_name}"

            # 5. 使用 STS 模式或直接签名上传（推荐 STS 更安全）
            # 此处演示简单 AccessKey 方式
            auth = oss2.Auth(self.access_key_id, self.access_key_secret)
            bucket = oss2.Bucket(auth, self.endpoint, self.bucket_name)

            # 6. 上传文件
            result = bucket.put_object_from_file(
                object_name,
                clean_path,
                headers={'Content-Type': self._get_content_type(clean_path)}
            )

            if result.status == 200:
                # 7. 如果有回调地址，发送通知
                if callback_url:
                    self._send_callback(callback_url, {
                        "type": "upload_complete",
                        "file_url": oss_url,
                        "object_name": object_name,
                        "local_path": clean_path
                    })

                return {
                    "success": True,
                    "url": oss_url,
                    "object_name": object_name,
                    "local_path": clean_path
                }
            else:
                return {
                    "success": False,
                    "error": f"OSS 上传失败: status={result.status}"
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def upload_base64(
        self,
        base64_data: str,
        extension: str = ".png",
        prefix: str = "rpa/screenshots"
    ) -> Dict[str, Any]:
        """上传 Base64 编码的文件"""
        try:
            # 移除 Base64 前缀（如 data:image/png;base64,）
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]

            # 解码
            file_content = base64.b64decode(base64_data)

            # 生成对象名称
            timestamp = datetime.now().strftime("%Y%m%d/%H%M%S")
            import uuid
            object_name = f"{prefix}/{timestamp}/{uuid.uuid4()[:8]}{extension}"

            # 上传
            auth = oss2.Auth(self.access_key_id, self.access_key_secret)
            bucket = oss2.Bucket(auth, self.endpoint, self.bucket_name)

            result = bucket.put_object(
                object_name,
                file_content,
                headers={'Content-Type': f'image/{extension[1:]}'
                if extension.startswith('.') else 'application/octet-stream'}
            )

            if result.status == 200:
                return {
                    "success": True,
                    "url": f"https://{self.bucket_name}.{self.endpoint}/{object_name}",
                    "object_name": object_name
                }
            else:
                return {
                    "success": False,
                    "error": f"OSS 上传失败: status={result.status}"
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _get_content_type(self, file_path: str) -> str:
        """获取文件 MIME 类型"""
        ext = Path(file_path).suffix.lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.log': 'text/plain',
            '.json': 'application/json',
        }
        return mime_types.get(ext, 'application/octet-stream')

    def _send_callback(self, url: str, data: dict):
        """发送回调通知"""
        try:
            requests.post(url, json=data, timeout=10)
        except Exception as e:
            print(f"回调通知失败: {e}")


# ============ 方案二：通用 HTTP POST 上传 ============
class HTTPUploader:
    """通用 HTTP POST 文件上传器"""

    def __init__(self, upload_url: str, auth_token: Optional[str] = None):
        """
        初始化 HTTP 上传器

        Args:
            upload_url: 上传接口地址
            auth_token: 认证令牌（可选）
        """
        self.upload_url = upload_url
        self.auth_token = auth_token
        self.session = requests.Session()

        if auth_token:
            self.session.headers.update({"Authorization": f"Bearer {auth_token}"})

    def _normalize_path(self, file_path: str) -> str:
        """清理 Windows 路径中的隐藏字符"""
        normalized = re.sub(r'[\u200B-\u200F\u202A-\u202F\u2060-\u206F]', '', file_path)
        normalized = normalized.strip()
        return normalized.replace('\\', '/')

    def upload_file(
        self,
        local_file_path: str,
        extra_fields: Optional[dict] = None
    ) -> Dict[str, Any]:
        """
        通过 HTTP POST 上传文件

        Args:
            local_file_path: 本地文件路径
            extra_fields: 额外表单字段

        Returns:
            dict: 包含 success, url, error 等字段
        """
        try:
            # 1. 清理路径
            clean_path = self._normalize_path(local_file_path)

            # 2. 验证文件存在
            if not os.path.exists(clean_path):
                return {
                    "success": False,
                    "error": f"文件不存在: {clean_path}"
                }

            # 3. 准备表单数据
            files = {
                'file': (
                    os.path.basename(clean_path),
                    open(clean_path, 'rb'),
                    self._get_mime_type(clean_path)
                )
            }

            data = extra_fields or {}

            # 4. 发送请求
            response = self.session.post(
                self.upload_url,
                files=files,
                data=data,
                timeout=120  # 2分钟超时
            )

            # 5. 解析响应
            if response.status_code == 200:
                try:
                    result = response.json()
                    return {
                        "success": True,
                        "url": result.get('url') or result.get('data', {}).get('url'),
                        "object_name": result.get('object_name') or result.get('data', {}).get('object_name'),
                        "full_response": result
                    }
                except json.JSONDecodeError:
                    return {
                        "success": True,
                        "url": response.text.strip()
                    }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text[:200]}"
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "上传超时（超过120秒）"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def upload_base64(
        self,
        base64_data: str,
        filename: str = "file.png",
        extra_fields: Optional[dict] = None
    ) -> Dict[str, Any]:
        """上传 Base64 编码的文件"""
        try:
            # 移除 Base64 前缀
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]

            file_content = base64.b64decode(base64_data)

            files = {
                'file': (filename, file_content, self._get_mime_type(filename))
            }

            data = extra_fields or {}

            response = self.session.post(
                self.upload_url,
                files=files,
                data=data,
                timeout=120
            )

            if response.status_code == 200:
                try:
                    result = response.json()
                    return {
                        "success": True,
                        "url": result.get('url') or result.get('data', {}).get('url')
                    }
                except json.JSONDecodeError:
                    return {
                        "success": True,
                        "url": response.text.strip()
                    }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text[:200]}"
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _get_mime_type(self, filename: str) -> str:
        """获取文件 MIME 类型"""
        ext = Path(filename).suffix.lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
        }
        return mime_types.get(ext, 'application/octet-stream')


# ============ 影刀集成示例 ============
def upload_screenshot_and_log(
    screenshot_path: str,
    log_path: str,
    config: dict
) -> dict:
    """
    影刀 RPA 调用示例：上传截图和日志文件

    Args:
        screenshot_path: 截图文件路径
        log_path: 日志文件路径
        config: 配置字典（包含上传方式和认证信息）

    Returns:
        dict: 包含 screenshot_url 和 log_url
    """
    result = {
        "screenshot_url": None,
        "log_url": None,
        "success": True,
        "errors": []
    }

    # 选择上传方式
    upload_type = config.get('type', 'oss')  # 'oss' 或 'http'

    if upload_type == 'oss':
        uploader = AliyunOSSUploader(
            access_key_id=config['access_key_id'],
            access_key_secret=config['access_key_secret'],
            bucket_name=config['bucket_name'],
            endpoint=config.get('endpoint', 'oss-cn-hangzhou.aliyuncs.com')
        )
    else:
        uploader = HTTPUploader(
            upload_url=config['upload_url'],
            auth_token=config.get('auth_token')
        )

    # 上传截图
    if screenshot_path and os.path.exists(screenshot_path):
        upload_result = uploader.upload_file(screenshot_path, {"type": "screenshot"})
        if upload_result['success']:
            result['screenshot_url'] = upload_result['url']
        else:
            result['success'] = False
            result['errors'].append(f"截图上传失败: {upload_result['error']}")

    # 上传日志
    if log_path and os.path.exists(log_path):
        upload_result = uploader.upload_file(log_path, {"type": "log"})
        if upload_result['success']:
            result['log_url'] = upload_result['url']
        else:
            result['success'] = False
            result['errors'].append(f"日志上传失败: {upload_result['error']}")

    return result


# ============ 使用示例 ============
if __name__ == "__main__":
    # 阿里云 OSS 方式
    oss_config = {
        "type": "oss",
        "access_key_id": "your-access-key-id",
        "access_key_secret": "your-access-key-secret",
        "bucket_name": "your-bucket-name",
        "endpoint": "oss-cn-hangzhou.aliyuncs.com"
    }

    # HTTP POST 方式
    http_config = {
        "type": "http",
        "upload_url": "https://your-server.com/api/upload",
        "auth_token": "your-auth-token"
    }

    # 影刀调用示例
    result = upload_screenshot_and_log(
        screenshot_path=r"C:\Users\Robot\Documents\screenshot_20260127.png",
        log_path=r"C:\Users\Robot\Documents\execution_20260127.log",
        config=oss_config
    )

    print(json.dumps(result, ensure_ascii=False, indent=2))
```

### 2.2 安装依赖

```bash
# 阿里云 OSS 方式
pip install oss2 requests

# HTTP 方式（只需 requests）
pip install requests
```

---

## 三、数据流设计

### 3.1 影刀任务执行流程

```
+-----------------+     +-----------------+     +-----------------+
|   影刀 RPA      |     |   文件上传      |     |   Webhook 通知  |
|   执行任务      |---->|   (OSS/HTTP)    |---->|   上报 URL      |
+-----------------+     +-----------------+     +-----------------+
        |                      |                       |
        | 生成截图/日志         | 返回网络 URL          |
        ▼                      ▼                       ▼
```

### 3.2 Webhook JSON 数据包构造

影刀完成任务后，发送的 Webhook 数据包应包含：

```json
{
  "event_type": "task_completed",
  "timestamp": "2026-01-27T10:30:00+08:00",
  "task_info": {
    "task_id": "task_12345",
    "task_name": "数据采集任务",
    "shadow_bot_account": "robot@company.com",
    "host_ip": "192.168.1.100",
    "app_name": "数据采集程序"
  },
  "execution_result": {
    "status": "completed",
    "start_time": "2026-01-27T10:25:00+08:00",
    "end_time": "2026-01-27T10:30:00+08:00",
    "duration_seconds": 300,
    "error_message": null
  },
  "resources": {
    "screenshot": {
      "url": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/rpa/screenshots/2026/01/27/abc123.png",
      "file_size": 245760,
      "content_type": "image/png",
      "width": 1920,
      "height": 1080
    },
    "log": {
      "url": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/rpa/logs/2026/01/27/abc123.txt",
      "file_size": 8192,
      "content_type": "text/plain",
      "encoding": "utf-8"
    }
  },
  "metadata": {
    "batch_id": "batch_001",
    "custom_fields": {
      "department": "财务部",
      "project": "报表自动化"
    }
  }
}
```

### 3.3 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event_type` | string | 是 | 事件类型：task_started / task_completed / task_failed |
| `timestamp` | string | 是 | ISO 8601 时间戳 |
| `task_info` | object | 是 | 任务基本信息 |
| `execution_result` | object | 是 | 执行结果 |
| `resources.screenshot.url` | string | 否 | 截图网络 URL |
| `resources.log.url` | string | 否 | 日志网络 URL |
| `metadata` | object | 否 | 自定义元数据 |

### 3.4 影刀端集成代码示例

```python
# -*- coding: utf-8 -*-
"""
影刀 RPA Webhook 通知模块
"""

import requests
import json
from datetime import datetime
from typing import Optional, Dict, Any


class WebhookSender:
    """Webhook 通知发送器"""

    def __init__(self, webhook_url: str, secret_key: Optional[str] = None):
        """
        初始化

        Args:
            webhook_url: Webhook 地址
            secret_key: 签名密钥（用于 HMAC 签名验证）
        """
        self.webhook_url = webhook_url
        self.secret_key = secret_key

    def send_task_completed(
        self,
        task_id: str,
        task_name: str,
        screenshot_url: Optional[str] = None,
        log_url: Optional[str] = None,
        **extra_fields
    ) -> Dict[str, Any]:
        """
        发送任务完成通知

        Args:
            task_id: 任务 ID
            task_name: 任务名称
            screenshot_url: 截图 URL
            log_url: 日志 URL
            **extra_fields: 额外字段

        Returns:
            dict: API 响应
        """
        payload = {
            "event_type": "task_completed",
            "timestamp": datetime.now().isoformat(),
            "task_info": {
                "task_id": task_id,
                "task_name": task_name,
                "shadow_bot_account": self._get_bot_account(),
                "host_ip": self._get_host_ip(),
                "app_name": task_name
            },
            "execution_result": {
                "status": "completed",
                "start_time": extra_fields.get('start_time', ''),
                "end_time": datetime.now().isoformat(),
                "duration_seconds": extra_fields.get('duration', 0)
            },
            "resources": {},
            "metadata": extra_fields.get('metadata', {})
        }

        # 添加截图 URL
        if screenshot_url:
            payload["resources"]["screenshot"] = {"url": screenshot_url}

        # 添加日志 URL
        if log_url:
            payload["resources"]["log"] = {"url": log_url}

        return self._send(payload)

    def send_task_failed(
        self,
        task_id: str,
        task_name: str,
        error_message: str,
        **extra_fields
    ) -> Dict[str, Any]:
        """发送任务失败通知"""
        payload = {
            "event_type": "task_failed",
            "timestamp": datetime.now().isoformat(),
            "task_info": {
                "task_id": task_id,
                "task_name": task_name,
                "shadow_bot_account": self._get_bot_account(),
                "host_ip": self._get_host_ip(),
                "app_name": task_name
            },
            "execution_result": {
                "status": "failed",
                "start_time": extra_fields.get('start_time', ''),
                "end_time": datetime.now().isoformat(),
                "error_message": error_message
            },
            "resources": {},
            "metadata": extra_fields.get('metadata', {})
        }

        return self._send(payload)

    def _send(self, payload: dict) -> Dict[str, Any]:
        """发送请求"""
        try:
            # 如果有签名密钥，添加签名
            if self.secret_key:
                import hashlib
                import hmac
                import base64

                body = json.dumps(payload, ensure_ascii=False)
                signature = base64.b64encode(
                    hmac.new(
                        self.secret_key.encode(),
                        body.encode(),
                        hashlib.sha256
                    ).digest()
                ).decode()
                headers = {"X-Signature": f"SHA256={signature}"}
            else:
                headers = {}

            response = requests.post(
                self.webhook_url,
                json=payload,
                headers=headers,
                timeout=30
            )

            return {
                "success": response.status_code in (200, 201, 202),
                "status_code": response.status_code,
                "response": response.text
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _get_bot_account(self) -> str:
        """获取影刀账号"""
        # 影刀内置变量或配置
        return "__BOT_ACCOUNT__"

    def _get_host_ip(self) -> str:
        """获取主机 IP"""
        import socket
        try:
            return socket.gethostbyname(socket.gethostname())
        except:
            return "127.0.0.1"


# ============ 影刀主流程集成 ============
def main_workflow():
    """影刀 RPA 主流程"""

    # 1. 配置
    webhook_url = "https://your-server.com/api/webhook"
    oss_config = {
        "type": "oss",
        "access_key_id": "your-key",
        "access_key_secret": "your-secret",
        "bucket_name": "your-bucket"
    }

    # 2. 初始化组件
    uploader = AliyunOSSUploader(**oss_config)
    webhook = WebhookSender(webhook_url)

    start_time = datetime.now().isoformat()

    try:
        # 3. 执行任务
        print("开始执行任务...")
        # ... 影刀任务代码 ...

        # 4. 生成截图和日志
        screenshot_path = r"C:\output\screenshot.png"
        log_path = r"C:\output\execution.log"

        # 5. 上传到云端
        screenshot_result = uploader.upload_file(screenshot_path)
        log_result = uploader.upload_file(log_path)

        screenshot_url = screenshot_result.get('url') if screenshot_result['success'] else None
        log_url = log_result.get('url') if log_result['success'] else None

        # 6. 发送 Webhook
        webhook.send_task_completed(
            task_id="task_001",
            task_name="数据采集任务",
            screenshot_url=screenshot_url,
            log_url=log_url,
            start_time=start_time,
            duration=300,
            metadata={"batch_id": "001"}
        )

        print("任务完成，上传成功")

    except Exception as e:
        webhook.send_task_failed(
            task_id="task_001",
            task_name="数据采集任务",
            error_message=str(e),
            start_time=start_time
        )
        print(f"任务失败: {e}")


if __name__ == "__main__":
    main_workflow()
```

---

## 四、前端展示逻辑

### 4.1 资源加载安全策略

```typescript
// 前端 API 类型定义
interface Resource {
  url: string;
  file_size?: number;
  content_type?: string;
  width?: number;
  height?: number;
  encoding?: string;
}

interface ExecutionLog {
  id: string;
  text: string;
  app_name: string;
  shadow_bot_account: string;
  status: 'completed' | 'failed' | 'running';
  start_time: string;
  end_time: string;
  duration: number;
  host_ip: string;
  screenshot?: boolean;
  log_info?: boolean;
  // 云端资源 URL
  screenshot_url?: string | null;
  log_url?: string | null;
  // 本地资源（兼容旧数据）
  screenshot_path?: string | null;
  log_content?: string | null;
}
```

### 4.2 资源 URL 处理

```typescript
// 资源 URL 工厂函数
function getResourceUrl(log: ExecutionLog): {
  screenshotUrl: string | null;
  logUrl: string | null;
} {
  // 优先使用云端 URL
  if (log.screenshot_url) {
    return { screenshotUrl: log.screenshot_url, logUrl: log.log_url || null };
  }

  // 降级到本地路径（用于测试）
  if (log.screenshot_path) {
    return {
      screenshotUrl: `http://localhost:8888${log.screenshot_path}`,
      logUrl: log.log_content ? `http://localhost:8888/static/logs/${log.id}.txt` : null
    };
  }

  return { screenshotUrl: null, logUrl: null };
}
```

### 4.3 图片防盗链处理

```typescript
// 方式一：配置 CORS 允许所有来源（推荐）
// OSS 控制台设置 CORS：
// AllowedOrigin: *
// AllowedMethod: GET, HEAD
// AllowedHeader: *
// ExposeHeader: ETag, x-oss-request-id

// 方式二：使用签名 URL（更安全）
async function getSignedUrl(publicUrl: string): Promise<string> {
  // 从后端获取签名 URL
  const response = await fetch(`/api/resources/sign?url=${encodeURIComponent(publicUrl)}`);
  const data = await response.json();
  return data.signed_url;
}

// 方式三：配置 Referer 白名单
// OSS 控制台设置 Referer：
// Referer: https://your-domain.com
// Allow empty Referer: false
```

### 4.4 图片展示组件

```tsx
import { useState } from 'react';
import { ZoomIn, Download, X } from 'lucide-react';

interface ScreenshotViewerProps {
  url: string | null;
  alt: string;
}

export function ScreenshotViewer({ url, alt }: ScreenshotViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!url) return <span className="text-gray-400">无截图</span>;

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `screenshot_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  return (
    <>
      {/* 缩略图 */}
      <button
        onClick={() => setShowModal(true)}
        className="relative group w-10 h-10 rounded overflow-hidden"
      >
        <img
          src={url}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onLoad={() => setLoading(false)}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <ZoomIn className="w-5 h-5 text-white" />
        </div>
      </button>

      {/* 放大模态框 */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* 工具栏 */}
          <div className="flex justify-between items-center p-4 text-white">
            <span className="text-sm">{Math.round(zoom * 100)}%</span>
            <div className="flex gap-2">
              <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}>-</button>
              <button onClick={() => setZoom(1)}>100%</button>
              <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>+</button>
              <button onClick={handleDownload}><Download className="w-5 h-5" /></button>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* 图片容器 */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={url}
              alt={alt}
              style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
```

### 4.5 PDF/日志预览

```tsx
// 日志内容预览组件
export function LogViewer({ url, content }: { url?: string | null; content?: string | null }) {
  const [logText, setLogText] = useState<string>('');

  // 优先显示本地内容，否则从 URL 加载
  useEffect(() => {
    if (content) {
      setLogText(content);
    } else if (url) {
      fetch(url)
        .then(r => r.text())
        .then(text => setLogText(text))
        .catch(err => setLogText('加载失败'));
    }
  }, [content, url]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(logText);
    alert('已复制到剪贴板');
  };

  return (
    <div className="bg-gray-100 rounded p-4">
      <div className="flex justify-end gap-2 mb-2">
        <button onClick={copyToClipboard}>复制</button>
        <a href={url || '#'} download>下载</a>
      </div>
      <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-96">
        {logText || '暂无日志'}
      </pre>
    </div>
  );
}

// PDF 预览（使用 iframe 或 PDF.js）
export function PdfViewer({ url }: { url: string }) {
  return (
    <iframe
      src={`https://r.jina.ai/http://${url}`}
      className="w-full h-96 border-0"
      title="PDF Preview"
    />
  );
  // 或者使用 Google Docs Viewer:
  // src={`https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`}
}
```

### 4.6 跨域资源加载注意事项

```typescript
// 1. 服务器响应头配置（后端需要设置）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 或特定域名
  'Access-Control-Allow-Methods': 'GET, HEAD',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
};

// 2. 图片跨域设置
<img
  src={url}
  crossOrigin="anonymous"  // 需要服务器支持 CORS
  onLoad={() => {}}
/>

// 3. 使用代理（如果资源服务器不支持 CORS）
const proxyUrl = `/api/proxy?url=${encodeURIComponent(originalUrl)}`;
```

---

## 五、完整集成流程

```
+-----------------------------------------------------------------+
|                        影刀 RPA 端                              |
+-----------------------------------------------------------------+
|  1. 执行自动化任务                                               |
|  2. 生成截图 (screenshot.png)                                   |
|  3. 生成日志 (execution.log)                                    |
|  4. 上传到云存储 (OSS/HTTP)                                     |
|  5. 获取返回的网络 URL                                          |
|  6. 构建 Webhook JSON 数据包                                    |
|  7. 发送到 RPA Workbench                                        |
+-----------------------------------------------------------------+
                              |
                              ▼
+-----------------------------------------------------------------+
|                     RPA Workbench 后端                          |
+-----------------------------------------------------------------+
|  1. 接收 Webhook 请求                                            |
|  2. 解析 JSON 数据包                                             |
|  3. 保存日志记录（包含网络 URL）                                  |
|  4. 通过 SSE 推送实时通知到前端                                   |
+-----------------------------------------------------------------+
                              |
                              ▼
+-----------------------------------------------------------------+
|                        前端展示                                  |
+-----------------------------------------------------------------+
|  1. 接收 SSE 实时更新                                            |
|  2. 刷新日志列表                                                 |
|  3. 点击截图缩略图 → 打开放大模态框                               |
|  4. 点击日志图标 → 打开日志查看器                                 |
|  5. 图片支持缩放 (25%-300%)                                      |
|  6. 支持下载和复制功能                                           |
+-----------------------------------------------------------------+
```

---

## 六、部署配置

### 6.1 阿里云 OSS 权限配置

```json
// RAM 权限策略
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject"
      ],
      "Resource": [
        "acs:oss:*:*:your-bucket-name/rpa/*"
      ]
    }
  ]
}
```

### 6.2 CORS 配置

```xml
<!-- OSS CORS 配置 -->
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

### 6.3 推荐配置组合

| 场景 | 存储方案 | 访问控制 | 前端处理 |
|------|----------|----------|----------|
| 内部使用 | 阿里云 OSS | 私有读写 + 签名 URL | 后端代理获取签名 URL |
| 对外展示 | 阿里云 OSS | 公共读取 | 直接使用公开 URL |
| 敏感数据 | 私有对象存储 | 私有 + 临时 Token | 后端代理转发 |
