import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
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
import CompletionPage from './pages/CompletionPage'
import MainLayout from './components/MainLayout'

export const AuthContext = createContext(null)

axios.defaults.baseURL = '/api'
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
axios.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
  }
  return Promise.reject(e)
})

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)) } catch {}
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

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin /></div>
  }

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
        <Route path="/completion" element={user ? <MainLayout><CompletionPage /></MainLayout> : <Navigate to="/login" />} />
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
