# 仪表盘排行榜 API 问题排查与修复

> 发现日期: 2026-01-30

---

## 问题 1: API 500 错误

### 错误现象
```json
{"error": {"code": 500, "message": "Internal server error"}}
```

### 根本原因

**文件**: `backend/app/repositories/log_repository.py`

**问题**: 使用了 `text()` 函数但未导入

```python
# 当前导入 (第 6 行)
from sqlalchemy import select, and_, or_, func, desc

# 缺少 text
from sqlalchemy import text
```

---

## 问题 2: 排序规则

### 需求确认
- **正确规则**: 按总执行时长排序 (SUM(duration))
- **当前实现**: 按平均执行时长排序 (AVG(duration))

### 数据库字段
| 字段 | 说明 |
|------|------|
| `duration` | 单次执行时长（秒） |

### SQL 修改

**修改文件**: `backend/app/repositories/log_repository.py`

**修改前**:
```sql
SELECT
    app_name,
    AVG(duration) as avg_duration,
    COUNT(*) as execution_count
FROM execution_logs
GROUP BY app_name
ORDER BY avg_duration DESC
LIMIT :limit
```

**修改后**:
```sql
SELECT
    app_name,
    SUM(duration) as total_duration,
    COUNT(*) as execution_count
FROM execution_logs
GROUP BY app_name
ORDER BY total_duration DESC
LIMIT :limit
```

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `backend/app/repositories/log_repository.py` | 添加 text 导入，修改 SQL |
| `backend/app/services/execution_log_service.py` | 返回字段从 avg_duration 改为 total_duration |
| `backend/app/services/dashboard_service.py` | 返回字段从 avg_duration 改为 total_duration |
| `frontend/src/lib/api.ts` | 类型定义修改 |
| `frontend/src/pages/Dashboard.tsx` | 显示 total_duration |

---

## 数据库数据

```bash
python3 -c "
import sqlite3
conn = sqlite3.connect('rpa_app.db')
cursor = conn.cursor()
cursor.execute('''SELECT app_name, SUM(duration), COUNT(*) FROM execution_logs GROUP BY app_name''')
for row in cursor.fetchall():
    print(f'{row[0]}: 总时长={row[1]}秒, 次数={row[2]}')
conn.close()
"
```

**输出示例**:
```
开发流程模板-RPA: 总时长=111.0秒, 次数=5
```
