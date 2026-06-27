#!/usr/bin/env node
/** Delete demo task DT-0004 so CSV upload works during video recording. */
const API = process.env.DEMO_API_URL || 'http://localhost:3001/api/v1';
const EMAIL = process.env.DEMO_EMAIL || 'demo@quantumsix.dev';
const PASSWORD = process.env.DEMO_PASSWORD || 'demo12345';
const TASK_ID = process.env.DEMO_TASK_ID || 'DT-0004';

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.accessToken || data.access_token || data.token;
}

async function api(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  console.log(`Preparing demo task ${TASK_ID}...`);
  const token = await login();

  try {
    await api(token, `/tasks/by-task-id/${encodeURIComponent(TASK_ID)}`, { method: 'DELETE' });
    console.log(`  Deleted existing ${TASK_ID}`);
  } catch (e) {
    if (String(e.message).includes('404')) {
      console.log(`  ${TASK_ID} not found — ready for fresh upload`);
    } else {
      console.log(`  Skip delete: ${e.message}`);
    }
  }
  console.log('Demo task slot ready.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
