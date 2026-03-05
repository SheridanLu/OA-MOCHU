import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Upload, message, Tag, Tabs, Row, Col, Alert } from 'antd';
import { PlusOutlined, UploadOutlined, EyeOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const CompletionPage = () => {
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedProject, setSelectedProject] = useState(null);
  const [checkResult, setCheckResult] = useState({});

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (error) {
      message.error('获取项目列表失败');
    }
  };

  const fetchDocs = async (projectId) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/completion/docs', {
        params: { project_id: projectId }
      });
      if (res.data.success) {
        setDocs(res.data.data);
      }
    } catch (error) {
      message.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  const checkPrerequisites = async (projectId, type) => {
    try {
      const endpoint = type === 'drawing_review' ? '/check/drawing-review' : '/check/file-review';
      const res = await axios.get(`/api/completion${endpoint}`, {
        params: { project_id: projectId }
      });
      if (res.data.success) {
        setCheckResult({ [type]: res.data });
        return res.data.canCreate;
      }
    } catch (error) {
      console.error('校验失败');
    }
    return false;
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    fetchDocs(projectId);
  };

  const handleAdd = async (type) => {
    if (!selectedProject) {
      message.warning('请先选择项目');
      return;
    }

    // 前置条件校验
    if (type === 'drawing_review' || type === 'file_review') {
      const canCreate = await checkPrerequisites(selectedProject, type);
      if (!canCreate) {
        const result = checkResult[type];
        Modal.error({
          title: '前置条件未满足',
          content: result?.reason || '无法创建此类型文档'
        });
        return;
      }
    }

    form.resetFields();
    form.setFieldsValue({ type });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        project_id: selectedProject,
        attachments: values.attachments ? values.attachments.map(f => f.name || f.url) : [],
        created_by: 1
      };

      const res = await axios.post('/api/completion/docs', data);
      if (res.data.success) {
        message.success('创建成功');
        setModalVisible(false);
        fetchDocs(selectedProject);
      }
    } catch (error) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const getTypeTag = (type) => {
    const typeMap = {
      labor_settlement: { text: '劳务竣工结算', color: 'blue' },
      project_settlement: { text: '项目竣工结算', color: 'green' },
      drawing_review: { text: '竣工图纸审核', color: 'purple' },
      file_review: { text: '竣工结算文件审核', color: 'orange' },
      archive: { text: '文档归档', color: 'default' }
    };
    const { text, color } = typeMap[type] || { text: type, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { text: '待审批', color: 'orange' },
      approved: { text: '已通过', color: 'green' },
      rejected: { text: '已拒绝', color: 'red' }
    };
    const { text, color } = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: '文档类型',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type) => getTypeTag(type)
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (val) => val?.substring(0, 16)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />}>
          查看
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="竣工管理">
        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="请选择项目"
            style={{ width: 300, marginRight: 16 }}
            onChange={handleProjectChange}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {projects.map(p => (
              <Option key={p.id} value={p.id}>{p.code} - {p.name}</Option>
            ))}
          </Select>
        </div>

        {selectedProject ? (
          <div>
            <Tabs defaultActiveKey="settlement">
              <TabPane tab="竣工结算" key="settlement">
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAdd('labor_settlement')}
                    >
                      劳务竣工结算
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAdd('project_settlement')}
                    >
                      项目竣工结算
                    </Button>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="审核文件" key="review">
                <Alert
                  message="注意"
                  description="竣工图纸审核需设计进度监控中遗留问题清零，竣工结算文件审核需工程对账单全部生成"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAdd('drawing_review')}
                    >
                      竣工图纸审核
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAdd('file_review')}
                    >
                      竣工结算文件审核
                    </Button>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="文档归档" key="archive">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('archive')}
                  style={{ marginBottom: 16 }}
                >
                  创建归档
                </Button>
              </TabPane>
            </Tabs>

            <Table
              columns={columns}
              dataSource={docs}
              rowKey="id"
              loading={loading}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            请先选择项目
          </div>
        )}
      </Card>

      <Modal
        title="创建竣工文档"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>

          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>

          <Form.Item label="内容" name="content">
            <TextArea rows={5} placeholder="请输入文档内容" />
          </Form.Item>

          <Form.Item label="附件" name="attachments">
            <Upload beforeUpload={() => false}>
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompletionPage;
