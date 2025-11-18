module.exports = {
  apps: [{
    name: 'luckyvault-keeper',
    script: 'index.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    cwd: '/home/bill/luckyvault/luckyvault/keeper',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
