import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from 'axios'

function DepartmentPage() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => { loadDepartments() }, [])

  const loadDepartments = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/departments')
      setDepartments(res.data || [])
    } catch (err) {
      message.error('加载部门失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingDept(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingDept(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个部门吗？',
      onOk: async () => {
        try {
          await axios.delete(`/departments/${id}`)
          message.success('删除成功')
          loadDepartments()
        } catch (err) {
          message.error(err.response?.data?.error || '删除失败')
        }
      }
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingDept) {
        await axios.put(`/departments/${editingDept.id}`, values)
        message.success('更新成功')
      } else {
        await axios.post('/departments', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadDepartments()
    } catch (err) {
      message.error(err.response?.data?.error || '操作失败')
    }
  }

  const columns = [
    { title: '部门名称', dataIndex: 'name' },
    { title: '部门编码', dataIndex: 'code', width: 120 },
    { title: '类型', dataIndex: 'type', width: 100 },
    { title: '人数', dataIndex: 'user_count', width: 80 },
    {
      title: '操作', key: 'action', width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card title="部门管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增部门</Button>}>
        <Table dataSource={departments} columns={columns} rowKey="id" loading={loading} />
      </Card>
      <Modal title={editingDept ? '编辑部门' : '新增部门'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="code" label="部门编码"><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DepartmentPage
