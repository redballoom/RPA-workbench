# Issue 13 分析报告

## 需求

在"任务控制"页面的任务表格中新增"备注列"，表现为文本框形式，允许用户填写任务补充信息。

## 代码分析结果

### 现有表格结构

TaskControl.tsx 表格包含 7 列：
1. 任务名称
2. 机器人账号
3. 主机IP:端口
4. 应用名称
5. 状态
6. 配置
7. 操作

**需要在"操作"列之前新增"备注"列**

### 现有字段检查

Task 模型和 Schema 中**没有 remark 字段**，需要新增。

## 影响范围

| 文件 | 修改内容 |
|------|---------|
| `backend/app/models/task.py` | 新增 remark 字段 (Text, nullable) |
| `backend/app/schemas/task.py` | 新增 remark 字段 (max_length=1000) |
| `frontend/src/lib/api.ts` | Task 接口新增 remark 属性 |
| `frontend/src/pages/TaskControl.tsx` | 表格新增备注列（文本框） |

## 潜在风险

1. **数据迁移**: 新增字段对现有数据无影响（nullable）
2. **前端交互**: 文本框需防抖避免频繁 API 调用
3. **样式兼容**: 需要适配暗色模式
4. **表格布局**: 备注列宽度需合理设置

## 修改方案

### 1. 后端修改

**backend/app/models/task.py**
```python
class Task(Base):
    # ... 现有字段 ...
    remark: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

**backend/app/schemas/task.py**
```python
class TaskBase(BaseModel):
    # ... 现有字段 ...
    remark: Optional[str] = Field(default=None, max_length=1000)

class TaskCreate(TaskBase): ...
class TaskUpdate(TaskBase): ...
class TaskResponse(TaskInDB): ...
```

### 2. 前端修改

**frontend/src/lib/api.ts** - Task 接口
```typescript
interface Task {
  // ... 现有字段 ...
  remark?: string | null;
}
```

**frontend/src/pages/TaskControl.tsx** - 表格列定义
```typescript
// 在操作列之前新增
<th className="px-6 py-3 text-left ...">备注</th>

// td 部分使用 textarea
<td className="px-6 py-4">
  <textarea
    value={task.remark || ''}
    onChange={(e) => handleRemarkChange(task.id, e.target.value)}
    className="w-full text-sm ..."
    rows={1}
  />
</td>
```

**frontend/src/lib/api.ts** - 添加更新备注的 API 调用
```typescript
updateTaskRemark: async (id: string, remark: string): Promise<void> => {
  await api.put(`/tasks/${id}`, { remark });
}
```

### 3. 实现细节

1. **备注保存时机**: 失去焦点时保存（onBlur）或使用防抖
2. **表格布局**: 备注列宽度自适应，可换行显示
3. **样式**: 与表格其他单元格风格一致，支持暗色模式

## 验证方案

1. **启动服务**: `./start.sh`
2. **访问任务控制页面**: http://localhost:3000/task-control
3. **测试项目**:
   - [ ] 新增备注列显示正确
   - [ ] 文本框可输入备注
   - [ ] 失去焦点后备注保存成功
   - [ ] 刷新页面备注仍存在
   - [ ] SSE 推送更新备注后同步显示
   - [ ] 编辑弹窗中备注显示并可编辑
   - [ ] 支持暗色模式

## 执行顺序

1. 后端：添加 model 和 schema 字段
2. 重启后端服务
3. 前端：添加接口定义和 API 方法
4. 前端：添加表格列和交互逻辑
5. 测试验证
