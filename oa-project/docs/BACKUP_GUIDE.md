# 数据库备份与恢复文档

## 📦 备份策略

### 自动备份计划

| 备份类型 | 执行时间 | 保留期限 | 备份位置 |
|---------|---------|---------|---------|
| 每日备份 | 每天 02:00 | 7天 | `backups/daily/` |
| 每周备份 | 每周日 03:00 | 4周 | `backups/weekly/` |
| 每月备份 | 每月1号 04:00 | 12个月 | `backups/monthly/` |

---

## 📋 备份管理

### 手动备份

```bash
# 每日备份
./scripts/backup-database.sh daily

# 每周备份
./scripts/backup-database.sh weekly

# 每月备份
./scripts/backup-database.sh monthly

# 全部备份
./scripts/backup-database.sh all
```

### 查看备份状态

```bash
# 查看备份状态
./scripts/backup-database.sh status

# 列出所有备份
./scripts/backup-database.sh list
```

### 验证备份

```bash
# 验证备份完整性
./scripts/backup-database.sh verify backups/daily/oa_backup_20260305_091105.db.gz
```

---

## 🔄 恢复备份

### 恢复步骤

```bash
# 1. 查看可用备份
./scripts/backup-database.sh list

# 2. 恢复指定备份
./scripts/backup-database.sh restore backups/daily/oa_backup_20260305_091105.db.gz

# 恢复过程会自动：
# - 停止后端服务
# - 备份当前数据库
# - 恢复指定备份
# - 重启后端服务
```

### 恢复注意事项

1. **恢复前备份**: 恢复前会自动备份当前数据库
2. **服务中断**: 恢复期间后端服务会停止（约10-30秒）
3. **验证备份**: 恢复前会验证备份文件完整性
4. **操作记录**: 所有操作都记录在 `backups/backup.log`

---

## 🔍 备份监控

### 自动监控

系统会自动监控备份状态：

- **检查频率**: 每小时检查一次
- **监控内容**: 
  - 备份是否存在
  - 备份是否过期
  - 备份文件完整性

### 手动检查

```bash
# 检查备份状态
./scripts/monitor-backup.sh

# 查看告警日志
cat backups/alert.log

# 查看备份日志
cat backups/backup.log
```

---

## 📁 备份文件位置

```
backups/
├── daily/                    # 每日备份（7天）
│   ├── oa_backup_20260305_020000.db.gz
│   ├── oa_backup_20260306_020000.db.gz
│   └── ...
├── weekly/                   # 每周备份（4周）
│   ├── oa_backup_20260301_030000.db.gz
│   └── ...
├── monthly/                  # 每月备份（12个月）
│   ├── oa_backup_20260101_040000.db.gz
│   └── ...
├── backup.log                # 备份操作日志
└── alert.log                 # 告警日志
```

---

## 🛡️ 安全措施

### 1. 备份完整性
- ✅ SQLite PRAGMA integrity_check
- ✅ Gzip压缩验证
- ✅ 备份前备份当前数据库

### 2. 自动清理
- ✅ 自动清理过期备份
- ✅ 保留策略可配置
- ✅ 清理日志记录

### 3. 监控告警
- ✅ 备份状态监控
- ✅ 过期备份告警
- ✅ 损坏备份告警

---

## 📊 备份统计

### 当前备份

```bash
# 查看统计
./scripts/backup-database.sh status
```

输出示例：
```
✅ 数据库文件: /root/.openclaw/workspace/oa-project/data/oa.db
   大小: 168K
   修改时间: 2026-03-04 11:36:38

✅ 备份目录: /root/.openclaw/workspace/oa-project/backups
   总大小: 8.0K

✅ 最新备份: backups/daily/oa_backup_20260305_091105.db.gz
   备份时间: 2026-03-05 09:11:05
```

---

## 🚨 应急恢复

### 场景1: 数据误删

```bash
# 1. 立即停止后端服务
systemctl stop oa-backend

# 2. 恢复最近备份
./scripts/backup-database.sh restore backups/daily/oa_backup_20260305_091105.db.gz

# 3. 验证恢复
systemctl start oa-backend
curl http://localhost:3001/api/health
```

### 场景2: 数据库损坏

```bash
# 1. 检查数据库
sqlite3 data/oa.db "PRAGMA integrity_check;"

# 2. 如果损坏，恢复备份
./scripts/backup-database.sh restore backups/daily/oa_backup_20260305_091105.db.gz
```

### 场景3: 服务器崩溃

```bash
# 1. 从备份目录恢复
scp -r root@43.153.149.71:/root/.openclaw/workspace/oa-project/backups ./

# 2. 选择备份恢复
./scripts/backup-database.sh restore backups/daily/oa_backup_20260305_091105.db.gz
```

---

## 📧 告警配置（可选）

### 钉钉通知

编辑 `scripts/monitor-backup.sh`，添加钉钉webhook：

```bash
curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$message\"}}"
```

### 邮件通知

```bash
echo "$message" | mail -s "OA系统备份告警" admin@mochuoa.com
```

---

## ✅ 最佳实践

1. **定期检查**: 每周检查备份状态
2. **定期测试**: 每月测试恢复流程
3. **异地备份**: 定期复制备份到其他服务器
4. **监控告警**: 配置告警通知
5. **文档更新**: 备份策略变更时更新文档

---

*最后更新: 2026-03-05*
*维护人: 全能大龙虾🦞*
