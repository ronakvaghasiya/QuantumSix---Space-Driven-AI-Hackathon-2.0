#!/usr/bin/env node
const fs = require('fs');
const { spawn } = require('child_process');
const { qdrantBinary } = require('./lib/qdrant.cjs');
const { ROOT } = require('./lib/paths.cjs');

if (!fs.existsSync(qdrantBinary())) {
  console.error('First time? Run: npm run setup:local');
  process.exit(1);
}

const infra = spawn('node', ['scripts/start-infra-local.cjs'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
});

infra.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);

  const killPorts = spawn('node', ['scripts/kill-dev-ports.cjs'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  killPorts.on('exit', (killCode) => {
    if (killCode !== 0) process.exit(killCode ?? 1);
    const { FRONTEND_PORT, BACKEND_PORT } = require('./lib/paths.cjs');
    console.log(`==> Starting Backend (${BACKEND_PORT}) + Frontend (${FRONTEND_PORT})...`);
    const dev = spawn('npm', ['run', 'dev'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    dev.on('exit', (devCode) => process.exit(devCode ?? 0));
  });
});
