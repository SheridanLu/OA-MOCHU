import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select

function UserPage() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, deptRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/departments')
      ])
      setUsers(usersRes.data || [])
      setDepartments(deptRes.data || [])
    } catch (err) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingUser(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个用户吗？',
      onOk: async () => {
        try {
          await axios.delete(`/users/${id}`)
          message.success('删除成功')
          loadData()
        } catch (err) {
          message.error(err.response?.data?.error || '删除失败')
        }
      }
    })
  }

  const handleResetPassword = async (id) => {
    Modal.confirm({
      title: '重置密码',
      content: '确定要重置密码为 123456 吗？',
      onOk: async () => {
        try {
          await axios.post(`/users/${id}/reset-password`)
          message.success('密码已重置为 123456')
        } catch (err) {
          message.error('重置失败')
        }
      }
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingUser) {
        await axios.put(`/users/${editingUser.id}`, values)
        message.success('更新成功')
      } else {
        await axios.post('/users', values)
        message.success('创建成功，默认密码: 123456')
      }
      setModalVisible(false)
      loadData()
    } catch (err) {
      message.error(err.response?.data?.error || '操作失败')
    }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', width: 100 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '邮箱', dataIndex: 'email' },
    { title: '部门', dataIndex: 'department_name', width: 120 },
    { title: '职位', dataIndex: 'position', width: 100 },
    { title: '角色', dataIndex: 'role', width: 80, render: (v) => <Tag color={v === 'admin' ? 'red' : v === 'manager' ? 'blue' : 'green'}>{v}</Tag> },
    {
      title: '操作', key: 'action', width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" onClick={() => handleResetPassword(record.id)}>重置密码</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card title="用户管理" extra={<Space><Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增用户</Button></Space>}>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title={editingUser ? '编辑用户' : '新增用户'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input disabled={!!editingUser} /></Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
          <Form.Item name="department_id" label="部门">
            <Select allowClear>{departments.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="position" label="职位"><Input /></Form.Item>
          <Form.Item name="role" label="角色">
            <Select><Option value="admin">管理员</Option><Option value="manager">主管</Option><Option value="employee">员工</Option></Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserPage
