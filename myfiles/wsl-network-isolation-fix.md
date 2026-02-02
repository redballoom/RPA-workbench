# WSL 网络隔离问题修复

> 2026-01-31

---

## What（什么问题）

**现象**：Windows 浏览器无法访问 WSL 中的后端服务（8888 端口）

**表现**：
- WSL 内 `curl http://localhost:8888` ✅ 正常
- Windows 浏览器访问 `http://localhost:8888` ❌ 无法访问
- 错误信息：`ERR_EMPTY_RESPONSE` 或连接超时

---

## Why（为什么发生）

**根因**：WSL 网络隔离设计

| 层级 | 状态 | 说明 |
|------|------|------|
| WSL → 外部网络 | ✅ 正常 | WSL 可以访问互联网 |
| WSL → Windows | ⚠️ 受限 | WSL 使用虚拟网络适配器 |
| Windows → WSL | ❌ 隔离 | 无法直接访问 WSL 内的服务 |

**技术原因**：
- WSL2 使用轻量级虚拟机 (Hyper-V)
- 拥有独立的虚拟网络适配器
- Windows 和 WSL 之间的网络隔离是设计行为
- 需要端口转发才能让外部访问 WSL 内服务

---

## When（何时发生/解决）

| 时间 | 事件 |
|------|------|
| 2026-01-31 17:42 | 发现问题：Windows 无法访问后端 |
| 2026-01-31 17:55 | 诊断：确认 WSL 网络隔离 |
| 2026-01-31 18:10 | 解决：配置 Windows 端口转发 |
| 2026-01-31 18:12 | 验证：重启前后端服务，测试通过 |

---

## How（如何解决）

### 解决方案：配置 Windows 端口转发

在 **Windows PowerShell（管理员）** 中执行：

```powershell
# 1. 添加端口转发规则
# 将 Windows 8888 端口转发到 WSL localhost
netsh interface portproxy add v4tov4 listenport=8888 listenaddress=0.0.0.0 connectport=8888 connectaddress=localhost

# 2. 允许防火墙通过
netsh advfirewall firewall add rule name="RPA Backend 8888" dir=in action=allow protocol=TCP localport=8888
```

### 验证命令

```powershell
# 查看端口转发状态
netsh interface portproxy show all

# 从 Windows 测试
curl http://localhost:8888/api/v1/dashboard/stats
```

### 服务重启命令（WSL 中）

```bash
# 重启后端
pkill -9 -f uvicorn
cd /home/redballooon/Desktop/claude_code_projects/RPA-workbench/backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8888 > /tmp/backend.log 2>&1 &

# 重启前端
pkill -9 -f vite
cd /home/redballooon/Desktop/claude_code_projects/RPA-workbench/frontend
pnpm dev
```

---

## 总结

| 项目 | 内容 |
|------|------|
| 问题类型 | WSL 网络配置 |
| 影响范围 | Windows 无法访问 WSL 内后端服务 |
| 解决方案 | Windows 端口转发 (netsh interface portproxy) |
| 涉及端口 | 8888 (后端) |
| 状态 | ✅ 已解决 |

---

## 预防措施

1. **开发时**：始终配置端口转发后再提供服务
2. **文档**：将端口转发命令记录到开发文档
3. **自动化**：可考虑使用脚自动配置端口转发
