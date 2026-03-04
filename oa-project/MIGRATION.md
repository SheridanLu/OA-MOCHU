# OA系统迁移检查清单

## 迁移前准备

### 旧服务器操作
- [ ] 备份数据库
  ```bash
  cp /root/.openclaw/workspace/oa-project/data/oa.db /tmp/oa-backup.db
  ```
- [ ] 导出环境配置
  ```bash
  cat /root/.openclaw/workspace/oa-project/.env
  ```
- [ ] 确认代码已推送到GitHub
  ```bash
  cd /root/.openclaw/workspace/oa-project && git status
  ```

### 新服务器准备
- [ ] 购买服务器（建议同配置或更高）
- [ ] 开放安全组端口：22, 80, 443, 3000, 3001
- [ ] 获取服务器IP

---

## 迁移步骤

### 1. 部署系统
- [ ] 执行迁移脚本
- [ ] 等待安装完成
- [ ] 检查服务状态
  ```bash
  systemctl status oa-backend oa-frontend
  ```

### 2. 迁移数据
- [ ] 上传数据库文件
  ```bash
  scp oa-backup.db root@新IP:/opt/oa-system/data/oa.db
  ```
- [ ] 修改 .env 配置
  ```bash
  vi /opt/oa-system/.env
  ```

### 3. 重启服务
- [ ] 重启后端
  ```bash
  systemctl restart oa-backend
  ```
- [ ] 重启前端
  ```bash
  systemctl restart oa-frontend
  ```

### 4. 验证测试
- [ ] 访问 http://新IP:3000
- [ ] 测试登录（admin/admin123）
- [ ] 检查数据是否完整
- [ ] 测试核心功能

---

## 迁移后收尾

### 域名配置（如有）
- [ ] 修改DNS解析到新IP
- [ ] 重新申请SSL证书
  ```bash
  certbot --nginx -d oa.mochuoa.com
  ```

### 旧服务器
- [ ] 保留7天观察
- [ ] 确认无问题后释放

---

## 回滚方案

如果迁移失败，可以快速切回旧服务器：

1. 修改域名解析回旧IP
2. 重启旧服务器服务
3. 定位新服务器问题后重试

---

## 联系支持

- GitHub: https://github.com/SheridanLu/OA-MOCHU
- 问题反馈: GitHub Issues
