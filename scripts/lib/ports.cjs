const net = require('net');
const { execSync } = require('child_process');
const { IS_WIN, FRONTEND_PORT, BACKEND_PORT } = require('./paths.cjs');

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
    socket.connect(port, host);
  });
}

function killPort(port) {
  if (IS_WIN) {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.includes('LISTENING')) continue;
        const parts = trimmed.split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        console.log(`Killing process on port ${port} (pid ${pid})...`);
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } catch {
          // process may have already exited
        }
      }
    } catch {
      // no listener on port
    }
    return;
  }

  try {
    execSync(`fuser -k -n tcp ${port}`, { stdio: 'ignore' });
    console.log(`Killing process on port ${port}...`);
  } catch {
    // port already free
  }
}

async function killDevPorts(ports = [FRONTEND_PORT, BACKEND_PORT]) {
  for (const port of ports) {
    if (await isPortOpen(port)) {
      killPort(port);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  console.log(`Ports ${ports.join(' and ')} are free.`);
}

module.exports = { isPortOpen, killPort, killDevPorts };
