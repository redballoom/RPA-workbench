# 前端接口修改 - README

> 最后更新: 2026-01-27

## 📋 项目概述

本项目已完成从前端localStorage到真实API的完整迁移，所有接口与后端API文档 `/doc/new_api.md` 保持一致。

## 🚀 快速开始

### 1. 安装依赖
```bash
cd frontend
pnpm install
```

### 2. 配置环境变量
创建 `.env` 文件：
```bash
VITE_API_BASE_URL=http://localhost:8888/api/v1
```

### 3. 启动开发服务器
```bash
pnpm dev
```

访问：http://localhost:3000

## 📁 文件结构

```
frontend/
├── src/
│   ├── lib/
│   │   └── api.ts                    # ✅ 统一API客户端
│   ├── pages/
│   │   ├── AccountManagement.tsx     # ✅ 账号管理
│   │   ├── TaskControl.tsx            # ✅ 任务控制
│   │   ├── Dashboard.tsx              # ✅ 仪表盘
│   │   └── ExecutionLogs.tsx          # ✅ 执行日志 + 截图/日志展示
│   └── components/
│       └── Sidebar.tsx               # 侧边栏
├── .env                              # ✅ 环境配置
└── README.md                          # 本文件
```

## 🔑 核心变更

### 1. 字段命名规范
统一使用 **snake_case**：
- `shadowBotAccount` → `shadow_bot_account`
- `hostIp` → `host_ip`
- `taskName` → `task_name`
- `appName` → `app_name`
- 等等...

### 2. API客户端
- 文件：`src/lib/api.ts`
- 功能：15个API端点完整封装
- 特性：类型安全、错误处理、请求拦截

### 3. 页面修改
| 页面 | 状态 | 功能 |
|------|------|------|
| 账号管理 | ✅ 完成 | CRUD、搜索、分页 |
| 任务控制 | ✅ 完成 | CRUD、启动/停止、搜索 |
| 仪表盘 | ✅ 完成 | 统计、图表、实时更新 |
| 执行日志 | ✅ 完成 | 搜索、筛选、导出、截图展示、日志查看 |

### 4. 截图和日志展示 (2026-01-27 新增)
| 功能 | 状态 | 说明 |
|------|------|------|
| 截图缩略图 | ✅ 完成 | 表格中显示 40x40px 缩略图 |
| 截图放大模态框 | ✅ 完成 | 支持 25%-300% 缩放 |
| 日志内容查看 | ✅ 完成 | 从 URL 加载日志内容 |
| 截图下载 | ✅ 完成 | 支持云端 URL 和本地路径 |
| 日志复制/下载 | ✅ 完成 | 支持从 URL 加载并下载 |
| SSE 实时更新 | ✅ 完成 | 新日志自动刷新 |

### 5. 云端资源 URL 处理

```typescript
// src/lib/api.ts

// ExecutionLog 接口新增字段
interface ExecutionLog {
  // ... 现有字段
  screenshot_path?: string | null;  // 截图 URL 或本地路径
  log_content?: string | null;      // 日志 URL 或本地内容
}

// 获取完整 URL（支持云端和本地）
export function getResourceUrl(path?: string | null): string {
  if (!path) return '';
  // 云端 URL 直接返回
  if (path.startsWith('http')) return path;
  // 本地路径添加服务器地址
  return path.startsWith('/') ? `http://localhost:8888${path}` : path;
}
```

## 📚 文档

- [FRONTEND_API_MIGRATION.md](FRONTEND_API_MIGRATION.md) - 详细修改说明
- [FRONTEND_CHANGES_SUMMARY.md](FRONTEND_CHANGES_SUMMARY.md) - 修改总结
- [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) - 验证指南

## ⚠️ 重要提醒

### 1. 必须启动后端服务
```bash
cd backend
uvicorn app.main:app --reload --port 8888
```

### 2. 环境变量配置
确保 `.env` 文件存在且配置正确：
```bash
VITE_API_BASE_URL=http://localhost:8888/api/v1
```

### 3. 字段命名
所有API调用必须使用snake_case，**禁止使用camelCase**！

## ✅ 验收标准

- [x] 所有页面从localStorage迁移到API
- [x] 字段命名完全符合snake_case规范
- [x] 错误处理完善
- [x] 加载状态正确显示
- [x] 搜索/筛选功能正常
- [x] 分页功能正常
- [x] 导出功能正常
- [x] 启动/停止任务功能正常
- [x] 创建/编辑/删除功能正常
- [x] 仪表盘数据实时更新
- [x] 图表正确显示
- [x] 截图缩略图展示
- [x] 截图放大模态框
- [x] 日志内容查看器
- [x] 资源下载功能
- [x] SSE 实时更新
- [x] 无TypeScript类型错误

## 🐛 故障排除

### 问题：页面显示加载中
**解决**：检查后端服务是否启动

### 问题：请求返回401/403
**解决**：检查CORS配置

### 问题：字段名错误
**解决**：确认使用snake_case而非camelCase

### 问题：截图无法显示
**解决**：检查 `screenshot_path` 是否为有效 URL，并确认 OSS 配置正确

## 📞 支持

如有问题，请参考：
1. 验证指南：[VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)
2. API文档：`/doc/new_api.md`
3. 测试报告：`/doc/api-test-results.md`
4. 截图存储设计：`/doc/screenshot_storage_design.md`

---

**状态**：✅ 已完成
**最后更新**：2026-01-27 (新增截图和日志展示功能)
