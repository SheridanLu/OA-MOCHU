import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, message, Tag, Tabs, Statistic } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { TextArea } = Input

function SalaryPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [generateModal, setGenerateModal] = useState(false)
  const [adjustModal, setAdjustModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form] = Form.useForm()
  const [adjustForm] = Form.useForm()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [summary, setSummary] = useState(null)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => { loadData(); loadSummary() }, [year, month])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/salary/salaries', { params: { year, month } })
      setData(res.data)
    } catch (e) {}
    setLoading(false)
  }

  const loadSummary = async () => {
    try {
      const res = await axios.get('/salary/salaries/summary', { params: { year, month } })
      setSummary(res.data)
    } catch (e) {}
  }

  const handleGenerate = async () => {
    try {
      const res = await axios.post('/salary/salaries/generate', { year, month })
      message.success(`已生成 ${res.data.generated} 条工资记录`)
      setGenerateModal(false)
      loadData()
      loadSummary()
    } catch (e) {
      message.error('生成失败')
    }
  }

  const handleAdjust = async () => {
    try {
      const values = await adjustForm.validateFields()
      values.adjusted_by = user.id
      await axios.put(`/salary/salaries/${editingId}`, values)
      message.success('调整成功')
      setAdjustModal(false)
      loadData()
    } catch (e) {
      message.error('调整失败')
    }
  }

  const handleSubmit = async (id) => {
    try {
      await axios.put(`/salary/salaries/${id}/submit`)
      message.success('已提交审核')
      loadData()
    } catch (e) {}
  }

  const handleApprove = async (id) => {
    try {
      await axios.put(`/salary/salaries/${id}/approve`)
      message.success('审核通过')
      loadData()
    } catch (e) {}
  }

  const handlePay = async (id) => {
    try {
      await axios.put(`/salary/salaries/${id}/pay`)
      message.success('打款完成')
      loadData()
    } catch (e) {}
  }

  const showAdjust = (record) => {
    setEditingId(record.id)
    adjustForm.setFieldsValue(record)
    setAdjustModal(true)
  }

  const statusMap = {
    draft: { text: '草稿', color: 'default' },
    adjusted: { text: '已调整', color: 'blue' },
    pending_approval: { text: '待审核', color: 'orange' },
    approved: { text: '已通过', color: 'green' },
    paid: { text: '已打款', color: 'cyan' }
  }

  const columns = [
    { title: '员工', dataIndex: 'user_name', width: 100 },
    { title: '部门', dataIndex: 'department_name', width: 120 },
    { title: '基本工资', dataIndex: 'base_salary', width: 120, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '奖金', dataIndex: 'bonus', width: 100, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '扣款', dataIndex: 'deduction', width: 100, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '实发工资', dataIndex: 'actual_salary', width: 120, render: v => `¥${(v || 0).toLocaleString()}` },
    { title: '状态', dataIndex: 'status', width: 100, render: v => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag> },
    { title: '操作', width: 200, render: (_, r) => (
      <Space>
        {(r.status === 'draft' || r.status === 'adjusted') && <Button type="link" onClick={() => showAdjust(r)}>调整</Button>}
        {r.status === 'adjusted' && <Button type="link" onClick={() => handleSubmit(r.id)}>提交</Button>}
        {r.status === 'pending_approval' && <Button type="link" onClick={() => handleApprove(r.id)}>审核</Button>}
        {r.status === 'approved' && <Button type="link" onClick={() => handlePay(r.id)}>打款</Button>}
      </Space>
    )}
  ]

  return (
    <div>
      <Card title={`${year}年${month}月工资管理`} extra={
        <Space>
          <InputNumber min={2020} max={2030} value={year} onChange={setYear} style={{ width: 80 }} />
          <InputNumber min={1} max={12} value={month} onChange={setMonth} style={{ width: 60 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenerateModal(true)}>生成工资表</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { loadData(); loadSummary() }}>刷新</Button>
        </Space>
      }>
        {summary && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 32 }}>
            <Statistic title="总人数" value={summary.total_count || 0} suffix="人" />
            <Statistic title="总金额" value={summary.total_amount || 0} prefix="¥" />
            <Statistic title="已打款" value={summary.paid_amount || 0} prefix="¥" />
            <Statistic title="待审核" value={summary.pending_amount || 0} prefix="¥" />
          </div>
        )}
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal title="生成工资表" open={generateModal} onOk={handleGenerate} onCancel={() => setGenerateModal(false)}>
        <p>将为所有 FLAG 标记的员工生成 {year}年{month}月 工资记录</p>
      </Modal>

      <Modal title="调整工资" open={adjustModal} onOk={handleAdjust} onCancel={() => setAdjustModal(false)}>
        <Form form={adjustForm} layout="vertical">
          <Form.Item name="base_salary" label="基本工资"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="bonus" label="奖金"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="deduction" label="扣款"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="adjustment_note" label="调整说明"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SalaryPage
