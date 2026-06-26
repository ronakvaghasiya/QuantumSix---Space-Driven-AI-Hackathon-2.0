#!/usr/bin/env node
/**
 * Capture full-page RepoPilot AI screenshots (all scrollable content).
 * Usage: node scripts/capture-screenshots.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:3100';
const API = 'http://localhost:3001/api/v1';
const EMAIL = 'ronak@cp.com';
const PASSWORD = 'admin@123';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const VIEWPORT_W = 1440;

const PROJECT_ID = 'cc99c556-761f-4b75-95e1-bb8b6ac12ef7';
const TASK_PR = 'ba81fc8e-a42d-4184-82ac-a8727ecf7210';
const TASK_ANALYSIS = 'b0506e9f-864f-4f1e-8d22-fcb8f55b53ba';
const TASK_CODE = '6afc3c95-b468-47af-ab40-54edc719ef5a';

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(raw));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/** Remove inner scroll locks so entire page height is visible */
async function expandScrollAreas(page) {
  await page.evaluate(() => {
    const nodes = new Set([document.documentElement, document.body]);
    const main = document.querySelector('main');
    if (main) {
      let el = main;
      while (el) {
        nodes.add(el);
        el = el.parentElement;
      }
    }
    nodes.forEach((node) => {
      node.style.overflow = 'visible';
      node.style.overflowY = 'visible';
      node.style.height = 'auto';
      node.style.minHeight = 'auto';
      node.style.maxHeight = 'none';
    });
    // Diff / code viewers only
    document.querySelectorAll('pre, [class*="diff"], [class*="Diff"]').forEach((el) => {
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
    });
  });
}

async function expandCodeDiffPanels(page) {
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      const s = window.getComputedStyle(el);
      if (s.maxHeight === '480px' || s.overflowY === 'auto' || s.overflow === 'auto') {
        const rect = el.getBoundingClientRect();
        if (rect.height >= 400 || s.maxHeight === '480px') {
          el.style.maxHeight = 'none';
          el.style.overflow = 'visible';
          el.style.height = 'auto';
        }
      }
    });
  });
}

async function getContentHeight(page) {
  return page.evaluate(() => {
    const heights = [
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.querySelector('main')?.scrollHeight ?? 0,
    ];
    return Math.ceil(Math.max(...heights)) + 80;
  });
}

/** Full capture: reset viewport → expand scroll → measure → tall screenshot */
async function shot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);

  await page.setViewportSize({ width: VIEWPORT_W, height: 900 });
  await page.waitForTimeout(opts.wait ?? 1500);

  if (opts.scrollToBottom) {
    await page.evaluate(() => {
      const main = document.querySelector('main');
      (main || window).scrollTo(0, (main || document.body).scrollHeight);
    });
    await page.waitForTimeout(600);
  }

  await expandScrollAreas(page);
  if (opts.expandDiff) await expandCodeDiffPanels(page);
  await page.waitForTimeout(500);

  const contentH = await getContentHeight(page);
  const viewportH = Math.min(Math.max(contentH, 1000), opts.maxHeight ?? 20000);

  await page.setViewportSize({ width: VIEWPORT_W, height: viewportH });
  await page.waitForTimeout(400);
  await expandScrollAreas(page);
  if (opts.expandDiff) await expandCodeDiffPanels(page);
  await page.waitForTimeout(200);

  await page.screenshot({
    path: file,
    fullPage: false,
    animations: 'disabled',
  });

  const stat = fs.statSync(file);
  console.log(`✓ ${name} (${viewportH}px tall, ${Math.round(stat.size / 1024)}KB)`);
  return file;
}

async function clickTab(page, label) {
  const tab = page.getByRole('tab', { name: label });
  if (await tab.count()) {
    await tab.first().click();
    await page.waitForTimeout(800);
    return true;
  }
  return false;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const auth = await post(`${API}/auth/login`, { email: EMAIL, password: PASSWORD });
  if (!auth.accessToken) throw new Error('Login failed');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_W, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('quantumsix_token', token);
      localStorage.setItem('quantumsix_user', JSON.stringify(user));
    },
    { token: auth.accessToken, user: auth.user },
  );

  const page = await context.newPage();

  // Login
  const loginPage = await context.newPage();
  await loginPage.addInitScript(() => {
    localStorage.removeItem('quantumsix_token');
    localStorage.removeItem('quantumsix_user');
  });
  await loginPage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await shot(loginPage, '01-login', { wait: 1000 });
  await loginPage.close();

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await shot(page, '02-dashboard', { wait: 2000 });

  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  await shot(page, '03-projects', { wait: 1500 });

  await page.goto(`${BASE}/projects/${PROJECT_ID}`, { waitUntil: 'networkidle' });
  await shot(page, '04-project-detail', { wait: 2000 });

  await page.goto(`${BASE}/projects/${PROJECT_ID}/graph`, { waitUntil: 'networkidle' });
  await shot(page, '05-knowledge-graph', { wait: 3500, maxHeight: 24000 });

  await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' });
  await shot(page, '06-tasks', { wait: 1500 });

  await page.getByRole('button', { name: /upload csv/i }).click();
  await shot(page, '07-tasks-upload-dialog', { wait: 800 });

  // BB-007 — all tabs (reload each tab for clean height)
  const taskTabs = [
    ['08-task-overview', null, 2500, {}],
    ['09-task-analysis', /^Analysis$/i, 2000, {}],
    ['10-task-tests-qa', /^Tests$/i, 2000, {}],
    ['11-task-code-diff', /code diff/i, 3000, { expandDiff: true }],
    ['12-task-validation', /^Validation$/i, 2000, {}],
    ['13-task-pull-request', /pull request/i, 2000, {}],
    ['14-task-audit', /^Audit$/i, 2000, {}],
  ];

  for (const [fname, tabRe, wait, extra] of taskTabs) {
    await page.goto(`${BASE}/tasks/${TASK_PR}`, { waitUntil: 'networkidle' });
    if (tabRe) await clickTab(page, tabRe);
    await shot(page, fname, { wait, maxHeight: 32000, ...extra });
  }

  await page.goto(`${BASE}/tasks/${TASK_ANALYSIS}`, { waitUntil: 'networkidle' });
  await shot(page, '15-task-analysis-approval', { wait: 2500, maxHeight: 24000 });

  await page.goto(`${BASE}/tasks/${TASK_CODE}`, { waitUntil: 'networkidle' });
  await clickTab(page, /code diff/i);
  await shot(page, '16-task-code-approval', { wait: 2500, maxHeight: 32000, expandDiff: true });

  await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle' });
  await shot(page, '17-reports', { wait: 2500, maxHeight: 30000 });

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await shot(page, '18-settings', { wait: 2000, maxHeight: 24000 });

  await browser.close();

  // Sync to public gallery
  const pub = path.join(__dirname, '..', 'frontend', 'public', 'screenshots');
  fs.mkdirSync(pub, { recursive: true });
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.png') || f === 'index.html') {
      fs.copyFileSync(path.join(OUT, f), path.join(pub, f));
    }
  }

  console.log(`\nScreenshots: ${OUT}`);
  console.log(`Gallery: ${BASE}/screenshots/index.html`);
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
