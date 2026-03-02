import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select

function PaymentPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { const res = await axios.get('/payments'); setData(res.data) } catch (e) { message.error('加载失败') }
    setLoading(false)
  }
  React.useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.post('/payments', values)
      message.success('申请创建成功')
      setModal(false)
      load()
    } catch (e) { message.error(e.response?.data?.error || '创建失败') }
  }

  const columns = [
    { title: '申请编号', dataIndex: 'code', width: 130 },
    { title: '项目', dataIndex: 'project_name', width: 150 },
    { title: '类型', dataIndex: 'type', width: 100, render: v => {
      const map = { income_progress: '收入进度款', expense_labor: '人工费', expense_material: '物资到货款' }
      return <Tag>{map[v] || v}</Tag>
    }},
    { title: '金额', dataIndex: 'amount', width: 120, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === 'approved' ? 'green' : 'blue'}>{v}</Tag> },
  ]

  return (
    <div>
      <Card title="工程款申请" extra={<Space>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true) }}>新建申请</Button>
      </Space>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title="新建工程款申请" open={modal} onOk={handleSubmit} onCancel={() => setModal(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="type" label="申请类型" rules={[{ required: true }]}>
            <Select>
              <Option value="income_progress">收入合同进度款</Option>
              <Option value="expense_labor">支出合同人工费</Option>
              <Option value="expense_material">支出合同物资到货款</Option>
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="申请金额"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="content" label="说明"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PaymentPage
