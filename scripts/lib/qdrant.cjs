const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { execSync } = require('child_process');
const {
  QDRANT_DIR,
  QDRANT_STORAGE,
  QDRANT_PID_FILE,
  QDRANT_LOG,
  IS_WIN,
  qdrantBinary,
} = require('./paths.cjs');

const QDRANT_VERSION = 'v1.12.5';

function qdrantAsset() {
  const arch = process.arch;
  if (IS_WIN) {
    if (arch !== 'x64' && arch !== 'arm64') {
      throw new Error(`Unsupported Windows arch: ${arch}`);
    }
    return {
      url: `https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-pc-windows-msvc.zip`,
      archive: 'zip',
    };
  }
  if (arch === 'x64') {
    return {
      url: `https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-unknown-linux-gnu.tar.gz`,
      archive: 'tar.gz',
    };
  }
  if (arch === 'arm64') {
    return {
      url: `https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-aarch64-unknown-linux-gnu.tar.gz`,
      archive: 'tar.gz',
    };
  }
  throw new Error(`Unsupported arch: ${arch}`);
}

async function downloadQdrant() {
  const bin = qdrantBinary();
  if (fs.existsSync(bin)) {
    console.log('Qdrant binary already exists.');
    return bin;
  }

  fs.mkdirSync(QDRANT_DIR, { recursive: true });
  fs.mkdirSync(QDRANT_STORAGE, { recursive: true });

  const { url, archive } = qdrantAsset();
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qdrant-'));
  const archivePath = path.join(tmpDir, `qdrant.${archive === 'zip' ? 'zip' : 'tar.gz'}`);

  console.log('Downloading Qdrant binary...');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download Qdrant (${res.status}): ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(archivePath, buf);

  if (archive === 'zip') {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${archivePath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' },
    );
    const extracted = path.join(tmpDir, 'qdrant.exe');
    if (!fs.existsSync(extracted)) {
      throw new Error('qdrant.exe not found in downloaded archive');
    }
    fs.copyFileSync(extracted, bin);
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: 'inherit' });
    const extracted = path.join(tmpDir, 'qdrant');
    if (!fs.existsSync(extracted)) {
      throw new Error('qdrant binary not found in downloaded archive');
    }
    fs.copyFileSync(extracted, bin);
    fs.chmodSync(bin, 0o755);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`Qdrant binary installed at ${bin}`);
  return bin;
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid() {
  if (!fs.existsSync(QDRANT_PID_FILE)) return null;
  const pid = parseInt(fs.readFileSync(QDRANT_PID_FILE, 'utf8').trim(), 10);
  return Number.isFinite(pid) ? pid : null;
}

function startQdrant() {
  const bin = qdrantBinary();
  if (!fs.existsSync(bin)) {
    throw new Error('Qdrant not installed. Run: npm run setup:local');
  }

  const existing = readPid();
  if (existing && isProcessRunning(existing)) {
    console.log(`Qdrant: already running (pid ${existing})`);
    return existing;
  }

  fs.mkdirSync(QDRANT_STORAGE, { recursive: true });
  const logFd = fs.openSync(QDRANT_LOG, 'a');

  const child = spawn(bin, [], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
      QDRANT__STORAGE__STORAGE_PATH: QDRANT_STORAGE,
    },
    windowsHide: true,
  });
  child.unref();
  fs.writeFileSync(QDRANT_PID_FILE, String(child.pid));
  return child.pid;
}

function stopQdrant() {
  const pid = readPid();
  if (!pid) {
    console.log('Qdrant not running.');
    return;
  }
  try {
    if (IS_WIN) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    console.log('Qdrant stopped.');
  } catch {
    console.log('Qdrant process not found (already stopped).');
  }
  fs.rmSync(QDRANT_PID_FILE, { force: true });
}

module.exports = { downloadQdrant, startQdrant, stopQdrant, qdrantBinary };
