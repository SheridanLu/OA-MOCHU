#!/bin/bash
# OA系统生产环境优化脚本

echo "=========================================="
echo "  OA系统生产环境配置"
echo "=========================================="

# 1. 安装 PM2（进程管理器）
npm install -g pm2

# 2. 创建 PM2 配置
cat > /root/.openclaw/workspace/oa-project/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'oa-backend',
      cwd: '/root/.openclaw/workspace/oa-project/src/backend',
      script: 'index.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'oa-frontend',
      cwd: '/root/.openclaw/workspace/oa-project/src/frontend',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 3000',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
EOF

# 3. 构建前端生产版本
cd /root/.openclaw/workspace/oa-project/src/frontend
npm run build

# 4. 配置防火墙
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload

# 5. 配置定时任务（资质预警）
(crontab -l 2>/dev/null; echo "0 9 * * * cd /root/.openclaw/workspace/oa-project && node src/backend/cron/qualification-check.js >> /var/log/oa-cron.log 2>&1") | crontab -

# 6. 配置日志轮转
cat > /etc/logrotate.d/oa-system << 'EOF'
/var/log/oa-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF

echo ""
echo "=========================================="
echo "  配置完成"
echo "=========================================="
echo ""
echo "启动命令:"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
echo "查看状态:"
echo "  pm2 status"
echo ""
echo "查看日志:"
echo "  pm2 logs oa-backend"
echo "  pm2 logs oa-frontend"
