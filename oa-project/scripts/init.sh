#!/bin/bash

# ============================================
# OA 系统初始化脚本
# 基于 Anthropic feature-dev 插件规范
# ============================================

set -e

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "============================================"
echo "   工程项目管理OA系统 - 环境初始化"
echo "============================================"
echo ""
echo "项目目录: $PROJECT_DIR"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 检查 Node.js
echo -e "${YELLOW}[1/5] 检查 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 请先安装 Node.js${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. 检查项目目录结构
echo ""
echo -e "${YELLOW}[2/5] 检查项目结构...${NC}"
if [ ! -f "CLAUDE.md" ]; then
    echo -e "${RED}❌ 缺少 CLAUDE.md 文件${NC}"
    exit 1
fi
if [ ! -f "tasks.md" ]; then
    echo -e "${RED}❌ 缺少 tasks.md 文件${NC}"
    exit 1
fi
if [ ! -f "progress.txt" ]; then
    echo -e "${RED}❌ 缺少 progress.txt 文件${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 项目结构完整${NC}"

# 3. 检查数据库
echo ""
echo -e "${YELLOW}[3/5] 检查数据库...${NC}"
if [ -f "data/oa.db" ] && [ -s "data/oa.db" ]; then
    echo -e "${GREEN}✓ 数据库已存在${NC}"
else
    echo -e "${YELLOW}→ 需要运行 npm run db:init 初始化${NC}"
fi

# 4. 检查依赖
echo ""
echo -e "${YELLOW}[4/5] 检查依赖...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ 后端依赖已安装${NC}"
else
    echo -e "${YELLOW}→ 请运行 npm install${NC}"
fi

if [ -d "src/frontend/node_modules" ]; then
    echo -e "${GREEN}✓ 前端依赖已安装${NC}"
else
    echo -e "${YELLOW}→ 请运行 cd src/frontend && npm install${NC}"
fi

# 5. 完成状态
echo ""
echo "============================================"
echo -e "${GREEN}   ✅ 环境检查完成！${NC}"
echo "============================================"
echo ""
echo "下一步:"
echo "1. 阅读 CLAUDE.md 了解工作流程"
echo "2. 查看 tasks.md 领取任务"
echo "3. 开始开发"
echo ""
