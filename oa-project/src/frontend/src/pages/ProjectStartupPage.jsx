import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, Upload, DatePicker, message, Row, Col, Progress, Tag } from 'antd';
import { PlusOutlined, UploadOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const ProjectStartupPage = () => {
  const [milestones, setMilestones] = useState([]);
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [milestoneForm] = Form.useForm();
  const [docForm] = Form.useForm();
  const [selectedProject, setSelectedProject] = useState(null);

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

  const fetchMilestones = async (projectId) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/project-startup/milestones', {
        params: { project_id: projectId }
      });
      if (res.data.success) {
        setMilestones(res.data.data);
      }
    } catch (error) {
      message.error('获取里程碑失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocs = async (projectId) => {
    try {
      const res = await axios.get('/api/project-startup/docs', {
        params: { project_id: projectId }
      });
      if (res.data.success) {
        setDocs(res.data.data);
      }
    } catch (error) {
      message.error('获取文档失败');
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    fetchMilestones(projectId);
    fetchDocs(projectId);
  };

  const handleAddMilestone = () => {
    if (!selectedProject) {
      message.warning('请先选择项目');
      return;
    }
    milestoneForm.resetFields();
    setMilestoneModal(true);
  };

  const handleAddDoc = () => {
    if (!selectedProject) {
      message.warning('请先选择项目');
      return;
    }
    docForm.resetFields();
    setDocModal(true);
  };

  const handleSubmitMilestone = async (values) => {
    try {
      const data = {
        ...values,
        project_id: selectedProject,
        created_by: 1
      };

      const res = await axios.post('/api/project-startup/milestones', data);
      if (res.data.success) {
        message.success('里程碑创建成功');
        setMilestoneModal(false);
        fetchMilestones(selectedProject);
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleSubmitDoc = async (values) => {
    try {
      const data = {
        ...values,
        project_id: selectedProject,
        attachments: values.attachments ? values.attachments.map(f => f.name) : [],
        created_by: 1
      };

      const res = await axios.post('/api/project-startup/docs', data);
      if (res.data.success) {
        message.success(res.data.message);
        setDocModal(false);
        fetchDocs(selectedProject);
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return '#52c41a';
    if (percent >= 50) return '#1890ff';
    return '#faad14';
  };

  const milestoneColumns = [
    {
      title: '里程碑名称',
      dataIndex: 'milestone_name',
      key: 'milestone_name',
      width: 200
    },
    {
      title: '类型',
      dataIndex: 'milestone_type',
      key: 'milestone_type',
      width: 120
    },
    {
      title: '计划时间',
      key: 'planned',
      width: 200,
      render: (_, record) => `${record.planned_start_date} ~ ${record.planned_end_date}`
    },
    {
      title: '进度',
      dataIndex: 'progress_percent',
      key: 'progress_percent',
      width: 150,
      render: (percent) => (
        <Progress
          percent={percent || 0}
          size="small"
          strokeColor={getProgressColor(percent)}
        />
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          pending: { text: '待开始', color: 'default' },
          in_progress: { text: '进行中', color: 'blue' },
          completed: { text: '已完成', color: 'green' },
          delayed: { text: '已延期', color: 'red' }
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '负责人',
      dataIndex: 'responsible_name',
      key: 'responsible_name',
      width: 100
    }
  ];

  const docColumns = [
    {
      title: '文档类型',
      dataIndex: 'doc_type',
      key: 'doc_type',
      width: 150,
      render: (type) => {
        const typeMap = {
          overview: '项目概况',
          milestone: '关键里程碑',
          construction_design: '施工组织设计',
          site_plan: '现场平面布置图',
          start_application: '开工申请'
        };
        return typeMap[type] || type;
      }
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
      render: (status) => {
        const statusMap = {
          pending: { text: '待审批', color: 'orange' },
          approved: { text: '已通过', color: 'green' },
          rejected: { text: '已拒绝', color: 'red' }
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      }
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
      <Card title="项目启动会管理">
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

        <Tabs defaultActiveKey="milestones">
          <TabPane tab="关键里程碑" key="milestones">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddMilestone}
              style={{ marginBottom: 16 }}
            >
              添加里程碑
            </Button>
            <Table
              columns={milestoneColumns}
              dataSource={milestones}
              rowKey="id"
              loading={loading}
            />
          </TabPane>

          <TabPane tab="启动文档" key="docs">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddDoc}
              style={{ marginBottom: 16 }}
            >
              创建文档
            </Button>
            <Table
              columns={docColumns}
              dataSource={docs}
              rowKey="id"
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 里程碑弹窗 */}
      <Modal
        title="添加里程碑"
        open={milestoneModal}
        onCancel={() => setMilestoneModal(false)}
        onOk={() => milestoneForm.submit()}
        width={600}
      >
        <Form form={milestoneForm} layout="vertical" onFinish={handleSubmitMilestone}>
          <Form.Item label="里程碑名称" name="milestone_name" rules={[{ required: true }]}>
            <Input placeholder="请输入里程碑名称" />
          </Form.Item>
          <Form.Item label="里程碑类型" name="milestone_type">
            <Select placeholder="请选择类型">
              <Option value="foundation">基础施工</Option>
              <Option value="structure">主体结构</Option>
              <Option value="decoration">装饰装修</Option>
              <Option value="completion">竣工验收</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="计划开始日期" name="planned_start_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="计划结束日期" name="planned_end_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="负责人" name="responsible_user_id">
            <Select placeholder="请选择负责人">
              <Option value={2}>张三（项目经理）</Option>
            </Select>
          </Form.Item>
          <Form.Item label="说明" name="description">
            <TextArea rows={3} placeholder="请输入说明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 文档弹窗 */}
      <Modal
        title="创建启动文档"
        open={docModal}
        onCancel={() => setDocModal(false)}
        onOk={() => docForm.submit()}
        width={600}
      >
        <Form form={docForm} layout="vertical" onFinish={handleSubmitDoc}>
          <Form.Item label="文档类型" name="doc_type" rules={[{ required: true }]}>
            <Select placeholder="请选择文档类型">
              <Option value="overview">项目概况</Option>
              <Option value="milestone">关键里程碑</Option>
              <Option value="construction_design">施工组织设计</Option>
              <Option value="site_plan">现场平面布置图</Option>
              <Option value="start_application">开工申请</Option>
            </Select>
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

export default ProjectStartupPage;
