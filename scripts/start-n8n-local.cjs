#!/usr/bin/env node
const { spawn } = require('child_process');

const env = {
  ...process.env,
  N8N_HOST: 'localhost',
  N8N_PORT: '5678',
  N8N_PROTOCOL: 'http',
  WEBHOOK_URL: 'http://localhost:5678/',
  N8N_BASIC_AUTH_ACTIVE: 'false',
};

console.log('Starting n8n at http://localhost:5678');
console.log('Backend API expected at http://localhost:3001\n');
console.log('After start:');
console.log('  1. Import workflows from n8n/workflows/*.json');
console.log('  2. Activate each workflow (toggle ON)');
console.log('  3. Add OpenAI credentials in n8n for AI agent nodes\n');

const n8n = spawn('npx', ['n8n'], {
  stdio: 'inherit',
  env,
  shell: true,
});

n8n.on('exit', (code) => process.exit(code ?? 0));
