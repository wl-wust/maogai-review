import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir } from 'node:fs/promises';
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
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
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

test('主观题可切换无答案、挖空和完整答案', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}#/recite`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '主观题背诵' }).waitFor();
  await page.getByText('答案已隐藏').waitFor();
  await page.getByRole('button', { name: '挖空背' }).click();
  const blank = page.locator('.cloze-blank').first();
  await blank.waitFor();
  await blank.click();
  assert.ok((await blank.innerText()).length > 1);
  await page.getByRole('button', { name: '完整答案' }).click();
  await page.locator('.answer-point').first().waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  assert.ok(overflow <= 1, `背诵页面横向溢出 ${overflow}px`);
  await page.close();
});

test('知识库搜索能同时命中题目与知识卡', async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto(`${baseUrl}#/knowledge`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/搜索知识点/).fill('毛泽东思想');
  await page.locator('.search-result').first().waitFor();
  assert.ok((await page.locator('.search-result').count()) >= 2);
  assert.ok((await page.locator('.result-kind').allInnerTexts()).includes('知识卡'));
  assert.ok((await page.locator('.result-kind').allInnerTexts()).includes('选择题'));
  await page.close();
});

test('收藏中心展示收藏并可移出错题本', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem(
      'maogai-review-state-v1',
      JSON.stringify({
        version: 1,
        answered: {
          q001: {
            attempts: 1,
            correctCount: 0,
            wrongCount: 1,
            streak: 0,
            bestStreak: 0,
            lastCorrect: false,
            lastAt: '2026-11-09T10:00:00.000Z',
            lastWrongAt: '2026-11-09T10:00:00.000Z',
            dismissedFromWrong: false
          }
        },
        favorites: { questions: ['q001'], subjective: ['s01'], knowledge: ['k01'] },
        lastSession: null,
        subjective: { index: 0, modes: {} }
      })
    );
  });
  await page.goto(`${baseUrl}#/favorites?tab=questions`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.saved-item').first().waitFor();
  assert.equal(await page.locator('.saved-item').count(), 1);
  await page.locator('[href="#/favorites?tab=wrong"]').click();
  await page.getByRole('button', { name: /移出错题本/ }).click();
  await page.getByText('当前没有错题').waitFor();
  assert.deepEqual(errors, []);
  await page.close();
});

test('PWA 首次缓存后可在断网状态打开', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const manifestStatus = await page.request.get(`${baseUrl}/manifest.webmanifest`);
  assert.equal(manifestStatus.status(), 200);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /毛概复习/ }).first().waitFor();
  await page.goto(`${baseUrl}#/recite`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '主观题背诵' }).waitFor();
  assert.deepEqual(errors, []);
  await context.setOffline(false);
  await context.close();
});

test('手机、平板和桌面视口无横向溢出并生成验收截图', { timeout: 90000 }, async () => {
  const screenshotDir = path.join(root, 'screenshots');
  await mkdir(screenshotDir, { recursive: true });
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height }
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#stat-total').waitFor();
    await page.waitForTimeout(320);
    await assertNoOverflow(page, `首页/${viewport.name}`);
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-home.png`) });

    await page.goto(`${baseUrl}#/knowledge`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder(/搜索知识点/).fill('农村包围城市');
    await page.locator('.search-result').first().waitFor();
    await page.waitForTimeout(320);
    await assertNoOverflow(page, `知识库/${viewport.name}`);
    await page.screenshot({
      path: path.join(screenshotDir, `${viewport.name}-knowledge.png`)
    });

    await page.goto(`${baseUrl}#/quiz`, { waitUntil: 'networkidle' });
    await page.locator('[data-action="start-quiz"]').click();
    await page.locator('.option-button').first().waitFor();
    await page.waitForTimeout(320);
    await assertNoOverflow(page, `答题/${viewport.name}`);
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-quiz.png`) });

    await page.goto(`${baseUrl}#/recite`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '挖空背' }).click();
    await page.locator('.cloze-blank').first().waitFor();
    await page.waitForTimeout(320);
    await assertNoOverflow(page, `背诵/${viewport.name}`);
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-recite.png`) });

    await page.goto(`${baseUrl}#/favorites`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: '收藏与错题' }).waitFor();
    await page.waitForTimeout(320);
    await assertNoOverflow(page, `收藏/${viewport.name}`);
    await page.screenshot({
      path: path.join(screenshotDir, `${viewport.name}-favorites.png`)
    });

    assert.deepEqual(errors, []);
    await page.close();
  }
});

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  assert.ok(overflow <= 1, `${label} 横向溢出 ${overflow}px`);
}
