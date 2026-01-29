# Issue #6 问题分析报告

## 问题描述

用户通过 webhook 接口上传日志文件（`log_url`）后：
- 前端点击查看日志内容显示"加载日志内容失败"
- 日志文件下载功能无法正常工作
- 截图功能正常（可以预览和下载）

## 问题原因分析

### 核心问题：CORS 跨域限制

**根本原因**：前端直接请求阿里云 OSS 资源时，被浏览器 CORS 策略阻止。

### 详细分析

1. **后端已有解决方案**：
   - `backend/app/api/v1/resources.py` 已实现资源代理接口
   - `/api/v1/resources/proxy?url=OSS_URL` - 代理请求外部资源
   - `/api/v1/resources/proxy/download?url=OSS_URL` - 代理下载外部资源

2. **前端未使用代理接口**：
   - `ExecutionLogs.tsx` 的 `openLogModal` 函数直接请求 `log.log_content`：
   ```typescript
   const response = await fetch(log.log_content);  // 直接请求 OSS URL
   ```

   - `downloadLogFile` 函数同样直接请求 OSS URL：
   ```typescript
   const response = await fetch(selectedLog.log_content);
   ```

3. **CORS 错误表现**：
   - 浏览器控制台会出现类似错误：
   ```
   Access to fetch at 'https://rpa-workbench.oss-cn-shenzhen.aliyuncs.com/...'
   from origin 'http://localhost:3000' has been blocked by CORS policy
   ```
   - `fetch` 请求被浏览器阻断，抛出 `TypeError: Failed to fetch`
   - 前端 catch 块捕获错误，显示"加载日志内容失败"

4. **截图功能正常的原因**：
   - 截图使用 `<img>` 标签直接显示，`<img>` 标签不受 CORS 限制
   - 但如果截图需要通过 fetch 获取（如下载），同样会遇到 CORS 问题

### 数据流验证

```
curl 测试 OSS URL → HTTP 200 ✓ (后端直接请求正常)
浏览器 fetch OSS URL → CORS 错误 ✗ (浏览器被限制)
```

## 解决方案

### 方案一：修改前端使用资源代理接口（推荐）

修改 `frontend/src/lib/api.ts` 的 `getResourceUrl` 函数：

```typescript
// 获取资源完整 URL（支持本地路径和云端 URL）
export function getResourceUrl(path?: string | null): string {
  if (!path) return '';

  // 如果是完整的云端 URL（http/https），使用后端代理
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return `${API_BASE_URL}/resources/proxy?url=${encodeURIComponent(path)}`;
  }

  // 如果是本地路径，添加本地服务器地址
  return path.startsWith('/') ? `http://localhost:8000${path}` : path;
}
```

同时修改 `ExecutionLogs.tsx` 中的下载函数：

```typescript
// 下载日志文件
const downloadLogFile = async () => {
  if (!selectedLog?.log_content) {
    toast.error("日志内容为空");
    return;
  }

  try {
    // 使用资源代理下载
    const proxyUrl = getResourceUrl(selectedLog.log_content);
    const response = await fetch(proxyUrl);
    const blob = await response.blob();
    // ... 下载逻辑
  } catch {
    toast.error("日志文件下载失败");
  }
};
```

### 方案二：配置阿里云 OSS CORS

在阿里云 OSS 控制台配置 CORS 规则：
- **来源**：前端域名（如 `http://localhost:3000`）
- **方法**：GET, POST, PUT, DELETE
- **响应头**：Access-Control-Allow-Origin, Content-Type 等
- **缓存时间**：根据需要设置

优点：OSS 直接响应，无需后端代理
缺点：需要配置 OSS，且生产环境需要配置多个域名

### 方案三：修改后端返回数据格式

后端在返回日志列表时，直接将 OSS URL 替换为代理 URL：
```python
# 在 logs 端点返回数据前
if log.log_content and log.log_content.startswith('http'):
    log.log_content = f"/api/v1/resources/proxy?url={log.log_content}"
```

## 推荐方案

**推荐方案一**：修改前端 `getResourceUrl` 函数

优点：
- 改动最小，只需修改一个函数
- 利用现有的后端代理接口
- 无需修改 OSS 配置
- 同时解决预览和下载问题

## 待用户决定

是否需要实施修复方案？

- **是**：修改前端代码，使用资源代理接口
- **否**：保持现状（截图正常，日志预览和下载有 CORS 问题）
