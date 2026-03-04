/**
 * 操作成功提示
 */

import React from 'react';
import { message, notification } from 'antd';

// 简单消息
export const showSuccess = (msg) => message.success(msg);
export const showError = (msg) => message.error(msg);
export const showWarning = (msg) => message.warning(msg);
export const showInfo = (msg) => message.info(msg);

// 带操作按钮的通知
export const showNotification = (type, title, description, btn) => {
  notification[type]({
    message: title,
    description,
    btn,
    duration: 5
  });
};

// 保存成功提示
export const showSaveSuccess = () => {
  message.success('保存成功');
};

// 删除确认提示
export const showDeleteConfirm = (onOk) => {
  Modal.confirm({
    title: '确认删除',
    content: '此操作不可恢复，确定要删除吗？',
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk
  });
};

// 提交成功提示
export const showSubmitSuccess = () => {
  message.success('提交成功');
};

// 网络错误提示
export const showNetworkError = () => {
  message.error('网络错误，请稍后重试');
};

// 权限错误提示
export const showPermissionError = () => {
  message.error('权限不足，无法执行此操作');
};

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showNotification,
  showSaveSuccess,
  showDeleteConfirm,
  showSubmitSuccess,
  showNetworkError,
  showPermissionError
};
