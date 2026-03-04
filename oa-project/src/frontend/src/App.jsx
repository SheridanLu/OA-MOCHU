import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Spin } from 'antd'
import axios from 'axios'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import ContractPage from './pages/ContractPage'
import StatementPage from './pages/StatementPage'
import PaymentPage from './pages/PaymentPage'
import MaterialPage from './pages/MaterialPage'
import ChangePage from './pages/ChangePage'
import UserPage from './pages/UserPage'
import DepartmentPage from './pages/DepartmentPage'
import ApprovalPage from './pages/ApprovalPage'
import QualificationPage from './pages/QualificationPage'
import SalaryPage from './pages/SalaryPage'

const { Header, Sider, Content } = Layout
export const AuthContext = createContext(null)

axios.defaults.baseURL = '/api'
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
axios.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401) { localStorage.clear(); window.location.href = '/login' }
  return Promise.reject(e)
})

function MainLayout({ children }) {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  
  const menus = [
    { key: '/', label: '📊 工作台' },
    { key: '/approvals', label: '📝 我的审批' },
    { key: '/projects', label: '📁 项目立项' },
    { key: '/contracts', label: '📄 合同管理' },
    { key: '/statements', label: '📑 工程对账' },
    { key: '/payments', label: '💰 工程款申请' },
    { key: '/materials', label: '📦 物资管理' },
    { key: '/changes', label: '🔄 变更签证' },
    { key: '/qualifications', label: '🎖️ 资质预警' },
    { key: '/salary', label: '💵 工资管理' },
  ]
  
  if (user?.role === 'admin' || user?.role_code === 'ceo') {
    menus.push({ key: '/departments', label: '🏢 部门管理' })
    menus.push({ key: '/users', label: '👥 用户管理' })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>工程项目管理</span>
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menus} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>欢迎，{user?.name}</span>
          <Dropdown menu={{ items: [{ key: 'logout', label: '退出', danger: true }], onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login') } } }}>
            <div style={{ cursor: 'pointer' }}><Avatar style={{ backgroundColor: '#1890ff' }}>{user?.name?.[0]}</Avatar><span style={{ marginLeft: 8 }}>{user?.name}</span></div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8 }}>{children}</Content>
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
    if (token && savedUser) { try { setUser(JSON.parse(savedUser)) } catch {} }
    setLoading(false)
  }, [])
  
  const login = (token, userData) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(userData)); setUser(userData) }
  const logout = () => { localStorage.clear(); setUser(null) }
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin /></div>
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={user ? <MainLayout><DashboardPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/approvals" element={user ? <MainLayout><ApprovalPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/projects" element={user ? <MainLayout><ProjectPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/contracts" element={user ? <MainLayout><ContractPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/statements" element={user ? <MainLayout><StatementPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/payments" element={user ? <MainLayout><PaymentPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/materials" element={user ? <MainLayout><MaterialPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/changes" element={user ? <MainLayout><ChangePage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/qualifications" element={user ? <MainLayout><QualificationPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/salary" element={user ? <MainLayout><SalaryPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/departments" element={user ? <MainLayout><DepartmentPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/users" element={user ? <MainLayout><UserPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default App
