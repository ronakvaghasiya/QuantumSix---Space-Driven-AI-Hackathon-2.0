#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { QDRANT_STORAGE } = require('./lib/paths.cjs');
const { stopQdrant, startQdrant } = require('./lib/qdrant.cjs');

const collectionsDir = path.join(QDRANT_STORAGE, 'collections');

async function listApiCollections() {
  const res = await fetch('http://127.0.0.1:6333/collections');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.result?.collections || []).map((c) => c.name);
}

function listDiskCollections() {
  if (!fs.existsSync(collectionsDir)) return [];
  return fs.readdirSync(collectionsDir).filter((name) => {
    const full = path.join(collectionsDir, name);
    return fs.statSync(full).isDirectory();
  });
}

async function main() {
  console.log('=== Qdrant repair ===');

  let apiNames = [];
  try {
    apiNames = await listApiCollections();
  } catch {
    console.log('Qdrant not reachable — starting...');
    startQdrant();
    await new Promise((r) => setTimeout(r, 2000));
    apiNames = await listApiCollections();
  }

  const diskNames = listDiskCollections();
  const orphans = diskNames.filter((name) => !apiNames.includes(name));

  if (orphans.length === 0) {
    console.log('No orphaned Qdrant collections found.');
    return;
  }

  console.log(`Found orphaned collection data: ${orphans.join(', ')}`);
  console.log('Stopping Qdrant to remove stale storage...');
  stopQdrant();
  await new Promise((r) => setTimeout(r, 1000));

  for (const name of orphans) {
    const target = path.join(collectionsDir, name);
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${target}`);
  }

  console.log('Restarting Qdrant...');
  startQdrant();
  await new Promise((r) => setTimeout(r, 2000));
  console.log('Repair complete. Re-run indexing.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
