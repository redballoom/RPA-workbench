# 前端接口修改验证指南

## 🚀 快速启动

### 1. 启动后端服务
```bash
# 终端1：启动后端
cd backend
uvicorn app.main:app --reload --port 8888
```

### 2. 启动前端服务
```bash
# 终端2：启动前端
cd frontend
pnpm install
pnpm dev
```

### 3. 访问应用
打开浏览器访问：http://localhost:3000

## ✅ 验证清单

### 1. 账号管理页面验证
访问：http://localhost:3000/account-management

**测试项目**:
- [ ] 页面正常加载，显示加载指示器
- [ ] 从API获取账号列表
- [ ] 搜索功能：输入关键词，能过滤账号
- [ ] 添加账号：
  - 点击"添加账号"按钮
  - 填写表单：shadow_bot_account, host_ip, task_control
  - 提交后账号列表刷新
- [ ] 编辑账号：点击编辑按钮，修改信息，保存成功
- [ ] 删除账号：点击删除按钮，确认删除，列表刷新
- [ ] 所有字段名使用snake_case（检查Network面板）

**检查点**:
- API请求地址：`http://localhost:8888/api/v1/accounts`
- 请求体字段：`shadow_bot_account`, `host_ip`, `task_control`
- 响应体字段：`shadow_bot_account`, `host_ip`, `task_control`

### 2. 任务控制页面验证
访问：http://localhost:3000/task-control

**测试项目**:
- [ ] 页面正常加载，显示加载指示器
- [ ] 从API获取任务列表
- [ ] 搜索功能：输入关键词，能过滤任务
- [ ] 添加任务：
  - 点击"添加任务"按钮
  - 选择账号（会自动填充主机IP）
  - 填写任务名称和应用名称
  - 提交后任务列表刷新
- [ ] 启动任务：点击播放按钮，状态变为"运行中"
- [ ] 停止任务：点击停止按钮，状态变为"待启动"
- [ ] 编辑任务：修改信息，保存成功
- [ ] 删除任务：确认删除，列表刷新
- [ ] 所有字段名使用snake_case

**检查点**:
- API请求地址：
  - GET: `http://localhost:8888/api/v1/tasks`
  - POST: `http://localhost:8888/api/v1/tasks/{id}/start`
  - POST: `http://localhost:8888/api/v1/tasks/{id}/stop`
- 请求体字段：`task_name`, `shadow_bot_account`, `host_ip`, `app_name`

### 3. 仪表盘页面验证
访问：http://localhost:3000/dashboard

**测试项目**:
- [ ] 页面正常加载，显示加载指示器
- [ ] 统计卡片显示正确数据：
  - 总账号数
  - 活跃任务数
  - 已完成任务数
  - 平均执行时间
- [ ] 性能趋势图表显示7天数据
- [ ] 任务状态分布饼图显示正确比例
- [ ] 最近执行记录列表显示最新日志
- [ ] 数据自动刷新（每30秒）
- [ ] 所有字段名使用snake_case

**检查点**:
- API请求地址：
  - `http://localhost:8888/api/v1/dashboard/stats`
  - `http://localhost:8888/api/v1/dashboard/performance`
  - `http://localhost:8888/api/v1/logs`

### 4. 执行日志页面验证
访问：http://localhost:3000/execution-logs

**测试项目**:
- [ ] 页面正常加载，显示加载指示器
- [ ] 从API获取日志列表
- [ ] 搜索功能：输入关键词，能过滤日志
- [ ] 状态筛选：选择状态（全部/已完成/已失败/运行中）
- [ ] 导出功能：点击"导出"按钮，下载CSV文件
- [ ] 日志列表显示所有字段：ID、应用名称、账号、状态、时间等
- [ ] 所有字段名使用snake_case

**检查点**:
- API请求地址：`http://localhost:8888/api/v1/logs`
- 导出API：`http://localhost:8888/api/v1/logs/export`

## 🔍 检查项详解

### 1. 网络请求检查
打开浏览器开发者工具（F12）→ Network面板，检查：

**正确示例**:
```json
// POST /api/v1/accounts
{
  "shadow_bot_account": "test_account",
  "host_ip": "192.168.1.100",
  "task_control": "test_account--192.168.1...."
}
```

**错误示例**:
```json
// POST /api/v1/accounts
{
  "shadowBotAccount": "test_account",  // ❌ 错误：camelCase
  "hostIp": "192.168.1.100",          // ❌ 错误：camelCase
}
```

### 2. 响应数据检查
**正确示例**:
```json
{
  "id": "xxx",
  "shadow_bot_account": "xxx",
  "host_ip": "xxx",
  "status": "pending",
  "task_control": "xxx",
  "created_at": "xxx",
  "updated_at": "xxx"
}
```

### 3. 错误处理检查
测试以下场景：
- [ ] 关闭后端服务，刷新前端页面 → 应显示错误提示
- [ ] 网络断开 → 应显示错误提示
- [ ] 表单验证错误 → 应显示具体字段错误提示

### 4. 加载状态检查
- [ ] 页面初始加载 → 应显示加载指示器
- [ ] 提交表单 → 按钮应显示加载图标
- [ ] 数据加载完成 → 加载指示器消失

## 🐛 常见问题

### Q1: 页面显示空白或加载中状态
**原因**: 后端服务未启动
**解决**: 确保后端服务运行在 http://localhost:8888

### Q2: 请求返回401/403错误
**原因**: CORS配置问题
**解决**: 检查后端CORS设置

### Q3: 请求返回500错误
**原因**: 后端API问题
**解决**: 
1. 检查后端日志
2. 确认API地址正确
3. 确认请求格式正确

### Q4: 字段名错误
**原因**: 前端未使用snake_case
**解决**: 检查Network面板，确认请求体使用snake_case

## 📊 性能检查

### 1. API响应时间
- 列表查询：< 500ms
- 创建/更新/删除：< 1000ms
- 仪表盘数据：< 1000ms

### 2. 前端性能
- 页面加载：< 2秒
- 搜索响应：< 300ms
- 页面切换：< 500ms

## ✅ 最终验收

所有测试项目通过后，前端接口修改验收通过！

**验收标准**:
- [ ] 所有4个页面功能正常
- [ ] 所有API调用使用snake_case
- [ ] 错误处理完善
- [ ] 加载状态正确
- [ ] 搜索/筛选功能正常
- [ ] 导出功能正常
- [ ] 无控制台错误
- [ ] Network面板无失败请求

---

**验证完成** → 🎉 前端接口修改成功！
