# 📚 RPA Workbench - 文档索引

## 🎯 项目概述

RPA Workbench 是一个机器人流程自动化（RPA）管理平台，包含完整的前端和后端系统。

## 📂 项目结构

```
RPA-workbench/
├── frontend/                 # 前端（React + TypeScript + Vite）
│   ├── src/
│   │   ├── pages/           # 4个主要功能页面
│   │   ├── lib/             # API客户端和工具
│   │   └── components/      # 公共组件
│   ├── .env                 # 环境配置
│   ├── README.md            # 前端说明
│   └── 文档...
│
├── backend/                  # 后端（FastAPI + SQLite）
│   ├── app/
│   │   ├── api/             # API路由
│   │   ├── models/          # 数据模型
│   │   ├── services/         # 业务逻辑
│   │   └── repositories/    # 数据访问层
│   └── app.db               # SQLite数据库
│
└── doc/                     # 项目文档
    ├── new_api.md           # 最新API接口文档
    ├── api-test-results.md  # API测试报告
    └── backend-milestone-fixes.md  # 后端修复记录
```

## 📖 文档分类

### 🔧 技术文档

#### 前端文档
| 文档 | 说明 | 路径 |
|------|------|------|
| 前端README | 快速开始和概述 | `frontend/README.md` |
| 接口迁移说明 | 详细的修改过程 | `frontend/FRONTEND_API_MIGRATION.md` |
| 修改总结 | 完整的修改清单 | `frontend/FRONTEND_CHANGES_SUMMARY.md` |
| 验证指南 | 如何验证修改是否成功 | `frontend/VERIFICATION_GUIDE.md` |

#### 后端文档
| 文档 | 说明 | 路径 |
|------|------|------|
| API接口文档 | 15个API端点完整说明 | `doc/new_api.md` |
| API测试报告 | 后端API测试结果 | `doc/api-test-results.md` |
| 里程碑修复记录 | 后端问题修复过程 | `doc/backend-milestone-fixes.md` |

## 🚀 快速导航

### 1. 开发者入口
**您是前端开发者？**
- → 阅读：`frontend/README.md`
- → 参考：`frontend/VERIFICATION_GUIDE.md`
- → API文档：`doc/new_api.md`

**您是后端开发者？**
- → API文档：`doc/new_api.md`
- → 测试报告：`doc/api-test-results.md`
- → 修复记录：`doc/backend-milestone-fixes.md`

**您是测试人员？**
- → 验证指南：`frontend/VERIFICATION_GUIDE.md`
- → API测试：`doc/api-test-results.md`

### 2. 关键文件

#### 前端关键文件
- `frontend/src/lib/api.ts` - 统一API客户端
- `frontend/.env` - 环境配置
- `frontend/src/pages/AccountManagement.tsx` - 账号管理
- `frontend/src/pages/TaskControl.tsx` - 任务控制
- `frontend/src/pages/Dashboard.tsx` - 仪表盘
- `frontend/src/pages/ExecutionLogs.tsx` - 执行日志

#### 后端关键文件
- `backend/app/main.py` - FastAPI应用入口
- `backend/app.db` - SQLite数据库
- `doc/new_api.md` - API规范

### 3. 快速任务

**启动项目**
```bash
# 终端1：后端
cd backend
uvicorn app.main:app --reload --port 8888

# 终端2：前端
cd frontend
pnpm install
pnpm dev
```

**访问应用**
- 前端：http://localhost:3000
- API文档：http://localhost:8888/docs

**API测试**
```bash
# 获取账号列表
curl http://localhost:8888/api/v1/accounts

# 创建任务
curl -X POST http://localhost:8888/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"task_name":"test","shadow_bot_account":"bot1","host_ip":"192.168.1.1","app_name":"test_app"}'
```

## 🔍 常见问题

### Q: 前端页面空白？
**A**: 检查后端服务是否启动在 http://localhost:8888

### Q: API请求失败？
**A**: 
1. 检查 `.env` 文件配置
2. 确认后端CORS设置
3. 查看Network面板错误信息

### Q: 字段名错误？
**A**: 确认使用snake_case（如 `shadow_bot_account`），而非camelCase（如 `shadowBotAccount`）

### Q: 如何导出日志？
**A**: 访问执行日志页面，点击"导出"按钮

### Q: 如何启动/停止任务？
**A**: 在任务控制页面，点击任务行的播放/停止按钮

## 📊 项目状态

### 前端状态
- [x] API客户端完成
- [x] 账号管理页面完成
- [x] 任务控制页面完成
- [x] 仪表盘页面完成
- [x] 执行日志页面完成
- [x] 字段命名规范统一
- [x] 错误处理完善
- [x] 加载状态管理
- [x] 搜索和筛选功能
- [x] 导出功能

### 后端状态
- [x] 15个API端点100%可用
- [x] 数据库问题已修复
- [x] SQLite兼容性修复
- [x] 字段命名规范统一
- [x] 完整测试覆盖

### 整体状态
- ✅ **100%完成** - 项目可投入生产使用

## 📈 功能清单

### 账号管理
- [x] 查看账号列表
- [x] 搜索账号
- [x] 创建账号
- [x] 编辑账号
- [x] 删除账号

### 任务控制
- [x] 查看任务列表
- [x] 搜索任务
- [x] 创建任务
- [x] 编辑任务
- [x] 删除任务
- [x] 启动任务
- [x] 停止任务

### 仪表盘
- [x] 统计概览
- [x] 性能趋势图表
- [x] 任务状态分布
- [x] 最近执行记录

### 执行日志
- [x] 查看日志列表
- [x] 搜索日志
- [x] 状态筛选
- [x] 导出CSV

## 🔗 相关链接

- [最新API文档](doc/new_api.md)
- [API测试报告](doc/api-test-results.md)
- [后端修复记录](doc/backend-milestone-fixes.md)
- [前端修改说明](frontend/FRONTEND_API_MIGRATION.md)
- [验证指南](frontend/VERIFICATION_GUIDE.md)

---

**最后更新**: 2026-01-21
**项目状态**: ✅ 生产就绪
