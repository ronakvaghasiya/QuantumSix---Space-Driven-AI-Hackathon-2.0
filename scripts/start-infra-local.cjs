#!/usr/bin/env node
const { isPortOpen } = require('./lib/ports.cjs');
const { startQdrant } = require('./lib/qdrant.cjs');

async function main() {
  if (!(await isPortOpen(5432))) {
    console.error('PostgreSQL not running on localhost:5432.');
    if (process.platform === 'win32') {
      console.error('Start PostgreSQL service or run: npm run dev:infra (Docker)');
    } else {
      console.error('Try: sudo systemctl start postgresql');
    }
    process.exit(1);
  }
  console.log('PostgreSQL: running');

  const pid = startQdrant();
  if (pid) {
    await new Promise((r) => setTimeout(r, 2000));
    if (!(await isPortOpen(6333))) {
      console.warn('Qdrant may still be starting — check .local/qdrant/qdrant.log');
    } else {
      console.log(`Qdrant: started (pid ${pid}) → http://localhost:6333`);
    }
  }

  console.log('Infrastructure ready (no Docker). n8n skipped — optional for Phase 1.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
