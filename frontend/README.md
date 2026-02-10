# RPA Workbench 前端

> 基于 React 18 + TypeScript + Vite 的 RPA 管理平台前端

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| UI 样式 | TailwindCSS |
| 图标 | lucide-react |
| 图表 | recharts |
| 路由 | react-router-dom |
| 提示 | sonner |
| 工具 | tailwind-merge + clsx |

## 快速开始

```bash
cd frontend
pnpm install          # 安装依赖
pnpm dev              # 开发服务器 (端口 3000)
pnpm build            # 构建生产版本
```

## 项目结构

```
src/
├── App.tsx                    # 应用入口 + 路由配置
├── main.tsx                   # React DOM 渲染
├── lib/
│   └── api.ts                 # API 客户端 + 类型定义
├── hooks/
│   └── useSSE.ts              # SSE 实时通信 Hook
├── pages/
│   ├── Dashboard.tsx          # 仪表盘
│   ├── AccountManagement.tsx   # 账号管理
│   ├── TaskControl.tsx         # 任务控制
│   └── ExecutionLogs.tsx       # 执行日志
├── components/
│   ├── Layout.tsx             # 布局组件
│   ├── Sidebar.tsx            # 侧边栏
│   ├── StatusBadge.tsx        # 状态徽章
│   ├── ActionButton.tsx       # 操作按钮
│   └── Empty.tsx              # 空状态组件
└── contexts/                  # (预留) 状态管理
```

## 页面功能

### 仪表盘 (Dashboard)

- **统计卡片**: 总账号数、活跃任务、执行统计（成功/失败）、平均执行时间
- **性能趋势图**: 日/月维度切换，展示执行次数趋势
- **任务排行**: 按执行时间排序，显示趋势指示（↑↓）
- **状态分布**: 饼图展示待启动/运行中任务比例
- **最近记录**: 最近 5 条执行日志

### 账号管理 (AccountManagement)

- **列表展示**: 机器人账号、IP、端口、状态、最近应用
- **搜索**: 按账号名/IP/任务控制标识搜索
- **CRUD**: 添加、编辑、删除账号
- **状态同步**: 通过 SSE 实时更新账号状态

### 任务控制 (TaskControl)

- **列表展示**: 任务名、账号、应用、状态、配置、备注
- **搜索**: 按任务名/账号/应用名搜索
- **CRUD**: 添加、编辑、删除任务
- **任务操作**: 启动、停止（等待回调）、强制停止
- **配置管理**: 配置文件上传、配置信息编辑
- **备注编辑**: 弹窗编辑任务备注（最多 1000 字）
- **状态同步**: 通过 SSE 实时更新任务状态

### 执行日志 (ExecutionLogs)

- **列表展示**: ID、应用名、账号、状态、时间、执行时长
- **搜索筛选**: 按关键词搜索、按状态筛选
- **排序**: 按开始时间排序（升序/降序）
- **分页**: 可调整每页显示数量（25/50/100）
- **导出**: CSV 格式导出全部日志
- **截图查看**: 缩略图 + 缩放模态框（25%-300%）
- **日志内容**: 查看、复制、下载日志文件
- **实时更新**: 通过 SSE 自动刷新新日志

## API 接口

### 账号
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/v1/accounts | 账号列表（分页、搜索） |
| POST | /api/v1/accounts | 创建账号 |
| GET | /api/v1/accounts/{id} | 获取单个账号 |
| PUT | /api/v1/accounts/{id} | 更新账号 |
| DELETE | /api/v1/accounts/{id} | 删除账号 |

### 任务
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/v1/tasks | 任务列表（分页、搜索） |
| POST | /api/v1/tasks | 创建任务 |
| GET | /api/v1/tasks/{id} | 获取单个任务 |
| PUT | /api/v1/tasks/{id} | 更新任务 |
| DELETE | /api/v1/tasks/{id} | 删除任务 |
| POST | /api/v1/tasks/{id}/start | 启动任务 |
| POST | /api/v1/tasks/{id}/stop | 停止任务（等待确认） |
| POST | /api/v1/tasks/{id}/force-stop | 强制停止任务 |

### 执行日志
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/v1/logs | 日志列表（分页、搜索、筛选、排序） |
| GET | /api/v1/logs/export | 导出 CSV |

### 仪表盘
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/v1/dashboard/stats | 统计数据 |
| GET | /api/v1/dashboard/performance | 性能趋势 |
| GET | /api/v1/dashboard/execution-rank | 执行排行 |

### SSE 实时事件
| 事件类型 | 说明 |
|----------|------|
| log_created | 新建执行日志 |
| account_updated | 账号状态更新 |
| task_updated | 任务状态更新 |

## 环境变量

```bash
VITE_API_BASE_URL=http://localhost:8888/api/v1
```
