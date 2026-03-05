#!/bin/bash
# 系统健康检查脚本

cd /root/.openclaw/workspace/oa-project

echo "=========================================="
echo "  OA系统健康检查报告"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. 服务状态
echo "【1. 服务状态】"
echo "----------------------------------------"
systemctl is-active oa-backend && echo "  ✅ 后端服务运行中" || echo "  ❌ 后端服务异常"
systemctl is-active oa-frontend && echo "  ✅ 前端服务运行中" || echo "  ❌ 前端服务异常"
echo ""

# 2. 数据库状态
echo "【2. 数据库状态】"
echo "----------------------------------------"
sqlite3 data/oa.db << 'EOF'
SELECT '  项目数: ' || COUNT(*) FROM projects
UNION ALL
SELECT '  用户数: ' || COUNT(*) FROM users
UNION ALL
SELECT '  角色数: ' || COUNT(*) FROM roles
UNION ALL
SELECT '  权限数: ' || COUNT(*) FROM permissions;
EOF
echo ""

# 3. API健康检查
echo "【3. API健康检查】"
echo "----------------------------------------"
HEALTH=$(curl -s http://localhost:3001/api/health)
echo "  后端API: $(echo $HEALTH | jq -r '.status')"
echo ""

# 4. 用户登录测试
echo "【4. 用户登录测试】"
echo "----------------------------------------"
USERS=("admin:admin123" "zhangsan:123456" "lisi:123456" "wangwu:123456" "zhaoliu:123456" "sunqi:123456")
for user_pass in "${USERS[@]}"; do
  user=$(echo $user_pass | cut -d: -f1)
  pass=$(echo $user_pass | cut -d: -f2)
  token=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$user\",\"password\":\"$pass\"}" | jq -r '.token')
  if [ "$token" != "null" ] && [ "$token" != "" ]; then
    echo "  ✅ $user: 登录成功"
  else
    echo "  ❌ $user: 登录失败"
  fi
done
echo ""

# 5. 权限系统检查
echo "【5. 权限系统检查】"
echo "----------------------------------------"
ROLE_COUNT=$(sqlite3 data/oa.db "SELECT COUNT(*) FROM roles;")
PERM_COUNT=$(sqlite3 data/oa.db "SELECT COUNT(*) FROM permissions;")
ROLE_PERM_COUNT=$(sqlite3 data/oa.db "SELECT COUNT(*) FROM role_permissions;")
echo "  角色数: $ROLE_COUNT"
echo "  权限数: $PERM_COUNT"
echo "  角色权限分配: $ROLE_PERM_COUNT"
echo ""

# 6. 磁盘空间
echo "【6. 磁盘空间】"
echo "----------------------------------------"
df -h / | tail -1 | awk '{print "  总容量: "$2"\n  已用: "$3"\n  可用: "$4"\n  使用率: "$5}'
echo ""

# 7. 内存使用
echo "【7. 内存使用】"
echo "----------------------------------------"
free -h | grep "Mem:" | awk '{print "  总内存: "$2"\n  已用: "$3"\n  可用: "$4}'
echo ""

# 8. Git状态
echo "【8. Git状态】"
echo "----------------------------------------"
echo "  最后提交: $(git log -1 --format='%h %s')"
echo "  提交时间: $(git log -1 --format='%ci')"
echo ""

# 9. 访问地址
echo "【9. 访问地址】"
echo "----------------------------------------"
echo "  前端: http://43.153.149.71:3000"
echo "  后端: http://43.153.149.71:3001"
echo "  账号: admin / admin123"
echo ""

echo "=========================================="
echo "  ✅ 健康检查完成"
echo "=========================================="
