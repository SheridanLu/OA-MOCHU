#!/bin/bash
# OA系统 HTTPS 配置脚本
# 使用 Certbot (Let's Encrypt) 免费证书

# 安装 Nginx 和 Certbot
yum install -y nginx certbot python3-certbot-nginx

# 配置 Nginx 反向代理
cat > /etc/nginx/conf.d/oa.conf << 'NGINX'
server {
    listen 80;
    server_name oa.mochuoa.com;  # 替换为你的域名
    
    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 后端API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX

echo "=========================================="
echo "  Nginx 配置完成"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 修改 /etc/nginx/conf.d/oa.conf 中的域名为你的域名"
echo "2. 运行: systemctl restart nginx"
echo "3. 运行: certbot --nginx -d your-domain.com"
echo ""
echo "证书会自动续期"
