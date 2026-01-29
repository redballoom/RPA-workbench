#!/bin/bash
# RPA Workbench 安装依赖脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始安装依赖...${NC}"

# 安装后端依赖
echo -e "${GREEN}安装后端依赖...${NC}"
if [ -d "backend/venv" ]; then
    echo -e "${YELLOW}后端虚拟环境已存在，跳过创建${NC}"
else
    python3 -m venv backend/venv
    echo -e "${GREEN}后端虚拟环境创建完成${NC}"
fi

cd backend
source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt
cd ..

echo -e "${GREEN}后端依赖安装完成${NC}"

# 安装前端依赖
echo -e "${GREEN}安装前端依赖...${NC}"
cd frontend
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm 未安装，尝试使用 npm...${NC}"
    npm install
else
    pnpm install
fi
cd ..

echo -e "${GREEN}前端依赖安装完成${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}依赖安装完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "启动服务: ./start.sh"
echo "停止服务: ./start.sh stop"
echo "查看状态: ./start.sh status"
