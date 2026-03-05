#!/bin/bash
# 数据库自动备份脚本
# 支持多种备份策略：每日备份、每周备份、每月备份

# 配置
BACKUP_DIR="/root/.openclaw/workspace/oa-project/backups"
DB_FILE="/root/.openclaw/workspace/oa-project/data/oa.db"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +%Y-%m-%d\ %H:%M:%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

# 日志函数
log() {
  echo "[$TIMESTAMP] $1" >> "$BACKUP_DIR/backup.log"
  echo "[$TIMESTAMP] $1"
}

# 备份函数
backup() {
  local backup_type=$1
  local backup_path="$BACKUP_DIR/$backup_type"
  local backup_file="$backup_path/oa_backup_${DATE}.db"
  
  # 检查数据库文件是否存在
  if [ ! -f "$DB_FILE" ]; then
    log "❌ 数据库文件不存在: $DB_FILE"
    return 1
  fi
  
  # 创建备份
  cp "$DB_FILE" "$backup_file"
  
  # 压缩备份（可选）
  if command -v gzip &> /dev/null; then
    gzip "$backup_file"
    backup_file="$backup_file.gz"
  fi
  
  # 记录备份信息
  local size=$(du -h "$backup_file" | cut -f1)
  log "✅ 备份成功: $backup_file (大小: $size)"
  
  # 清理旧备份
  cleanup_old_backups "$backup_type"
  
  return 0
}

# 清理旧备份
cleanup_old_backups() {
  local backup_type=$1
  local backup_path="$BACKUP_DIR/$backup_type"
  local keep_count=0
  
  case $backup_type in
    daily)
      keep_count=7    # 保留7天
      ;;
    weekly)
      keep_count=4    # 保留4周
      ;;
    monthly)
      keep_count=12   # 保留12个月
      ;;
  esac
  
  # 删除超出数量的旧备份
  local count=$(ls -1 "$backup_path" | wc -l)
  if [ $count -gt $keep_count ]; then
    local delete_count=$((count - keep_count))
    ls -1t "$backup_path" | tail -n $delete_count | while read file; do
      rm -f "$backup_path/$file"
      log "🗑️  删除旧备份: $file"
    done
  fi
}

# 验证备份
verify_backup() {
  local backup_file=$1
  
  if [ ! -f "$backup_file" ]; then
    log "❌ 备份文件不存在: $backup_file"
    return 1
  fi
  
  # 解压（如果是压缩文件）
  local temp_file="$backup_file"
  if [[ "$backup_file" == *.gz ]]; then
    temp_file=$(mktemp)
    gunzip -c "$backup_file" > "$temp_file"
  fi
  
  # 检查数据库完整性
  if sqlite3 "$temp_file" "PRAGMA integrity_check;" | grep -q "ok"; then
    log "✅ 备份验证通过: $backup_file"
    
    # 清理临时文件
    if [[ "$backup_file" == *.gz ]]; then
      rm -f "$temp_file"
    fi
    
    return 0
  else
    log "❌ 备份验证失败: $backup_file"
    
    # 清理临时文件
    if [[ "$backup_file" == *.gz ]]; then
      rm -f "$temp_file"
    fi
    
    return 1
  fi
}

# 恢复备份
restore() {
  local backup_file=$1
  
  if [ ! -f "$backup_file" ]; then
    log "❌ 备份文件不存在: $backup_file"
    return 1
  fi
  
  # 创建当前数据库的备份（以防万一）
  local current_backup="$BACKUP_DIR/oa_before_restore_${DATE}.db"
  cp "$DB_FILE" "$current_backup"
  gzip "$current_backup"
  log "✅ 当前数据库已备份: $current_backup.gz"
  
  # 解压（如果是压缩文件）
  local restore_file="$backup_file"
  if [[ "$backup_file" == *.gz ]]; then
    restore_file=$(mktemp)
    gunzip -c "$backup_file" > "$restore_file"
  fi
  
  # 验证备份文件
  if ! sqlite3 "$restore_file" "PRAGMA integrity_check;" | grep -q "ok"; then
    log "❌ 备份文件损坏，恢复失败"
    [ -f "$restore_file" ] && [ "$restore_file" != "$backup_file" ] && rm -f "$restore_file"
    return 1
  fi
  
  # 停止后端服务
  log "⏸️  停止后端服务..."
  systemctl stop oa-backend
  
  # 恢复数据库
  cp "$restore_file" "$DB_FILE"
  log "✅ 数据库已恢复: $backup_file"
  
  # 清理临时文件
  if [[ "$backup_file" == *.gz ]]; then
    rm -f "$restore_file"
  fi
  
  # 重启后端服务
  log "▶️  重启后端服务..."
  systemctl start oa-backend
  
  log "✅ 恢复完成"
  return 0
}

