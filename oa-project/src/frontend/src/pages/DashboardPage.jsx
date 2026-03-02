import React, { useContext, useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag } from 'antd'
import { TeamOutlined, ProjectOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { AuthContext } from '../App'
import axios from 'axios'

function DashboardPage() {
  const { user } = useContext(AuthContext)
  const [stats, setStats] = useState({ projects: {}, contracts: {}, pendingApprovals: 0 })
  const [recentProjects, setRecentProjects] = useState([])

  useEffect(() => {
    loadStats()
    loadProjects()
  }, [])

  const loadStats = async () => {
    try {
      const res = await axios.get('/dashboard/stats')
      setStats(res.data || {})
    } catch (err) {
      console.error('加载统计失败:', err)
    }
  }

  const loadProjects = async () => {
    try {
      const res = await axios.get('/dashboard/recent-projects')
      setRecentProjects(res.data || [])
    } catch (err) {
      console.error('加载项目失败:', err)
    }
  }

  const columns = [
    { title: '项目编号', dataIndex: 'code', width: 120 },
    { title: '项目名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 80, render: (v) => <Tag color={v === 'entity' ? 'blue' : 'orange'}>{v === 'entity' ? '实体' : '虚拟'}</Tag> },
    { title: '状态', dataIndex: 'status', width: 80, render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>工作台</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="项目总数" value={stats.projects?.total || 0} prefix={<ProjectOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="合同总数" value={stats.contracts?.total || 0} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="待审批" value={stats.pendingApprovals || 0} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="年假余额" value={user?.annual_leave || 0} suffix="天" /></Card>
        </Col>
      </Row>
      <Card title="最近项目">
        <Table dataSource={recentProjects} columns={columns} rowKey="id" pagination={false} size="small" />
      </Card>
    </div>
  )
}

export default DashboardPage
