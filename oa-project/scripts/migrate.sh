#!/bin/bash
# OA系统一键迁移脚本
# 在新服务器上运行此脚本即可完成迁移

set -e

echo "=========================================="
echo "  OA系统迁移脚本"
echo "=========================================="
echo ""

# 配置变量
GITHUB_REPO="https://github.com/SheridanLu/OA-MOCHU.git"
INSTALL_DIR="/opt/oa-system"

# 1. 检查系统
echo "=== 1. 检查系统环境 ==="
if [ ! -f /etc/centos-release ] && [ ! -f /etc/redhat-release ]; then
    echo "⚠️  此脚本仅支持 CentOS/RedHat 系统"
    exit 1
fi

# 2. 安装依赖
echo ""
echo "=== 2. 安装依赖 ==="
yum install -y git curl

# 3. 安装 Node.js 22
echo ""
echo "=== 3. 安装 Node.js 22 ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    yum install -y nodejs
fi
node -v
npm -v

# 4. 安装 PM2
echo ""
echo "=== 4. 安装 PM2 ==="
npm install -g pm2

# 5. 克隆代码
echo ""
echo "=== 5. 克隆代码 ==="
if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  目录已存在，跳过克隆"
else
    git clone $GITHUB_REPO $INSTALL_DIR
fi
cd $INSTALL_DIR

# 6. 安装依赖
echo ""
echo "=== 6. 安装依赖 ==="
npm install
cd src/frontend && npm install && cd ../..

# 7. 配置环境变量
echo ""
echo "=== 7. 配置环境变量 ==="
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件配置密钥"
    echo "   vi $INSTALL_DIR/.env"
fi

# 8. 初始化数据库
echo ""
echo "=== 8. 初始化数据库 ==="
if [ ! -f data/oa.db ]; then
    node src/backend/init-db.js
    echo "✅ 数据库初始化完成"
else
    echo "⚠️  数据库已存在，跳过初始化"
fi

# 9. 构建前端
echo ""
echo "=== 9. 构建前端 ==="
cd src/frontend
npm run build
cd ../..

# 10. 配置 systemd 服务
echo ""
echo "=== 10. 配置系统服务 ==="
cat > /etc/systemd/system/oa-backend.service << 'EOF'
[Unit]
Description=OA Backend API
After=network.target

[Service]
Type=simple
WorkingDirectory=INSTALL_DIR/src/backend
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
User=root
Environment=PATH=/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/oa-frontend.service << 'EOF'
[Unit]
Description=OA Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=INSTALL_DIR/src/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 3000
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

# 替换路径
sed -i "s|INSTALL_DIR|$INSTALL_DIR|g" /etc/systemd/system/oa-backend.service
sed -i "s|INSTALL_DIR|$INSTALL_DIR|g" /etc/systemd/system/oa-frontend.service

systemctl daemon-reload
systemctl enable oa-backend oa-frontend
systemctl start oa-backend oa-frontend

# 11. 配置防火墙
echo ""
echo "=== 11. 配置防火墙 ==="
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=3001/tcp
    firewall-cmd --reload
fi

# 12. 完成提示
echo ""
echo "=========================================="
echo "  迁移完成！"
echo "=========================================="
echo ""
echo "访问地址: http://$(curl -s ifconfig.me):3000"
echo "账号: admin / admin123"
echo ""
echo "下一步："
echo "1. 如果有旧数据库，复制到: $INSTALL_DIR/data/oa.db"
echo "2. 修改 .env 配置: vi $INSTALL_DIR/.env"
echo "3. 重启服务: systemctl restart oa-backend oa-frontend"
echo ""
echo "=========================================="
