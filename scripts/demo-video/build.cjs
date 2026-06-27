#!/usr/bin/env node
/**
 * Automated demo video builder:
 * 1) Indian English TTS (edge-tts en-IN-PrabhatNeural)
 * 2) Playwright screen recording synced to audio duration
 * 3) ffmpeg merge + burned subtitles
 *
 * Output: docs/demo-video/output/RepoPilot-Demo.mp4
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/demo-video/output');
const AUDIO_DIR = path.join(OUT, 'audio');
const SCENES_PATH = path.join(__dirname, 'scenes.json');
const SRT_PATH = path.join(ROOT, 'docs/demo-video/subtitles.srt');

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3100';
const EMAIL = process.env.DEMO_EMAIL || 'demo@quantumsix.dev';
const PASSWORD = process.env.DEMO_PASSWORD || 'demo12345';
const VOICE = process.env.DEMO_VOICE || 'en-IN-PrabhatNeural';
const DEMO_TASK_ID = process.env.DEMO_TASK_ID || 'DT-0004';
const DEMO_CSV = `task_id,requirement\n${DEMO_TASK_ID},please label 'Sides Preview' change to 'Sides Preview 123'`;
const SUBTITLE_WORD_WINDOW = Number(process.env.SUBTITLE_WORD_WINDOW || 3);

function log(msg) {
  console.log(`\n▶ ${msg}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getFfmpeg() {
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    return 'ffmpeg';
  }
}

function audioDurationSec(file) {
  const ffmpeg = getFfmpeg();
  const out = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' });
  const text = `${out.stderr || ''}${out.stdout || ''}`;
  const m = text.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return 3;
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3]);
}

function generateTts(scenes) {
  log('Generating Indian English voice-over + word timings (edge-tts)...');
  ensureDir(AUDIO_DIR);
  const r = spawnSync('python', [path.join(__dirname, 'generate-tts.py')], {
    encoding: 'utf8',
    env: { ...process.env, DEMO_VOICE: VOICE },
  });
  if (r.status !== 0) {
    throw new Error(`TTS failed: ${r.stderr || r.stdout}`);
  }

  const durations = scenes.map((scene) => {
    const mp3 = path.join(AUDIO_DIR, `${scene.id}.mp3`);
    const wordsPath = path.join(AUDIO_DIR, `${scene.id}.words.json`);
    const wordsPayload = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
    const dur = audioDurationSec(mp3);
    console.log(`  ${scene.id}: ${dur.toFixed(1)}s, ${wordsPayload.words.length} words`);
    return { ...scene, mp3, durationSec: dur, words: wordsPayload.words };
  });
  return durations;
}

function formatSrtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function writeWordSubtitles(segments) {
  let sceneStart = 0;
  const blocks = [];
  let idx = 1;

  for (const seg of segments) {
    const words = seg.words || [];
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      const next = words[i + 1];
      const start = sceneStart + w.offset;
      const end = next
        ? sceneStart + next.offset
        : sceneStart + w.offset + w.duration + 0.05;
      const from = Math.max(0, i - SUBTITLE_WORD_WINDOW + 1);
      const line = words
        .slice(from, i + 1)
        .map((x) => x.text)
        .join(' ');
      blocks.push(`${idx}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${line}\n`);
      idx += 1;
    }
    sceneStart += seg.durationSec;
  }

  fs.writeFileSync(SRT_PATH, `${blocks.join('\n')}\n`, 'utf8');
  log(`Word subtitles (${SUBTITLE_WORD_WINDOW}-word window, ${blocks.length} cues) → ${SRT_PATH}`);
}

function concatAudio(segments) {
  const listFile = path.join(OUT, 'audio-list.txt');
  const lines = segments.map((s) => `file '${s.mp3.replace(/\\/g, '/')}'`);
  fs.writeFileSync(listFile, lines.join('\n'));
  const merged = path.join(OUT, 'voiceover.mp3');
  const ffmpeg = getFfmpeg();
  execSync(`"${ffmpeg}" -y -f concat -safe 0 -i "${listFile}" -c copy "${merged}"`, {
    stdio: 'inherit',
  });
  return merged;
}

async function recordScreen(segments) {
  log('Recording screen with Playwright (synced to voice timing)...');
  const { chromium } = require('playwright');

  ensureDir(OUT);
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
    locale: 'en-IN',
  });

  const page = await context.newPage();

  async function waitScene(seg) {
    await page.waitForTimeout(Math.ceil(seg.durationSec * 1000) + 400);
  }

  async function waitSceneWithAction(seg, action) {
    const totalMs = Math.ceil(seg.durationSec * 1000) + 400;
    const started = Date.now();
    while (Date.now() - started < totalMs) {
      await action().catch(() => undefined);
      await page.waitForTimeout(2500);
    }
  }

  async function clickIfVisible(locator, timeout = 1500) {
    if (await locator.first().isVisible({ timeout }).catch(() => false)) {
      await locator.first().click();
      await page.waitForTimeout(1500);
      return true;
    }
    return false;
  }

  async function uploadDemoTask() {
    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Upload CSV' }).click();
    await page.waitForTimeout(800);
    await page.getByLabel('CSV Content').fill(DEMO_CSV);
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForURL(/\/tasks\//, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
  }

  // Scene 01 — login page
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitScene(segments[0]);

  // Scene 02 — sign in
  await page.getByLabel('Email').fill(EMAIL);
  await page.waitForTimeout(600);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await waitScene(segments[1]);

  // Scene 03 — dashboard hold
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitScene(segments[2]);

  // Scene 04 — scroll dashboard
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await waitScene(segments[3]);

  // Scene 05 — dark mode toggle
  const appearance = page.getByText('Appearance');
  if (await appearance.isVisible().catch(() => false)) {
    await appearance.scrollIntoViewIfNeeded();
    const toggle = page.locator('button[aria-label="Toggle light and dark mode"]');
    if (await toggle.count()) {
      await toggle.first().click();
      await page.waitForTimeout(1200);
      await toggle.first().click();
    }
  }
  await waitScene(segments[4]);

  // Scene 06 — projects
  await page.getByRole('link', { name: 'Projects' }).click();
  await page.waitForLoadState('domcontentloaded');
  await waitScene(segments[5]);

  // Scene 07 — first project detail
  const projectLink = page.locator('a[href^="/projects/"]').first();
  if (await projectLink.count()) {
    await projectLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.mouse.wheel(0, 600);
  }
  await waitScene(segments[6]);

  // Scene 08 — upload DT-0004 via CSV
  await uploadDemoTask();
  await waitScene(segments[7]);

  // Scene 09 — pipeline running (overview)
  await waitScene(segments[8]);

  // Scene 10 — analysis tab + approve when ready
  await waitSceneWithAction(segments[9], async () => {
    await clickIfVisible(page.getByRole('button', { name: 'Approve Tests & Analysis' }));
    await page.getByRole('tab', { name: 'Analysis' }).click().catch(() => undefined);
  });

  // Scene 11 — code diff + approve when ready
  await waitSceneWithAction(segments[10], async () => {
    await page.getByRole('tab', { name: 'Code Diff' }).click().catch(() => undefined);
    await page.mouse.wheel(0, 400);
    await clickIfVisible(page.getByRole('button', { name: 'Approve Code' }));
  });

  // Scene 12 — validation / pull request
  await waitSceneWithAction(segments[11], async () => {
    const prTab = page.getByRole('tab', { name: 'Pull Request' });
    const valTab = page.getByRole('tab', { name: 'Validation' });
    if (await valTab.isVisible().catch(() => false)) {
      await valTab.click();
      await page.waitForTimeout(1200);
    }
    if (await prTab.isVisible().catch(() => false)) {
      await prTab.click();
    }
    await page.mouse.wheel(0, 500);
  });

  // Scene 13 — reports
  await page.getByRole('link', { name: 'Reports' }).click();
  await page.waitForLoadState('domcontentloaded');
  await page.mouse.wheel(0, 400);
  await waitScene(segments[12]);

  // Scene 14 — settings
  await page.getByRole('link', { name: 'Integrations' }).click();
  await page.waitForLoadState('domcontentloaded');
  await waitScene(segments[13]);

  // Scene 15 — closing dashboard
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitScene(segments[14]);

  const video = page.video();
  if (!video) throw new Error('No video recorded');
  const webmPath = path.join(OUT, 'screen-recording.webm');
  await context.close();
  await video.saveAs(webmPath);
  await browser.close();
  return webmPath;
}

function assembleVideo(webmPath, audioPath) {
  log('Assembling final MP4 with ffmpeg...');
  const ffmpeg = getFfmpeg();
  const mp4 = path.join(OUT, 'RepoPilot-Demo.mp4');
  const srtCopy = path.join(OUT, 'subtitles.srt');
  fs.copyFileSync(SRT_PATH, srtCopy);
  const srtForFilter = srtCopy.replace(/\\/g, '/').replace(/:/g, '\\:');

  const cmd = [
    `"${ffmpeg}"`,
    '-y',
    `-i "${webmPath}"`,
    `-i "${audioPath}"`,
    '-map 0:v:0',
    '-map 1:a:0',
    '-c:v libx264',
    '-preset fast',
    '-crf 23',
    '-c:a aac',
    '-b:a 192k',
    '-shortest',
    `-vf "subtitles='${srtForFilter}':force_style='FontName=Arial,FontSize=14,Alignment=2,MarginV=22,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=1,Outline=1,Shadow=0,WrapStyle=0'"`,
    `"${mp4}"`,
  ].join(' ');

  try {
    execSync(cmd, { stdio: 'inherit', shell: true });
  } catch {
    log('Subtitle burn failed — exporting without burned subs (SRT still available)');
    execSync(
      `"${ffmpeg}" -y -i "${webmPath}" -i "${audioPath}" -map 0:v:0 -map 1:a:0 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -shortest "${mp4}"`,
      { stdio: 'inherit', shell: true },
    );
  }
  return mp4;
}

async function main() {
  console.log('=== RepoPilot AI Demo Video Builder ===');
  console.log(`App: ${BASE_URL} | Voice: ${VOICE}`);

  ensureDir(OUT);
  const scenes = JSON.parse(fs.readFileSync(SCENES_PATH, 'utf8'));
  const segments = generateTts(scenes);
  writeWordSubtitles(segments);
  const audioPath = concatAudio(segments);

  if (process.env.SKIP_RECORDING !== '1') {
    log('Preparing demo task slot (delete existing DT-0004 if any)...');
    const prep = spawnSync('node', [path.join(__dirname, 'prepare-demo-task.cjs')], {
      encoding: 'utf8',
      env: process.env,
    });
    if (prep.status !== 0) {
      console.warn('Prepare warning:', prep.stderr || prep.stdout);
    }
  }

  const webmPath =
    process.env.SKIP_RECORDING === '1'
      ? path.join(OUT, 'screen-recording.webm')
      : await recordScreen(segments);
  if (!fs.existsSync(webmPath)) {
    throw new Error(`Missing screen recording: ${webmPath}`);
  }
  const mp4 = assembleVideo(webmPath, audioPath);

  console.log('\n✅ Demo video ready:');
  console.log(`   ${mp4}`);
  console.log(`   Subtitles: ${SRT_PATH}`);
  console.log(`   Voice: ${audioPath}`);
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
