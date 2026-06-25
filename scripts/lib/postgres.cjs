const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { isPortOpen } = require('./ports.cjs');
const { IS_WIN, ROOT } = require('./paths.cjs');

const DB_USER = 'sdlc';
const DB_PASS = 'sdlc_secret';
const DB_NAME = 'sdlc_platform';
const DB_URL = `postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}`;

function findPsqlPath() {
  if (IS_WIN) {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    try {
      const versions = fs.readdirSync(path.join(programFiles, 'PostgreSQL'));
      for (const ver of versions.sort().reverse()) {
        const candidate = path.join(programFiles, 'PostgreSQL', ver, 'bin', 'psql.exe');
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch {
      // not installed in default location
    }
  }
  return 'psql';
}

function hasPsql() {
  const psql = findPsqlPath();
  if (psql !== 'psql' && fs.existsSync(psql)) return true;
  const cmd = IS_WIN ? 'where psql' : 'command -v psql';
  const result = spawnSync(IS_WIN ? 'cmd' : 'sh', IS_WIN ? ['/c', cmd] : ['-c', cmd], {
    encoding: 'utf8',
  });
  return result.status === 0;
}

function runPsql(sql, opts = {}) {
  const user = opts.user || 'postgres';
  const psql = findPsqlPath();
  const args = ['-U', user, '-h', 'localhost', '-p', '5432', '-tAc', sql];
  const env = { ...process.env };
  if (opts.password) env.PGPASSWORD = opts.password;
  else if (process.env.PGPASSWORD) env.PGPASSWORD = process.env.PGPASSWORD;
  else if (IS_WIN) env.PGPASSWORD = 'postgres';

  const quoted = (s) => (IS_WIN ? `"${s}"` : `"${s.replace(/"/g, '\\"')}"`);
  const cmd = IS_WIN
    ? `"${psql}" ${args.map(quoted).join(' ')}`
    : `psql ${args.map((a) => `"${a}"`).join(' ')}`;

  return execSync(cmd, {
    encoding: 'utf8',
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function roleExists() {
  return runPsql(`SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'`) === '1';
}

function databaseExists() {
  return runPsql(`SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'`) === '1';
}

async function ensurePostgres() {
  let open = await isPortOpen(5432);

  if (!open && IS_WIN) {
    console.log('PostgreSQL not detected — attempting install via winget...');
    try {
      execSync(
        'winget install -e --id PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements',
        { stdio: 'inherit' },
      );
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (await isPortOpen(5432)) {
          open = true;
          break;
        }
      }
    } catch {
      // winget may fail without admin — fall through to manual instructions
    }
  }

  if (!open) {
    const msg = IS_WIN
      ? 'PostgreSQL not running on localhost:5432. Install via winget/EDB installer or use Docker (npm run dev:infra).'
      : 'PostgreSQL not running on localhost:5432. Start postgresql or use Docker (npm run dev:infra).';
    throw new Error(msg);
  }

  if (!hasPsql()) {
    console.log('PostgreSQL port is open (psql CLI not in PATH — skipping DB bootstrap).');
    console.log(`Ensure database exists: ${DB_URL}`);
    return;
  }

  console.log('Creating database user and database...');
  if (!roleExists()) {
    runPsql(`CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';`);
  }
  if (!databaseExists()) {
    runPsql(`CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};`);
  }
  try {
    runPsql(`GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};`);
  } catch {
    // non-fatal
  }
  console.log(`PostgreSQL OK → ${DB_URL}`);
}

function syncBackendEnv() {
  const backendEnv = path.join(ROOT, 'backend', '.env');
  const rootEnv = path.join(ROOT, '.env');
  const exampleEnv = path.join(ROOT, '.env.example');
  const { defaultReposPath } = require('./paths.cjs');
  const reposPath = defaultReposPath().replace(/\\/g, '/');

  const fixReposPath = (content) => {
    if (/^REPOS_BASE_PATH=/m.test(content)) {
      return content.replace(/^REPOS_BASE_PATH=.*$/m, `REPOS_BASE_PATH=${reposPath}`);
    }
    return `${content}\nREPOS_BASE_PATH=${reposPath}\n`;
  };

  if (fs.existsSync(backendEnv)) {
    const content = fs.readFileSync(backendEnv, 'utf8');
    const current = content.match(/^REPOS_BASE_PATH=(.*)$/m)?.[1] || '';
    if (current !== reposPath && (current.startsWith('/tmp/') || current === '')) {
      fs.writeFileSync(backendEnv, fixReposPath(content));
      console.log(`Updated backend/.env REPOS_BASE_PATH=${reposPath}`);
    } else {
      console.log('backend/.env exists — OK');
    }
    return;
  }

  let source = null;
  if (fs.existsSync(rootEnv)) source = rootEnv;
  else if (fs.existsSync(exampleEnv)) source = exampleEnv;

  if (!source) {
    console.warn('No .env or .env.example found — create backend/.env manually.');
    return;
  }

  const content = fixReposPath(fs.readFileSync(source, 'utf8'));
  fs.writeFileSync(backendEnv, content);
  console.log(`Created backend/.env from ${path.basename(source)} (REPOS_BASE_PATH=${reposPath})`);
}

module.exports = { ensurePostgres, syncBackendEnv, DB_URL };
