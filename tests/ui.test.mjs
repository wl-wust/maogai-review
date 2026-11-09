import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { questions } from '../data/questions.js';

const root = path.resolve(import.meta.dirname, '..');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml'
};

let server;
let browser;
let baseUrl;

async function findChromium() {
  const cacheRoot = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  const entries = await readdir(cacheRoot, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
    .sort((left, right) => right.name.localeCompare(left.name, undefined, { numeric: true }));
  for (const entry of candidates) {
    const executable = path.join(cacheRoot, entry.name, 'chrome-win64', 'chrome.exe');
    if (existsSync(executable)) return executable;
  }
  return chromium.executablePath();
}

before(async () => {
  server = createServer(async (request, response) => {
    try {
      const requestPath = new URL(request.url, 'http://localhost').pathname;
      const relative = requestPath === '/' ? 'index.html' : decodeURIComponent(requestPath.slice(1));
      const target = path.resolve(root, relative);
      if (!target.startsWith(root)) throw new Error('invalid path');
      const body = await readFile(target);
      response.writeHead(200, { 'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: await findChromium() });
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

test('首页、主导航和移动端宽度正常', async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /毛概复习/ }).first().waitFor();
  assert.equal(await page.locator('[data-nav]').count() >= 10, true);
  await page.locator('#stat-total').waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  assert.ok(overflow <= 1, `页面横向溢出 ${overflow}px`);
  await page.close();
});

test('可以选择答案、提交并保留答题记录', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}#/quiz`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '章节练习' }).waitFor();
  await page.locator('[data-action="start-quiz"]').click();
  await page.locator('.option-button').first().waitFor();
  const question = questions[0];
  await page.locator(`[data-action="select-option"][data-key="${question.answer}"]`).click();
  await page.locator('[data-action="submit-answer"]').click();
  await page.locator('.answer-result-title strong').getByText('回答正确').waitFor();
  await page.getByText('答案解析').waitFor();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('maogai-review-state-v1'))
  );
  assert.equal(saved.answered[question.id].correctCount, 1);
  assert.deepEqual(errors, []);
  await page.close();
});
