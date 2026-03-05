import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, InputNumber, message, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select
const { TextArea } = Input

function ProjectPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/projects')
      setProjects(res.data || [])
    } catch (err) {
      message.error('加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await axios.post('/projects', values)
      message.success('项目创建成功')
      setModalVisible(false)
      loadProjects()
    } catch (err) {
      message.error(err.response?.data?.error || '创建失败')
    }
  }

  const columns = [
    { title: '项目编号', dataIndex: 'code', width: 140 },
    { title: '项目名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 80, render: (v) => <Tag color={v === 'entity' ? 'blue' : 'orange'}>{v === 'entity' ? '实体' : '虚拟'}</Tag> },
    { title: '甲方', dataIndex: 'party_a', width: 150 },
    { title: '合同金额', dataIndex: 'contract_amount', width: 120, render: (v) => v ? `¥${v.toLocaleString()}` : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: (v) => <Tag color={v === 'active' ? 'green' : v === 'pending' ? 'blue' : 'default'}>{v}</Tag> },
  ]

  return (
    <div>
      <Card title="项目管理" extra={<Space><Button icon={<ReloadOutlined />} onClick={loadProjects}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建项目</Button></Space>}>
        <Table dataSource={projects} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title="新建项目" open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="项目类型" rules={[{ required: true }]}>
            <Select><Option value="entity">实体项目</Option><Option value="virtual">虚拟项目</Option></Select>
          </Form.Item>
          <Form.Item name="party_a" label="甲方"><Input /></Form.Item>
          <Form.Item name="contract_amount" label="合同金额"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="location" label="项目地点"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectPage
