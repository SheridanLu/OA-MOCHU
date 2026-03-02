import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { TextArea } = Input

function ChangePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [changeType, setChangeType] = useState('over_purchase')
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try { const res = await axios.get('/changes'); setData(res.data) } catch (e) {}
    setLoading(false)
  }
  React.useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.post(`/changes/${changeType}`, values)
      message.success('提交成功')
      setModal(false)
      load()
    } catch (e) { message.error('提交失败') }
  }

  const columns = [
    { title: '项目', dataIndex: 'project_name', width: 150 },
    { title: '类型', dataIndex: 'type', width: 100, render: v => {
      const map = { over_purchase: '超量采购', site_visa: '现场签证', design_change: '设计变更' }
      return <Tag>{map[v] || v}</Tag>
    }},
    { title: '原因', dataIndex: 'reason' },
    { title: '金额', dataIndex: 'amount', width: 120, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === 'approved' ? 'green' : 'blue'}>{v}</Tag> },
  ]

  return (
    <div>
      <Card title="变更与签证管理" extra={<Space>
        <Button onClick={() => { setChangeType('over_purchase'); form.resetFields(); setModal(true) }}>超量采购</Button>
        <Button onClick={() => { setChangeType('site_visa'); form.resetFields(); setModal(true) }}>现场签证</Button>
        <Button type="primary" onClick={() => { setChangeType('design_change'); form.resetFields(); setModal(true) }}>设计变更</Button>
      </Space>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title={{ over_purchase: '超量采购申请', site_visa: '现场签证', design_change: '设计变更' }[changeType]} open={modal} onOk={handleSubmit} onCancel={() => setModal(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="project_id" label="项目ID" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reason" label="原因" rules={[{ required: true }]}><TextArea /></Form.Item>
          <Form.Item name="amount" label="金额"><InputNumber style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ChangePage
