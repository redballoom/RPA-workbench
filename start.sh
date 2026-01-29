#!/bin/bash
# RPA Workbench 启动脚本
# 用法: ./start.sh [backend|frontend|all]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
BACKEND_PORT=8000
FRONTEND_PORT=3000
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -i:$port > /dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 获取占用端口的进程 PID
get_pid_by_port() {
    local port=$1
    lsof -t -i:$port 2>/dev/null
}

# 清理占用端口的进程
kill_port() {
    local port=$1
    if check_port $port; then
        local pids=$(get_pid_by_port $port)
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}端口 $port 已被占用，进程: $pids${NC}"
            echo -e "${YELLOW}正在清理...${NC}"
            for pid in $pids; do
                kill -9 $pid 2>/dev/null || true
            done
            sleep 1
            # 验证是否清理成功
            if check_port $port; then
                echo -e "${RED}清理端口 $port 失败${NC}"
                return 1
            fi
            echo -e "${GREEN}端口 $port 已清理完毕${NC}"
        fi
    fi
}

# 启动后端
start_backend() {
    echo -e "${GREEN}启动后端服务...${NC}"

    # 检查端口
    if check_port $BACKEND_PORT; then
        echo -e "${YELLOW}后端端口 $BACKEND_PORT 已被占用${NC}"
        kill_port $BACKEND_PORT
    fi

    # 检查虚拟环境
    if [ ! -d "$BACKEND_DIR/venv" ]; then
        echo -e "${RED}错误: 后端虚拟环境不存在，请先运行 ./install.sh${NC}"
        exit 1
    fi

    # 启动后端
    cd $BACKEND_DIR
    source venv/bin/activate
    nohup uvicorn app.main:app --reload --port $BACKEND_PORT > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!

    # 等待后端启动
    sleep 3

    # 检查后端是否启动成功
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}后端服务启动成功 (PID: $BACKEND_PID)${NC}"
        echo -e "${GREEN}API 文档: http://localhost:$BACKEND_PORT/docs${NC}"
    else
        echo -e "${RED}后端服务启动失败，请查看日志: /tmp/backend.log${NC}"
        exit 1
    fi
}

# 启动前端
start_frontend() {
    echo -e "${GREEN}启动前端服务...${NC}"

    # 检查端口
    if check_port $FRONTEND_PORT; then
        echo -e "${YELLOW}前端端口 $FRONTEND_PORT 已被占用${NC}"
        kill_port $FRONTEND_PORT
    fi

    # 检查依赖
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${RED}错误: 前端依赖未安装，请先运行 ./install.sh${NC}"
        exit 1
    fi

    # 启动前端
    cd $FRONTEND_DIR
    nohup pnpm dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!

    # 等待前端启动
    sleep 3

    # 检查前端是否启动成功
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        echo -e "${GREEN}前端服务启动成功 (PID: $FRONTEND_PID)${NC}"
        echo -e "${GREEN}访问地址: http://localhost:$FRONTEND_PORT${NC}"
    else
        echo -e "${RED}前端服务启动失败，请查看日志: /tmp/frontend.log${NC}"
        exit 1
    fi
}

# 停止所有服务
stop_all() {
    echo -e "${YELLOW}停止所有服务...${NC}"

    # 停止后端
    if check_port $BACKEND_PORT; then
        echo -e "${YELLOW}停止后端服务...${NC}"
        kill_port $BACKEND_PORT
        echo -e "${GREEN}后端已停止${NC}"
    else
        echo -e "${YELLOW}后端服务未运行${NC}"
    fi

    # 停止前端
    if check_port $FRONTEND_PORT; then
        echo -e "${YELLOW}停止前端服务...${NC}"
        kill_port $FRONTEND_PORT
        echo -e "${GREEN}前端已停止${NC}"
    else
        echo -e "${YELLOW}前端服务未运行${NC}"
    fi
}

# 查看服务状态
status() {
    echo -e "${GREEN}RPA Workbench 服务状态${NC}"
    echo "================================"

    # 后端状态
    if check_port $BACKEND_PORT; then
        echo -e "${GREEN}[运行中] 后端服务 - 端口 $BACKEND_PORT${NC}"
    else
        echo -e "${RED}[未运行] 后端服务 - 端口 $BACKEND_PORT${NC}"
    fi

    # 前端状态
    if check_port $FRONTEND_PORT; then
        echo -e "${GREEN}[运行中] 前端服务 - 端口 $FRONTEND_PORT${NC}"
    else
        echo -e "${RED}[未运行] 前端服务 - 端口 $FRONTEND_PORT${NC}"
    fi

    echo "================================"
    echo "后端 API: http://localhost:$BACKEND_PORT"
    echo "前端页面: http://localhost:$FRONTEND_PORT"
    echo "API 文档:  http://localhost:$BACKEND_PORT/docs"
}

# 显示帮助
show_help() {
    echo "RPA Workbench 启动脚本"
    echo ""
    echo "用法: ./start.sh [命令]"
    echo ""
    echo "命令:"
    echo "  backend   只启动后端服务 (端口: $BACKEND_PORT)"
    echo "  frontend  只启动前端服务 (端口: $FRONTEND_PORT)"
    echo "  all       启动前后端服务 (默认)"
    echo "  stop      停止所有服务"
    echo "  restart   重启所有服务"
    echo "  status    查看服务状态"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./start.sh          # 启动所有服务"
    echo "  ./start.sh backend  # 只启动后端"
    echo "  ./start.sh stop     # 停止所有服务"
}

# 主逻辑
case "${1:-all}" in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    all)
        start_backend
        start_frontend
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_backend
        start_frontend
        ;;
    status)
        status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        show_help
        exit 1
        ;;
esac
