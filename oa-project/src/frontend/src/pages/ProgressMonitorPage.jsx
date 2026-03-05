import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Statistic, Table, Upload, Button, message, Tabs, List, Tag } from 'antd';
import { UploadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;

const ProgressMonitorPage = () => {
  const [designProgress, setDesignProgress] = useState({});
  const [constructionProgress, setConstructionProgress] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);

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

  const fetchDesignProgress = async (projectId) => {
    try {
      const res = await axios.get('/api/progress/design/dashboard', {
        params: { project_id: projectId }
      });
      if (res.data.success) {
        setDesignProgress(res.data.data);
      }
    } catch (error) {
      console.error('获取设计进度失败');
    }
  };

  const fetchConstructionProgress = async (projectId) => {
    try {
      const res = await axios.get('/api/progress/construction/dashboard', {
        params: { project_id: projectId }
      });
      if (res.data.success) {
        setConstructionProgress(res.data.data);
      }
    } catch (error) {
      console.error('获取施工进度失败');
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    fetchDesignProgress(projectId);
    fetchConstructionProgress(projectId);
  };

  const getProgressStatus = (percent) => {
    if (percent >= 100) return 'success';
    if (percent < 50) return 'normal';
    return 'active';
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return '#52c41a';
    if (percent < 50) return '#1890ff';
    return '#faad14';
  };

  const milestoneColumns = [
    {
      title: '里程碑名称',
      dataIndex: 'milestone_name',
      key: 'milestone_name'
    },
    {
      title: '计划结束日期',
      dataIndex: 'planned_end_date',
      key: 'planned_end_date',
      width: 120
    },
    {
      title: '进度',
      dataIndex: 'progress_percent',
      key: 'progress_percent',
      width: 200,
      render: (percent, record) => {
        const today = new Date();
        const plannedEnd = new Date(record.planned_end_date);
        const isDelayed = today > plannedEnd && percent < 100;

        return (
          <div>
            <Progress
              percent={percent || 0}
              size="small"
              status={getProgressStatus(percent)}
              strokeColor={getProgressColor(percent)}
            />
            {isDelayed && (
              <Tag color="red" style={{ marginTop: 4 }}>
                <WarningOutlined /> 进度落后
              </Tag>
            )}
          </div>
        );
      }
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
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="进度监控看板">
        <div style={{ marginBottom: 24 }}>
          <Select
            placeholder="请选择项目"
            style={{ width: 300 }}
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
          <Tabs defaultActiveKey="construction">
            <TabPane tab="施工进度监控" key="construction">
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总里程碑数"
                      value={constructionProgress.total_items || 0}
                      suffix="个"
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="已完成"
                      value={constructionProgress.completed_items || 0}
                      suffix="个"
                      valueStyle={{ color: '#52c41a' }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="剩余"
                      value={constructionProgress.remaining_items || 0}
                      suffix="个"
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="整体进度"
                      value={constructionProgress.progress_percent || 0}
                      suffix="%"
                      valueStyle={{ color: getProgressColor(constructionProgress.progress_percent) }}
                    />
                  </Card>
                </Col>
              </Row>

              <Card title="整体进度" style={{ marginBottom: 24 }}>
                <Progress
                  percent={constructionProgress.progress_percent || 0}
                  strokeColor={getProgressColor(constructionProgress.progress_percent)}
                />
              </Card>

              <Card title="里程碑进度">
                <Table
                  columns={milestoneColumns}
                  dataSource={constructionProgress.milestones || []}
                  rowKey="id"
                  pagination={false}
                />
              </Card>
            </TabPane>

            <TabPane tab="设计进度监控" key="design">
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="总需求数"
                      value={designProgress.total_items || 0}
                      suffix="处"
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="已完成"
                      value={designProgress.completed_items || 0}
                      suffix="处"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="剩余"
                      value={designProgress.remaining_items || 0}
                      suffix="处"
                      valueStyle={{ color: designProgress.remaining_items > 0 ? '#faad14' : '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="完成率"
                      value={designProgress.progress_percent || 0}
                      suffix="%"
                    />
                  </Card>
                </Col>
              </Row>

              <Card title="整体进度" style={{ marginBottom: 24 }}>
                <Progress
                  percent={designProgress.progress_percent || 0}
                  strokeColor={getProgressColor(designProgress.progress_percent)}
                />
              </Card>

              <Card title="上传答疑文件">
                <Upload
                  beforeUpload={() => false}
                  onChange={(info) => {
                    if (info.file.status === 'done') {
                      message.success('文件上传成功');
                      fetchDesignProgress(selectedProject);
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />}>上传答疑文件</Button>
                </Upload>
              </Card>
            </TabPane>
          </Tabs>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            请先选择项目
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProgressMonitorPage;
