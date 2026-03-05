#!/bin/bash
# 数据库备份监控脚本
# 检查备份是否正常，如果异常则发送告警

BACKUP_DIR="/root/.openclaw/workspace/oa-project/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
ALERT_LOG="$BACKUP_DIR/alert.log"

# 获取当前时间
NOW=$(date +%s)
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# 检查最近备份时间
check_last_backup() {
  local backup_type=$1
  local max_hours=$2
  local backup_path="$BACKUP_DIR/$backup_type"
  
  if [ ! -d "$backup_path" ]; then
    echo "[$DATE] ❌ 备份目录不存在: $backup_type" >> "$ALERT_LOG"
    return 1
  fi
  
  # 获取最新备份文件
  local latest_file=$(ls -1t "$backup_path" 2>/dev/null | head -1)
  
  if [ -z "$latest_file" ]; then
    echo "[$DATE] ⚠️  未找到备份: $backup_type" >> "$ALERT_LOG"
    return 1
  fi
  
  # 检查备份时间
  local file_time=$(stat -c %Y "$backup_path/$latest_file" | cut -d. -f1)
  local file_timestamp=$(date -d "$file_time" +%s 2>/dev/null || echo $(stat -c %Y "$backup_path/$latest_file"))
  local age_hours=$((($NOW - $file_timestamp) / 3600))
  
  if [ $age_hours -gt $max_hours ]; then
    echo "[$DATE] ⚠️  备份过期: $backup_type (已过期 ${age_hours}小时)" >> "$ALERT_LOG"
    return 1
  fi
  
  echo "[$DATE] ✅ 备份正常: $backup_type (${age_hours}小时前)" >> "$ALERT_LOG"
  return 0
}

# 检查备份完整性
check_integrity() {
  local backup_type=$1
  local backup_path="$BACKUP_DIR/$backup_type"
  
  # 获取最新备份
  local latest_file=$(ls -1t "$backup_path" 2>/dev/null | head -1)
  
  if [ -z "$latest_file" ]; then
    return 1
  fi
  
  # 检查文件是否损坏
  if [[ "$latest_file" == *.gz ]]; then
    if ! gunzip -t "$backup_path/$latest_file" &>/dev/null; then
      echo "[$DATE] ❌ 备份损坏: $backup_type/$latest_file" >> "$ALERT_LOG"
      return 1
    fi
  fi
  
  return 0
}

# 发送告警（可扩展为邮件/钉钉通知）
send_alert() {
  local message=$1
  
  echo "[$DATE] 🚨 告警: $message" >> "$ALERT_LOG"
  
  # 这里可以添加邮件/钉钉通知
  # curl -X POST "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN" \
  #   -H "Content-Type: application/json" \
  #   -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$message\"}}"
  
  # 临时方案：写入系统日志
  logger -t oa-backup "$message"
}

# 主检查逻辑
main() {
  local has_error=0
  
  echo "=========================================="
  echo "  数据库备份监控"
  echo "  时间: $DATE"
  echo "=========================================="
  echo ""
  
  # 检查每日备份（最大25小时）
  if check_last_backup "daily" 25; then
    send_alert "每日备份异常！请检查备份系统"
    has_error=1
  fi
  
  # 检查每周备份（最大8天）
  if check_last_backup "weekly" 192; then
    send_alert "每周备份异常！请检查备份系统"
    has_error=1
  fi
  
  # 检查每月备份（最大32天）
  if check_last_backup "monthly" 768; then
    send_alert "每月备份异常！请检查备份系统"
    has_error=1
  fi
  
  # 检查备份完整性
  check_integrity "daily"
  check_integrity "weekly"
  check_integrity "monthly"
  
  echo ""
  if [ $has_error -eq 0 ]; then
    echo "✅ 所有备份正常"
  else
    echo "❌ 发现备份异常，请检查日志: $ALERT_LOG"
  fi
  echo ""
}

# 运行主检查
main

exit 0
