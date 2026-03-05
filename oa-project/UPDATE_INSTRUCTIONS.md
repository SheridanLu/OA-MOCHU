# 更新说明

## 需要在 ProjectPage.jsx 中添加的内容

### 1. 添加状态（在现有状态声明后）
```javascript
const [detailModal, setDetailModal] = useState(false)
const [selectedProjectId, setSelectedProjectId] = useState(null)
```

### 2. 添加查看详情函数
```javascript
const handleViewDetail = (projectId) => {
  setSelectedProjectId(projectId)
  setDetailModal(true)
}
```

### 3. 在操作列添加查看按钮
在 columns 定义的 action 列中添加：
```javascript
<Button type="link" size="small" onClick={() => handleViewDetail(record.id)}>
  查看详情
</Button>
```

### 4. 在页面底部添加详情弹窗组件
```jsx
<ProjectDetailModal
  visible={detailModal}
  projectId={selectedProjectId}
  onClose={() => setDetailModal(false)}
/>
```

## 快速修改方案

由于文件较大，建议手动添加以下内容：

1. 在 `const [paymentPlans, setPaymentPlans] = useState([])` 后添加：
```javascript
const [detailModal, setDetailModal] = useState(false)
const [selectedProjectId, setSelectedProjectId] = useState(null)

const handleViewDetail = (projectId) => {
  setSelectedProjectId(projectId)
  setDetailModal(true)
}
```

2. 找到操作列（action列），在现有按钮后添加查看详情按钮

3. 在组件返回的JSX最后，`</Card>` 之前添加：
```jsx
<ProjectDetailModal
  visible={detailModal}
  projectId={selectedProjectId}
  onClose={() => setDetailModal(false)}
/>
```
