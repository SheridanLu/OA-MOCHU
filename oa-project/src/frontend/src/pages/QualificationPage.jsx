import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, DatePicker, Select, message, Tag, Tabs } from 'antd'
import { PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { TextArea } = Input

function QualificationPage() {
  const [data, setData] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => { load(); loadReminders() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/hr/qualifications')
      setData(res.data)
    } catch (e) {}
    setLoading(false)
  }

  const loadReminders = async () => {
    try {
      const res = await axios.get('/hr/qualifications/reminders')
      setReminders(res.data)
    } catch (e) {}
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.post('/hr/qualifications', values)
      message.success('添加成功')
      setModal(false)
      load()
    } catch (e) {
      message.error('添加失败')
    }
  }

  const handleRenew = async (id) => {
    try {
      await axios.put(`/hr/qualifications/${id}/renew`, { new_expire_date: '2027-01-01' })
      message.success('续期成功')
      load()
    } catch (e) {
      message.error('续期失败')
    }
  }

  const handleCheck = async () => {
    try {
      const res = await axios.post('/hr/qualifications/check')
      message.info(res.data.message)
      loadReminders()
    } catch (e) {}
  }

  const columns = [
    { title: '类型', dataIndex: 'type', width: 100, render: v => <Tag>{v}</Tag> },
    { title: '资质名称', dataIndex: 'name' },
    { title: '证书编号', dataIndex: 'cert_no', width: 150 },
    { title: '持有人', dataIndex: 'owner_name', width: 100 },
    { title: '到期日期', dataIndex: 'expire_date', width: 120 },
    { 
      title: '状态', 
      dataIndex: 'status', 
      width: 100,
      render: (v, r) => {
        const days = Math.ceil((new Date(r.expire_date) - new Date()) / 86400000)
        if (days < 0) return <Tag color="red">已过期</Tag>
        if (days < 90) return <Tag color="orange"><WarningOutlined /> 即将到期</Tag>
        return <Tag color="green">有效</Tag>
      }
    },
    { title: '操作', width: 100, render: (_, r) => <Button type="link" onClick={() => handleRenew(r.id)}>续期</Button> }
  ]

  const reminderColumns = [
    { title: '资质名称', dataIndex: 'name' },
    { title: '持有人', dataIndex: 'owner_name', width: 100 },
    { title: '到期日期', dataIndex: 'expire_date', width: 120 },
    { title: '提醒日期', dataIndex: 'remind_date', width: 120 },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={v === 'pending' ? 'orange' : 'green'}>{v}</Tag> }
  ]

  return (
    <div>
      <Card title="资质预警管理" extra={
        <Space>
          <Button onClick={handleCheck}>执行检查</Button>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true) }}>添加资质</Button>
        </Space>
      }>
        <Tabs items={[
          { key: 'list', label: '资质列表', children: <Table dataSource={data} columns={columns} rowKey="id" loading={loading} /> },
          { key: 'reminders', label: `待处理提醒 (${reminders.length})`, children: <Table dataSource={reminders} columns={reminderColumns} rowKey="id" /> }
        ]} />
      </Card>

      <Modal title="添加资质" open={modal} onOk={handleSubmit} onCancel={() => setModal(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="资质类型" rules={[{ required: true }]}>
            <Select>
              <Option value="公司资质">公司资质</Option>
              <Option value="人员证书">人员证书</Option>
            </Select>
          </Form.Item>
          <Form.Item name="name" label="资质名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="cert_no" label="证书编号"><Input /></Form.Item>
          <Form.Item name="owner_type" label="持有人类型" rules={[{ required: true }]}>
            <Select>
              <Option value="company">公司</Option>
              <Option value="user">员工</Option>
            </Select>
          </Form.Item>
          <Form.Item name="owner_name" label="持有人名称"><Input /></Form.Item>
          <Form.Item name="issue_date" label="发证日期"><Input type="date" /></Form.Item>
          <Form.Item name="expire_date" label="到期日期" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="remind_months" label="提前提醒（月）"><Input type="number" defaultValue={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default QualificationPage
