const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const QDRANT_DIR = path.join(ROOT, '.local', 'qdrant');
const QDRANT_STORAGE = path.join(QDRANT_DIR, 'storage');
const QDRANT_PID_FILE = path.join(QDRANT_DIR, 'qdrant.pid');
const QDRANT_LOG = path.join(QDRANT_DIR, 'qdrant.log');
const IS_WIN = process.platform === 'win32';

/** Dev ports — 3100 avoids common 3000 conflicts (React/Next defaults) */
const FRONTEND_PORT = 3100;
const BACKEND_PORT = 3001;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

function qdrantBinary() {
  return path.join(QDRANT_DIR, IS_WIN ? 'qdrant.exe' : 'qdrant');
}

function defaultReposPath() {
  return path.join(os.tmpdir(), 'sdlc-repos');
}

module.exports = {
  ROOT,
  QDRANT_DIR,
  QDRANT_STORAGE,
  QDRANT_PID_FILE,
  QDRANT_LOG,
  IS_WIN,
  FRONTEND_PORT,
  BACKEND_PORT,
  FRONTEND_URL,
  qdrantBinary,
  defaultReposPath,
};
