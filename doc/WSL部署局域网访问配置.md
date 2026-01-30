# WSL 本地部署 - 局域网访问配置

> 2026-01-30

## 背景

RPA Workbench 后端运行在 WSL 环境中，需要配置局域网内其他电脑访问。

## 环境信息

| 组件 | 地址 |
|------|------|
| WSL IP | 172.30.233.159 |
| 后端端口 | 8000 |
| Windows 电脑 IP | 192.168.4.205 |

## 配置步骤

### 1. WSL 启动后端

```bash
cd /home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Windows 端口转发（以管理员身份运行 PowerShell）

```powershell
# 设置端口转发
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.30.233.159

# 防火墙放行
netsh advfirewall firewall add rule name="WSL Port 8000" dir=in action=allow protocol=TCP localport=8000

# 验证配置
netsh interface portproxy show all
```

### 3. 验证访问

```bash
# 在 WSL 中测试
curl http://localhost:8000/api/v1/dashboard/performance

# 在 Windows 或其他电脑浏览器访问
http://192.168.4.205:8000/docs
```

## API 访问地址

| 功能 | 地址 |
|------|------|
| API 文档 | http://192.168.4.205:8000/docs |
| 健康检查 | http://192.168.4.205:8000/health |
| 性能趋势 | http://192.168.4.205:8000/api/v1/dashboard/performance |
| 仪表盘统计 | http://192.168.4.205:8000/api/v1/dashboard/stats |
| 任务列表 | http://192.168.4.205:8000/api/v1/tasks |
| 账号列表 | http://192.168.4.205:8000/api/v1/accounts |
| 执行日志 | http://192.168.4.205:8000/api/v1/logs |
| 影刀回调 | http://192.168.4.205:8000/api/v1/webhook/confirm |

## 影刀配置

在影刀中设置 webhook 回调地址：
```
http://192.168.4.205:8000/api/v1/webhook/confirm
```

## 前端配置（可选）

如果前端在 Windows 上运行，修改 `frontend/.env`：
```env
VITE_API_BASE_URL=http://192.168.4.205:8000/api/v1
```

## 注意事项

1. **WSL IP 可能变化** - 重启 WSL 或电脑后 IP 可能改变
2. **Windows 防火墙** - 首次可能弹出提示，选择"允许访问"
3. **端口转发持久化** - 重启后需要重新设置（或使用脚本自动执行）

## 快速脚本

创建 `setup-wsl-port.ps1` 放在 Windows 桌面：

```powershell
# 以管理员身份运行此脚本

# 设置端口转发
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=$(wsl hostname -I)

# 防火墙放行
netsh advfirewall firewall add rule name="WSL Port 8000" dir=in action=allow protocol=TCP localport=8000

Write-Host "端口转发设置完成！"
netsh interface portproxy show all
```

## 故障排除

### 无法访问
```powershell
# 检查端口转发
netsh interface portproxy show all

# 检查防火墙状态
netsh advfirewall firewall show all

# 删除并重新设置
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=WSL_IP
```

### WSL IP 变了
```powershell
# 更新端口转发
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=$(wsl hostname -I)
```