# 列出所有备份
list_backups() {
  echo "=========================================="
  echo "  数据库备份列表"
  echo "=========================================="
  echo ""
  
  echo "【每日备份】(最近7天)"
  ls -lht "$BACKUP_DIR/daily" 2>/dev/null | head -8
  echo ""
  
  echo "【每周备份】(最近4周)"
  ls -lht "$BACKUP_DIR/weekly" 2>/dev/null | head -5
  echo ""
  
  echo "【每月备份】(最近12个月)"
  ls -lht "$BACKUP_DIR/monthly" 2>/dev/null | head -13
  echo ""
  
  echo "【备份统计】"
  echo "  每日备份: $(ls -1 "$BACKUP_DIR/daily" 2>/dev/null | wc -l) 个"
  echo "  每周备份: $(ls -1 "$BACKUP_DIR/weekly" 2>/dev/null | wc -l) 个"
  echo "  每月备份: $(ls -1 "$BACKUP_DIR/monthly" 2>/dev/null | wc -l) 个"
  echo ""
}

# 检查备份状态
status() {
  echo "=========================================="
  echo "  数据库备份状态"
  echo "=========================================="
  echo ""
  
  # 检查数据库
  if [ -f "$DB_FILE" ]; then
    local db_size=$(du -h "$DB_FILE" | cut -f1)
    local db_date=$(stat -c %y "$DB_FILE" | cut -d. -f1)
    echo "✅ 数据库文件: $DB_FILE"
    echo "   大小: $db_size"
    echo "   修改时间: $db_date"
  else
    echo "❌ 数据库文件不存在"
  fi
  echo ""
  
  # 检查备份目录
  if [ -d "$BACKUP_DIR" ]; then
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    echo "✅ 备份目录: $BACKUP_DIR"
    echo "   总大小: $total_size"
  else
    echo "❌ 备份目录不存在"
  fi
  echo ""
  
  # 最新备份
  local latest_backup=$(find "$BACKUP_DIR" -name "*.db.gz" -o -name "*.db" | xargs ls -t 2>/dev/null | head -1)
  if [ -n "$latest_backup" ]; then
    local backup_date=$(stat -c %y "$latest_backup" | cut -d. -f1)
    echo "✅ 最新备份: $latest_backup"
    echo "   备份时间: $backup_date"
  else
    echo "⚠️  未找到备份文件"
  fi
  echo ""
}

# 主逻辑
case "$1" in
  daily)
    backup "daily"
    ;;
  weekly)
    backup "weekly"
    ;;
  monthly)
    backup "monthly"
    ;;
  all)
    backup "daily"
    backup "weekly"
    backup "monthly"
    ;;
  restore)
    if [ -z "$2" ]; then
      echo "用法: $0 restore <备份文件路径>"
      echo ""
      echo "可用备份:"
      find "$BACKUP_DIR" -name "*.db.gz" -o -name "*.db" | sort -r
      exit 1
    fi
    restore "$2"
    ;;
  verify)
    if [ -z "$2" ]; then
      echo "用法: $0 verify <备份文件路径>"
      exit 1
    fi
    verify_backup "$2"
    ;;
  list)
    list_backups
    ;;
  status)
    status
    ;;
  *)
    echo "用法: $0 {daily|weekly|monthly|all|restore|verify|list|status}"
    echo ""
    echo "命令说明:"
    echo "  daily    - 每日备份（保留7天）"
    echo "  weekly   - 每周备份（保留4周）"
    echo "  monthly  - 每月备份（保留12个月）"
    echo "  all      - 执行所有备份"
    echo "  restore  - 恢复备份"
    echo "  verify   - 验证备份"
    echo "  list     - 列出所有备份"
    echo "  status   - 查看备份状态"
    exit 1
    ;;
esac

exit 0
