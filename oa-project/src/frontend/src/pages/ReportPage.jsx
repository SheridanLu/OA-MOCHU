import React, { useState, useEffect } from 'react'
import { Card, Table, Statistic, Row, Col, Select, Button, DatePicker, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

function ReportPage() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [valueRatioData, setValueRatioData] = useState([])
  const [purchaseRatioData, setPurchaseRatioData] = useState([])
  const [financeData, setFinanceData] = useState([])
  const [overallData, setOverallData] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProjects()
    loadAllReports()
  }, [])

  const loadProjects = async () => {
    try {
      const res = await axios.get('/projects')
      setProjects(res.data.filter(p => p.type === 'entity'))
    } catch (e) {
      message.error('加载项目失败')
    }
  }

  const loadAllReports = async () => {
    setLoading(true)
    try {
      // 综合统计
      const overallRes = await axios.get('/reports/overall')
      setOverallData(overallRes.data)

      // 产值占比
      const valueRes = await axios.get('/reports/value-ratio')
      setValueRatioData(valueRes.data.data)

      // 采购进度
      const purchaseRes = await axios.get('/reports/purchase-ratio')
      setPurchaseRatioData(purchaseRes.data.data)

      // 收支统计
      const financeRes = await axios.get('/reports/finance')
      setFinanceData(financeRes.data.data)
    } catch (e) {
      message.error('加载报表失败')
    }
    setLoading(false)
  }

  const handleProjectChange = async (projectId) => {
    setSelectedProject(projectId)
    setLoading(true)
    try {
      const params = projectId ? { project_id: projectId } : {}
      
      const [valueRes, purchaseRes, financeRes] = await Promise.all([
        axios.get('/reports/value-ratio', { params }),
        axios.get('/reports/purchase-ratio', { params }),
        axios.get('/reports/finance', { params })
      ])

      setValueRatioData(valueRes.data.data)
      setPurchaseRatioData(purchaseRes.data.data)
      setFinanceData(financeRes.data.data)
    } catch (e) {
      message.error('加载报表失败')
    }
    setLoading(false)
  }

  const handleExport = (reportType) => {
    const params = selectedProject ? `?project_id=${selectedProject}` : ''
    window.open(`/api/reports/export/${reportType}${params}`)
  }

  const valueColumns = [
    { title: '项目编号', dataIndex: 'project_code', width: 130 },
    { title: '项目名称', dataIndex: 'project_name' },
    { title: '合同总价(万)', dataIndex: 'contract_total', width: 120, render: v => v?.toLocaleString() },
    { title: '当月产值(万)', dataIndex: 'monthly_value', width: 120, render: v => v?.toLocaleString() },
    { title: '占比(%)', dataIndex: 'value_ratio', width: 100, render: v => <span style={{ color: v > 50 ? 'green' : 'red' }}>{v}</span> }
  ]

  const purchaseColumns = [
    { title: '项目编号', dataIndex: 'project_code', width: 130 },
    { title: '项目名称', dataIndex: 'project_name' },
    { title: '材料名称', dataIndex: 'material_name', width: 150 },
    { title: '计划量', dataIndex: 'planned_quantity', width: 100 },
    { title: '已采购', dataIndex: 'purchased_quantity', width: 100 },
    { title: '占比(%)', dataIndex: 'purchase_ratio', width: 100, render: v => <span style={{ color: v > 100 ? 'red' : 'green' }}>{v}</span> }
  ]

  const financeColumns = [
    { title: '项目编号', dataIndex: 'project_code', width: 130 },
    { title: '项目名称', dataIndex: 'project_name' },
    { title: '收入合同(万)', dataIndex: 'income_contract_amount', width: 120, render: v => v?.toLocaleString() },
    { title: '已收款(万)', dataIndex: 'income_received', width: 120, render: v => v?.toLocaleString() },
    { title: '应收(万)', dataIndex: 'income_receivable', width: 100, render: v => v?.toLocaleString() },
    { title: '支出合同(万)', dataIndex: 'expense_contract_amount', width: 120, render: v => v?.toLocaleString() },
    { title: '已付款(万)', dataIndex: 'expense_paid', width: 120, render: v => v?.toLocaleString() },
    { title: '应付(万)', dataIndex: 'expense_payable', width: 100, render: v => v?.toLocaleString() }
  ]

  return (
    <div>
      <Card title="综合统计概览" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic title="项目总数" value={overallData.data?.total_projects || 0} />
          </Col>
          <Col span={4}>
            <Statistic 
              title="合同总额(万)" 
              value={overallData.data?.total_contract_amount || 0} 
              precision={2}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="收入合同(万)" 
              value={overallData.data?.total_income_amount || 0} 
              precision={2}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="支出合同(万)" 
              value={overallData.data?.total_expense_amount || 0} 
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="已收款(万)" 
              value={overallData.data?.total_received || 0} 
              precision={2}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="已付款(万)" 
              value={overallData.data?.total_paid || 0} 
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>
      </Card>

      <Card title="报表筛选" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择项目"
              allowClear
              onChange={handleProjectChange}
            >
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Card 
        title="1. 当月产值占合同比" 
        extra={<Button icon={<DownloadOutlined />} onClick={() => handleExport('value-ratio')}>导出</Button>}
        style={{ marginBottom: 16 }}
      >
        <Table 
          dataSource={valueRatioData} 
          columns={valueColumns} 
          rowKey="project_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card 
        title="2. 采购量占计划比" 
        extra={<Button icon={<DownloadOutlined />} onClick={() => handleExport('purchase-ratio')}>导出</Button>}
        style={{ marginBottom: 16 }}
      >
        <Table 
          dataSource={purchaseRatioData} 
          columns={purchaseColumns} 
          rowKey={(r, i) => `${r.project_id}-${r.material_id}-${i}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card 
        title="3. 项目收支统计" 
        extra={<Button icon={<DownloadOutlined />} onClick={() => handleExport('finance')}>导出</Button>}
      >
        <Table 
          dataSource={financeData} 
          columns={financeColumns} 
          rowKey="project_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}

export default ReportPage
