module.exports = {
  apps: [
    {
      name: 'oa-backend',
      cwd: '/root/.openclaw/workspace/oa-project/src/backend',
      script: 'index.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/root/.openclaw/workspace/oa-project/logs/backend-error.log',
      out_file: '/root/.openclaw/workspace/oa-project/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'oa-frontend',
      cwd: '/root/.openclaw/workspace/oa-project/src/frontend',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 3000',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/root/.openclaw/workspace/oa-project/logs/frontend-error.log',
      out_file: '/root/.openclaw/workspace/oa-project/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
