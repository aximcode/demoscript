#!/usr/bin/env npx tsx
/**
 * Capture Visual Editor screenshots and create animated GIF
 *
 * Usage: npx tsx scripts/capture-editor-gif.ts
 *        npx tsx scripts/capture-editor-gif.ts --cloud  # Capture from cloud dashboard
 *
 * Requires:
 * - Chrome/Chromium installed
 * - ffmpeg installed
 * - For --cloud: must be logged in via `demoscript login`
 */

import puppeteer from 'puppeteer-core';
import { execSync, spawn, ChildProcess } from 'child_process';
import { mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const FRAMES_DIR = join(PROJECT_ROOT, 'assets', 'builder-frames');
const OUTPUT_GIF = join(PROJECT_ROOT, 'assets', 'builder.gif');

// Configuration - match demo.gif dimensions for consistent display
const WIDTH = 900;
const HEIGHT = 750;
const FPS = 0.4; // 2.5 seconds per frame

function findChromium(): string {
  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  try {
    const result = execSync('which chromium-browser chromium google-chrome 2>/dev/null', {
      encoding: 'utf-8',
    }).trim();
    if (result) {
      return result.split('\n')[0];
    }
  } catch {
    // Ignore
  }

  throw new Error('Chrome/Chromium not found');
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getAuthToken(): string | null {
  const configPath = join(homedir(), '.demoscript', 'config.json');
  try {
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return config.token || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

async function captureCloudBuilder(): Promise<string[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not logged in. Run `demoscript login` first.');
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: findChromium(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // Force dark mode
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  // Set auth cookie
  await page.setCookie({
    name: 'auth_token',
    value: token,
    domain: 'demoscript.app',
    path: '/',
    secure: true,
    sameSite: 'Lax',
  });

  // Also need to set localStorage for client-side auth and force dark mode
  await page.evaluateOnNewDocument((authToken) => {
    localStorage.setItem('token', authToken);
    // Force dark mode via localStorage (common pattern)
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('color-scheme', 'dark');
    // Add dark class to HTML element when DOM loads
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.add('dark');
    });
  }, token);

  // Clear and create frames directory
  if (existsSync(FRAMES_DIR)) {
    rmSync(FRAMES_DIR, { recursive: true });
  }
  mkdirSync(FRAMES_DIR, { recursive: true });

  const frames: string[] = [];
  let frameNum = 0;

  const capture = async (label: string): Promise<void> => {
    const framePath = join(FRAMES_DIR, `frame-${String(frameNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    frames.push(framePath);
    console.log(`  Frame ${frameNum}: ${label}`);
    frameNum++;
  };

  try {
    // Navigate to create new demo page
    const url = 'https://demoscript.app/dashboard/new';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2000);

    // Check if we're redirected to login
    if (page.url().includes('/login')) {
      throw new Error('Authentication failed. Try `demoscript login` again.');
    }

    // Force dark mode on the loaded page
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    });
    await sleep(500);

    // Frame 1: Click on Visual Editor tab
    console.log('Switching to Visual Editor tab...');
    const tabs = await page.$$('button.tab');
    for (const tab of tabs) {
      const text = await tab.evaluate(el => el.textContent?.trim() || '');
      if (text === 'Visual Editor') {
        await tab.click();
        break;
      }
    }
    await sleep(2500);

    // Ensure dark mode is still applied after tab switch
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await sleep(500);
    await capture('Visual Editor - step list');

    // Click on the preview area to give it focus, then use keyboard navigation
    // Preview panel is on the right side, roughly center of the screen
    console.log('Clicking preview area to set focus...');
    await page.mouse.click(600, 450);
    await sleep(500);

    // Frame 2: Navigate to step 2 (REST) using ArrowRight
    console.log('Navigating to step 2 (REST) with ArrowRight...');
    await page.keyboard.press('ArrowRight');
    await sleep(2000);
    await capture('REST step with form');

    // Frame 3: Navigate to step 3 (Done slide) using ArrowRight
    console.log('Navigating to step 3 (Done) with ArrowRight...');
    await page.keyboard.press('ArrowRight');
    await sleep(2000);
    await capture('Final slide step');

    // Frame 4: Navigate back to step 1 (Welcome) using ArrowLeft twice
    console.log('Navigating back to step 1 (Welcome) with ArrowLeft...');
    await page.keyboard.press('ArrowLeft');
    await sleep(500);
    await page.keyboard.press('ArrowLeft');
    await sleep(1500);
    await capture('Welcome slide');

    console.log(`\nCaptured ${frames.length} frames`);
  } finally {
    await page.close();
    await browser.close();
  }

  return frames;
}

async function captureLocalBuilder(port: number): Promise<string[]> {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: findChromium(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // Clear and create frames directory
  if (existsSync(FRAMES_DIR)) {
    rmSync(FRAMES_DIR, { recursive: true });
  }
  mkdirSync(FRAMES_DIR, { recursive: true });

  const frames: string[] = [];
  let frameNum = 0;

  const capture = async (label: string): Promise<void> => {
    const framePath = join(FRAMES_DIR, `frame-${String(frameNum).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    frames.push(framePath);
    console.log(`  Frame ${frameNum}: ${label}`);
    frameNum++;
  };

  try {
    const url = `http://localhost:${port}/editor`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2000);

    // Frame 1: Initial state
    await capture('Visual Editor - initial');

    // Frame 2: Click "+ Add" button
    console.log('Opening Add menu...');
    const addButton = await page.$('button[title="Add Step"]');
    if (addButton) {
      await addButton.click();
      await sleep(500);
      await capture('Add menu open');
    }

    // Frame 3: Click "REST Request"
    console.log('Adding REST step...');
    const menuItems = await page.$$('button');
    for (const btn of menuItems) {
      const text = await btn.evaluate(el => el.textContent?.trim() || '');
      if (text === 'REST Request') {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    await capture('REST step added');

    // Frame 4: Add more steps for a richer view
    console.log('Adding Slide step...');
    const addBtn2 = await page.$('button[title="Add Step"]');
    if (addBtn2) {
      await addBtn2.click();
      await sleep(300);
      const items = await page.$$('button');
      for (const btn of items) {
        const text = await btn.evaluate(el => el.textContent?.trim() || '');
        if (text === 'Slide') {
          await btn.click();
          break;
        }
      }
    }
    await sleep(1000);
    await capture('Multiple steps added');

    // Frame 5: Final state
    await sleep(500);
    await capture('Demo ready');

    console.log(`\nCaptured ${frames.length} frames`);
  } finally {
    await page.close();
    await browser.close();
  }

  return frames;
}

async function createGif(frames: string[]): Promise<void> {
  if (frames.length === 0) {
    console.error('No frames to convert');
    return;
  }

  console.log('\nCreating GIF...');

  const paletteFile = join(FRAMES_DIR, 'palette.png');

  try {
    // Generate palette for better colors
    execSync(
      `ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame-%03d.png" ` +
      `-vf "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff" ` +
      `"${paletteFile}"`,
      { stdio: 'inherit' }
    );

    // Create GIF with palette
    execSync(
      `ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame-%03d.png" -i "${paletteFile}" ` +
      `-lavfi "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" ` +
      `-loop 0 "${OUTPUT_GIF}"`,
      { stdio: 'inherit' }
    );

    const { statSync } = await import('fs');
    const stats = statSync(OUTPUT_GIF);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`\n✓ GIF created: ${OUTPUT_GIF} (${sizeMB} MB)`);
  } catch (err) {
    console.error('Error creating GIF:', err);
    throw err;
  }
}

async function main(): Promise<void> {
  const useCloud = process.argv.includes('--cloud');
  const port = process.argv.includes('--port')
    ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10)
    : 3002;

  let builderProcess: ChildProcess | null = null;

  try {
    let frames: string[];

    if (useCloud) {
      console.log('Capturing from cloud dashboard...');
      frames = await captureCloudBuilder();
    } else {
      const startBuilder = !process.argv.includes('--no-start');
      if (startBuilder) {
        console.log('Starting builder server...');
        builderProcess = spawn('node', [
          join(PROJECT_ROOT, 'packages', 'cli', 'dist', 'index.js'),
          'builder',
          '--port', String(port),
          '--no-open'
        ], {
          stdio: 'pipe',
          detached: false
        });

        console.log('Waiting for server to start...');
        await sleep(6000);
      }
      frames = await captureLocalBuilder(port);
    }

    await createGif(frames);
    console.log('\n✓ Done! Builder GIF saved to assets/builder.gif');
  } finally {
    if (builderProcess) {
      console.log('\nStopping builder server...');
      builderProcess.kill('SIGTERM');
    }
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
