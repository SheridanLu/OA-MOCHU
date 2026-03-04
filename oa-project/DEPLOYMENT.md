# OA系统部署清单

## 一、服务器准备

### 1.1 基础环境
```bash
# 安装 Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# 安装 Nginx（用于反向代理和HTTPS）
sudo yum install -y nginx

# 安装 Certbot（Let's Encrypt证书）
sudo yum install -y certbot python3-certbot-nginx
```

### 1.2 腾讯云安全组
开放端口：22, 80, 443, 3000, 3001

---

## 二、代码部署

### 2.1 克隆代码
```bash
cd /opt
git clone https://github.com/SheridanLu/OA-MOCHU.git oa-system
cd oa-system
```

### 2.2 安装依赖
```bash
npm install
cd src/frontend && npm install && cd ../..
```

### 2.3 配置环境变量
```bash
cp .env.example .env
vi .env
# 修改 JWT_SECRET 为随机32位字符串
```

### 2.4 构建前端
```bash
cd src/frontend
npm run build
cd ../..
```

### 2.5 初始化数据库
```bash
node src/backend/init-db.js
```

---

## 三、服务配置

### 3.1 PM2 进程管理
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.2 Nginx 反向代理
```bash
sudo vi /etc/nginx/conf.d/oa.conf
```

```nginx
server {
    listen 80;
    server_name oa.mochuoa.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 3.3 HTTPS 证书
```bash
sudo certbot --nginx -d oa.mochuoa.com
```

---

## 四、定时任务

```bash
crontab -e
```

添加：
```
# 每天早上9点检查资质预警
0 9 * * * cd /opt/oa-system && node src/backend/cron/qualification-check.js >> /var/log/oa-cron.log 2>&1

# 每月25日生成对账单
0 0 25 * * cd /opt/oa-system && node src/backend/cron/generate-statements.js >> /var/log/oa-cron.log 2>&1

# 每天凌晨3点备份数据库
0 3 * * * /opt/oa-system/scripts/backup-db.sh >> /var/log/oa-backup.log 2>&1
```

---

## 五、监控与日志

### 5.1 日志位置
- 后端日志: `/opt/oa-system/logs/`
- Nginx日志: `/var/log/nginx/`
- Cron日志: `/var/log/oa-cron.log`

### 5.2 查看服务状态
```bash
pm2 status
pm2 logs oa-backend
pm2 logs oa-frontend
```

---

## 六、备份策略

- 数据库每天自动备份到 `/opt/oa-system/backups/`
- 保留30天备份
- 建议定期同步到对象存储（COS）

---

## 七、故障排查

### 后端无法启动
```bash
pm2 logs oa-backend --lines 100
```

### 前端白屏
```bash
# 检查构建
cd src/frontend && npm run build
# 检查Nginx配置
sudo nginx -t
```

### 数据库问题
```bash
sqlite3 data/oa.db ".tables"
sqlite3 data/oa.db "PRAGMA integrity_check;"
```

---

## 八、联系信息

- GitHub: https://github.com/SheridanLu/OA-MOCHU
- 问题反馈: GitHub Issues
