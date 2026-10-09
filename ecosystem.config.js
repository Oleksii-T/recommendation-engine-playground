const path = require('node:path')

module.exports = {
  apps: [
    {
      name: 'recommendation-playground',
      cwd: __dirname,
      script: 'serve',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PM2_SERVE_PATH: path.join(__dirname, 'dist'),
        PM2_SERVE_HOST: '127.0.0.1',
        PM2_SERVE_PORT: 8181,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
    },
  ],
}
