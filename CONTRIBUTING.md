# 贡献指南

感谢您对 RPA Workbench 项目的兴趣！我们欢迎社区贡献者参与改进这个项目。

## 如何贡献

### 1. Fork 本项目

点击 GitHub 页面右上角的 Fork 按钮，将项目复制到您的 GitHub 账户。

### 2. 克隆您的 Fork

```bash
git clone https://github.com/YOUR_USERNAME/RPA-workbench.git
cd RPA-workbench
```

### 3. 创建特性分支

```bash
git checkout -b feature/amazing-feature
```

### 4. 提交您的更改

请使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 其他维护工作
```

示例：
```bash
git commit -m "feat: 添加用户认证功能"
git commit -m "fix: 修复时区显示错误"
```

### 5. 推送并创建 Pull Request

```bash
git push origin feature/amazing-feature
```

然后在 GitHub 上创建 Pull Request。

## 开发环境搭建

### 前端开发

```bash
cd frontend
pnpm install
pnpm dev
```

### 后端开发

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 代码规范

### Python

- 使用 [Black](https://github.com/psf/black) 进行代码格式化
- 使用 [Ruff](https://github.com/astral-sh/ruff) 进行 linting
- 类型提示必须完整

### TypeScript/JavaScript

- 使用 ESLint 进行代码检查
- 使用 Prettier 进行格式化
- 遵循项目现有的代码风格

## 测试

在提交 PR 之前，请确保：

1. 所有现有测试通过
2. 新功能包含相应的测试
3. 代码覆盖率没有下降

```bash
# 后端测试
cd backend
pytest

# 前端测试
cd frontend
pnpm test
```

## 报告问题

如果您发现了 bug 或有功能建议，请创建 [Issue](https://github.com/redballoom/RPA-workbench/issues)：

- 描述问题或建议
- 提供复现步骤
- 附上相关截图或日志
- 标注 bug 严重程度

## 行为准则

请阅读我们的 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)，了解社区行为准则。

## 许可证

通过贡献代码，您同意您的贡献将根据 MIT License 授权。
