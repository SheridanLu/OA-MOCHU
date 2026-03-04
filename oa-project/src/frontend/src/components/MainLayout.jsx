import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Drawer, Button } from 'antd'
import { MenuOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from './App'

const { Header, Sider, Content } = Layout

function MainLayout({ children }) {
  const { user, logout } = React.useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const menus = [
    { key: '/', label: '📊 工作台' },
    { key: '/approvals', label: '📝 我的审批' },
    { key: '/projects', label: '📁 项目立项' },
    { key: '/contracts', label: '📄 合同管理' },
    { key: '/statements', label: '📑 工程对账' },
    { key: '/payments', label: '💰 工程款申请' },
    { key: '/materials', label: '📦 物资管理' },
    { key: '/changes', label: '🔄 变更签证' },
    { key: '/completion', label: '🏁 竣工管理' },
    { key: '/qualifications', label: '🎖️ 资质预警' },
    { key: '/salary', label: '💵 工资管理' },
  ]

  if (user?.role === 'admin' || user?.role_code === 'ceo') {
    menus.push({ key: '/departments', label: '🏢 部门管理' })
    menus.push({ key: '/users', label: '👥 用户管理' })
  }

  const menuContent = (
    <Menu
      mode={isMobile ? 'vertical' : 'inline'}
      selectedKeys={[location.pathname]}
      items={menus}
      onClick={({ key }) => {
        navigate(key)
        setMobileMenuOpen(false)
      }}
    />
  )

  // 移动端布局
  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          background: '#fff',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuOpen(true)}
          />
          <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>工程项目管理</span>
          <Dropdown
            menu={{
              items: [{ key: 'logout', label: '退出', icon: <LogoutOutlined />, danger: true }],
              onClick: ({ key }) => {
                if (key === 'logout') {
                  logout()
                  navigate('/login')
                }
              }
            }}
          >
            <Avatar size="small" style={{ backgroundColor: '#1890ff', cursor: 'pointer' }}>
              {user?.name?.[0]}
            </Avatar>
          </Dropdown>
        </Header>

        <Drawer
          title="菜单"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={220}
        >
          {menuContent}
        </Drawer>

        <Content style={{
          padding: 12,
          background: '#f0f2f5',
          minHeight: 'calc(100vh - 64px)'
        }}>
          <div style={{
            background: '#fff',
            padding: 12,
            borderRadius: 8,
            minHeight: 'calc(100vh - 88px)',
            overflow: 'auto'
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    )
  }

  // PC端布局
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={200}
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <span style={{
            fontSize: collapsed ? 12 : 16,
            fontWeight: 'bold',
            color: '#1890ff',
            whiteSpace: 'nowrap'
          }}>
            {collapsed ? 'OA' : '工程项目管理'}
          </span>
        </div>
        {menuContent}
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>欢迎，{user?.name}</span>
          <Dropdown
            menu={{
              items: [{ key: 'logout', label: '退出', danger: true }],
              onClick: ({ key }) => {
                if (key === 'logout') {
                  logout()
                  navigate('/login')
                }
              }
            }}
          >
            <div style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#1890ff' }}>{user?.name?.[0]}</Avatar>
              <span style={{ marginLeft: 8 }}>{user?.name}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 16,
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          overflow: 'auto'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
