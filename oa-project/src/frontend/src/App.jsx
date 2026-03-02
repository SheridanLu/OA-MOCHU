import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, message, Spin } from 'antd'
import axios from 'axios'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DepartmentPage from './pages/DepartmentPage'
import UserPage from './pages/UserPage'
import ProjectPage from './pages/ProjectPage'
import ContractPage from './pages/ContractPage'

const { Header, Sider, Content } = Layout

// 认证上下文
export const AuthContext = createContext(null)

// Axios 配置
axios.defaults.baseURL = '/api'
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 主布局
function MainLayout({ children }) {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { key: '/', label: '📊 工作台' },
    { key: '/projects', label: '📁 项目管理' },
    { key: '/contracts', label: '📄 合同管理' },
    { key: '/departments', label: '🏢 部门管理' },
    { key: '/users', label: '👥 用户管理' },
  ]

  const userMenu = {
    items: [
      { key: 'logout', label: '退出登录', danger: true }
    ],
    onClick: ({ key }) => {
      if (key === 'logout') handleLogout()
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          {!collapsed ? <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>工程项目OA</span> : <span style={{ fontSize: 24 }}>🏗️</span>}
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <span>欢迎，{user?.name || '用户'}</span>
          <Dropdown menu={userMenu}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Avatar style={{ backgroundColor: '#1890ff' }}>{user?.name?.[0] || 'U'}</Avatar>
              <span style={{ marginLeft: 8 }}>{user?.name}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, minHeight: 'calc(100vh - 96px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)) } catch (e) { localStorage.clear() }
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={user ? <MainLayout><DashboardPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/departments" element={user ? <MainLayout><DepartmentPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/users" element={user ? <MainLayout><UserPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/projects" element={user ? <MainLayout><ProjectPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/contracts" element={user ? <MainLayout><ContractPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default App
