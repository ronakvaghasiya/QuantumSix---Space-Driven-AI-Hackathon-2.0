#!/usr/bin/env node
const { killDevPorts } = require('./lib/ports.cjs');
const { FRONTEND_PORT, BACKEND_PORT } = require('./lib/paths.cjs');

killDevPorts([FRONTEND_PORT, BACKEND_PORT]).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
