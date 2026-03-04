#!/bin/bash
# OA系统数据库备份脚本

BACKUP_DIR="/root/.openclaw/workspace/oa-project/backups"
DB_FILE="/root/.openclaw/workspace/oa-project/data/oa.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/oa_${DATE}.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_FILE $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 删除30天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "$(date): 数据库备份完成 -> ${BACKUP_FILE}.gz"
