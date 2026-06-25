#!/usr/bin/env node
const { downloadQdrant } = require('./lib/qdrant.cjs');
const { ensurePostgres, syncBackendEnv } = require('./lib/postgres.cjs');

async function main() {
  console.log('=== RepoPilot AI — Local setup (no Docker) ===\n');
  try {
    await ensurePostgres();
  } catch (err) {
    console.warn(`PostgreSQL setup skipped: ${err.message}`);
    console.warn('Install PostgreSQL or use Docker (npm run dev:infra), then re-run setup.\n');
  }
  await downloadQdrant();
  syncBackendEnv();
  console.log('\n=== Setup complete ===');
  console.log('Next: npm run dev:local');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
