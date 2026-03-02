#!/bin/bash

# ============================================
# 小型OA系统 - 开发环境启动脚本
# ============================================

set -e

echo "🚀 启动 OA 系统开发环境..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js 版本: $(node -v)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装依赖...${NC}"
    npm install
fi

# 检查数据库
if [ ! -f "data/oa.db" ]; then
    echo -e "${YELLOW}初始化数据库...${NC}"
    mkdir -p data
    npm run db:init
fi

# 启动后端
echo -e "${GREEN}启动后端服务 (端口 3001)...${NC}"
npm run server &
BACKEND_PID=$!

# 等待后端启动
sleep 2

# 启动前端
echo -e "${GREEN}启动前端服务 (端口 3000)...${NC}"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo -e "${GREEN}✓ 开发环境启动成功！${NC}"
echo "============================================"
echo ""
echo "📍 前端地址: http://localhost:3000"
echo "📍 后端地址: http://localhost:3001"
echo "📍 默认账号: admin / admin123"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 等待子进程
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
