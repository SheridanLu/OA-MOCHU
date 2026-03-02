import React, { useContext, useState } from 'react'
import { Form, Input, Button, Card, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { AuthContext } from '../App'
import axios from 'axios'

function LoginPage() {
  const { login } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await axios.post('/auth/login', {
        username: values.username,
        password: values.password,
        rememberMe: values.rememberMe
      })
      message.success('登录成功')
      login(res.data.token, res.data.user)
    } catch (err) {
      message.error(err.response?.data?.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card title={<div style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold' }}>工程项目管理OA</div>} style={{ width: 400 }}>
        <Form name="login" initialValues={{ rememberMe: true }} onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item name="rememberMe" valuePropName="checked">
            <Checkbox>记住我 (7天免登录)</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 16 }}>
          <p>测试账号: admin / admin123</p>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
