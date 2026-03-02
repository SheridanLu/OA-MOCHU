import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, message, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

function StatementPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { const res = await axios.get('/statements'); setData(res.data) } catch (e) { message.error('加载失败') }
    setLoading(false)
  }
  React.useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.post('/statements', values)
      message.success('对账单创建成功')
      setModal(false)
      load()
    } catch (e) { message.error(e.response?.data?.error || '创建失败') }
  }

  const columns = [
    { title: '对账单编号', dataIndex: 'code', width: 120 },
    { title: '项目', dataIndex: 'project_name', width: 150 },
    { title: '周期', dataIndex: 'period', width: 100 },
    { title: '金额', dataIndex: 'amount', width: 120, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === 'approved' ? 'green' : 'blue'}>{v}</Tag> },
    { title: '创建人', dataIndex: 'creator_name', width: 100 },
  ]

  return (
    <div>
      <Card title="工程对账单" extra={<Space>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true) }}>新建对账单</Button>
      </Space>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title="新建对账单" open={modal} onOk={handleSubmit} onCancel={() => setModal(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="period" label="周期" rules={[{ required: true }]}><Input placeholder="如: 2026-03" /></Form.Item>
          <Form.Item name="amount" label="金额"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="content" label="内容"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default StatementPage
