# 毛概离线刷题 PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个无需后端、可在电脑和手机离线使用的毛概知识库与刷题 PWA。

**Architecture:** 静态 HTML/CSS/ES Modules 前端，题库由本地导入脚本转换为稳定 ID 的 JavaScript 数据；`localStorage` 保存答题记忆、错题与收藏；Service Worker 缓存全部资源，PowerShell 启动本地静态服务器。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js `node:test`、Service Worker、Playwright。

---

### Task 1: 题库导入与数据校验

**Files:**

- Create: `scripts/import-content.mjs`
- Create: `tests/content.test.mjs`
- Generate: `data/questions.js`
- Generate: `data/knowledge.js`
- Generate: `data/subjective.js`
- Create: `package.json`

- [ ] **Step 1: 写数据完整性失败测试**

```js
// tests/content.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../data/questions.js';
import { knowledge } from '../data/knowledge.js';
import { subjective } from '../data/subjective.js';

test('选择题数量和题型完整', () => {
  assert.equal(questions.length, 270);
  assert.equal(questions.filter((q) => q.type === 'single').length, 90);
  assert.equal(questions.filter((q) => q.type === 'multiple').length, 85);
  assert.equal(questions.filter((q) => q.type === 'judge').length, 95);
  assert.equal(new Set(questions.map((q) => q.id)).size, 270);
  assert.ok(questions.every((q) => q.stem && q.answer && q.explanation && q.options.length >= 2));
});

test('主观题与知识库可用于搜索', () => {
  assert.equal(subjective.length, 12);
  assert.ok(knowledge.length >= 9);
  assert.ok(subjective.every((item) => item.question && item.answer.length > 30));
  assert.ok(knowledge.every((item) => item.title && item.content.length > 30));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/content.test.mjs`

Expected: FAIL because `data/questions.js` does not exist.

- [ ] **Step 3: 实现内容导入器**

`scripts/import-content.mjs` 使用 Python 预处理后的纯文本或直接调用 bundled Python 的 `python-docx` 提取段落。选择题按章节标题、题号、题型、选项、答案、解析解析；主观题按编号问答整理；知识库按 9 个章节与毛泽东思想当代发展整理。输出 ES Module 常量，章节使用 `{ id, title, shortTitle }`，题目使用：

```js
{
  id: 'q001',
  number: 1,
  chapterId: 'intro',
  chapter: '绪论',
  type: 'single',
  stem: '题干',
  options: [{ key: 'A', text: '选项' }],
  answer: 'B',
  explanation: '解析'
}
```

- [ ] **Step 4: 运行导入并校验数量**

Run: `node scripts/import-content.mjs`

Expected: 输出 `270 questions, 12 subjective, 10 knowledge cards`。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test tests/content.test.mjs`

Expected: PASS，0 failures。

- [ ] **Step 6: 提交**

```bash
git add package.json scripts/import-content.mjs tests/content.test.mjs data
git commit -m "feat: import and validate review content"
```

### Task 2: 本地记忆与判分核心

**Files:**

- Create: `js/core.js`
- Create: `tests/core.test.mjs`

- [ ] **Step 1: 写判分与存储状态失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswer, createInitialState, recordAnswer, toggleFavorite } from '../js/core.js';

test('多选答案忽略顺序', () => {
  assert.equal(gradeAnswer(['C', 'A'], 'AC'), true);
  assert.equal(gradeAnswer(['A'], 'AC'), false);
});

test('答题记录累计正确率与错题', () => {
  const state = createInitialState();
  recordAnswer(state, 'q001', true, new Date('2026-11-09T10:00:00Z'));
  recordAnswer(state, 'q002', false, new Date('2026-11-09T10:01:00Z'));
  assert.equal(state.answered.q001.attempts, 1);
  assert.equal(state.answered.q001.correctCount, 1);
  assert.equal(state.answered.q002.wrongCount, 1);
});

test('收藏可以重复切换且不产生重复 ID', () => {
  const state = createInitialState();
  toggleFavorite(state, 'questions', 'q001');
  toggleFavorite(state, 'questions', 'q001');
  toggleFavorite(state, 'questions', 'q001');
  assert.deepEqual(state.favorites.questions, ['q001']);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/core.test.mjs`

Expected: FAIL because `js/core.js` does not exist.

- [ ] **Step 3: 实现核心模块**

实现 `GRADE`、`createInitialState()`、`gradeAnswer(selected, answer)`、`recordAnswer()`、`toggleFavorite()`、`loadState()`、`saveState()` 和 `resolveLastSession()`。存储键固定为 `maogai-review-state-v1`，读取失败时返回初始状态。连续答对在同题连续正确时递增，答错归零。

- [ ] **Step 4: 运行核心测试**

Run: `node --test tests/core.test.mjs`

Expected: PASS，0 failures。

- [ ] **Step 5: 提交**

```bash
git add js/core.js tests/core.test.mjs
git commit -m "feat: add grading and local learning state"
```

### Task 3: 应用骨架、导航与首页

**Files:**

- Create: `index.html`
- Create: `css/app.css`
- Create: `js/app.js`
- Create: `js/views.js`

- [ ] **Step 1: 写页面结构验收测试**

在 `tests/ui.spec.mjs` 中用 Playwright 打开首页，断言标题、五个主导航和首页统计区域存在，并断言 375px 宽度下 `document.documentElement.scrollWidth <= window.innerWidth`。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/ui.spec.mjs`

Expected: FAIL because `index.html` does not exist or navigation is missing。

- [ ] **Step 3: 实现应用外壳**

创建语义化 HTML：侧边栏、移动端顶栏、主内容区、底部导航、Toast 容器。主导航为首页、知识库、刷题、背诵、收藏。CSS 定义色彩变量、间距、字体、按钮、卡片、移动端安全区和响应式导航；主色采用墨红与青灰，不使用紫色渐变。

- [ ] **Step 4: 实现首页**

展示总题数、已答数、正确率、错题数、收藏数、继续上次练习、章节入口和今日建议。无历史时显示“开始第一轮练习”。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test tests/ui.spec.mjs`

Expected: PASS，0 failures。

- [ ] **Step 6: 提交**

```bash
git add index.html css/app.css js/app.js js/views.js tests/ui.spec.mjs
git commit -m "feat: add responsive app shell and dashboard"
```

### Task 4: 知识库与全文搜索

**Files:**

- Create: `js/search.js`
- Create: `tests/search.test.mjs`
- Modify: `js/views.js`
- Modify: `js/app.js`

- [ ] **Step 1: 写搜索失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchContent } from '../js/search.js';

test('搜索覆盖标题、题干、解析和知识内容', () => {
  assert.ok(searchContent('毛泽东思想').some((item) => item.kind === 'knowledge'));
  assert.ok(searchContent('六届六中全会').some((item) => item.kind === 'question'));
  assert.ok(searchContent('农村包围城市').some((item) => item.kind === 'subjective'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/search.test.mjs`

Expected: FAIL because `searchContent` is missing。

- [ ] **Step 3: 实现搜索**

对知识卡、选择题、主观题建立标准化文本索引，按标题命中、正文命中、多关键词覆盖数评分，返回统一结果 `{ kind, id, title, excerpt, score }`。搜索空字符串返回空数组。

- [ ] **Step 4: 实现知识库页面**

支持章节筛选、关键词搜索、知识卡展开、结果跳转、知识收藏。搜索覆盖题干、选项、答案、解析、知识内容及主观题答案。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test tests/search.test.mjs`

Expected: PASS，0 failures。

- [ ] **Step 6: 提交**

```bash
git add js/search.js tests/search.test.mjs js/views.js js/app.js
git commit -m "feat: add searchable knowledge base"
```

### Task 5: 章节练习与答题解析

**Files:**

- Create: `js/quiz.js`
- Create: `tests/quiz.test.mjs`
- Modify: `js/views.js`
- Modify: `js/app.js`

- [ ] **Step 1: 写答题流程失败测试**

测试 `buildQuiz()` 能按章节和题型筛选、随机模式不改变总题数、答案提交前不能显示解析、提交后返回正确性和解析。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/quiz.test.mjs`

Expected: FAIL because `buildQuiz` is missing。

- [ ] **Step 3: 实现练习引擎**

支持全部、章节和题型筛选，支持顺序与随机。单选只允许一项，多选允许多项，判断固定“对/错”。题目 ID 序列和当前索引写入 `lastSession`；每次进入同一练习时提示继续或重新开始。

- [ ] **Step 4: 实现答题界面**

显示进度、题型、收藏按钮、题干和选项；提交前不显示答案；提交后标记正误、展示答案和解析，并记录答题状态。提供上一题、下一题、查看错题和结束本轮。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test tests/quiz.test.mjs`

Expected: PASS，0 failures。

- [ ] **Step 6: 提交**

```bash
git add js/quiz.js tests/quiz.test.mjs js/views.js js/app.js
git commit -m "feat: add quiz flow with explanations"
```

### Task 6: 主观题背诵三模式

**Files:**

- Create: `js/recite.js`
- Create: `tests/recite.test.mjs`
- Modify: `js/views.js`
- Modify: `js/app.js`

- [ ] **Step 1: 写挖空失败测试**

测试 `buildCloze()` 保留要点编号与句子结构、将关键短语替换成 `<button class="cloze-blank">`、原文完整模式不产生挖空、无答案模式只显示问题。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/recite.test.mjs`

Expected: FAIL because `buildCloze` is missing。

- [ ] **Step 3: 实现背诵引擎**

为 12 个主观题支持 `hidden`、`cloze`、`full` 三种模式。用答案中的引号词、括号词、数字、专有名词和每段前 2 至 4 字作为挖空候选，单题最多 8 个空；点击空格显示原文。保存每题当前模式与最近浏览位置。

- [ ] **Step 4: 实现背诵界面**

顶部切换三模式，中间显示题号、问题、答案区域；无答案模式提供“显示提示”；支持收藏、上一题、下一题、跳题列表。移动端答案区域可自然换行滚动。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test tests/recite.test.mjs`

Expected: PASS，0 failures。

- [ ] **Step 6: 提交**

```bash
git add js/recite.js tests/recite.test.mjs js/views.js js/app.js
git commit -m "feat: add three-mode recitation view"
```

### Task 7: 错题本、收藏中心与学习记忆

**Files:**

- Modify: `js/app.js`
- Modify: `js/views.js`
- Modify: `js/core.js`
- Create: `tests/progress.test.mjs`

- [ ] **Step 1: 写进度筛选失败测试**

测试正确率、错题 ID 去重、最近错题排序、收藏分类统计，以及无效本地数据回退。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/progress.test.mjs`

Expected: FAIL because progress helpers are missing。

- [ ] **Step 3: 实现进度统计**

计算答题总数、正确率、错题数、收藏数、章节完成度。错题按最近答错时间倒序；重练答对后保留历史记录，但允许用户从错题本移除。

- [ ] **Step 4: 实现收藏中心**

提供“选择题、主观题、知识卡”三个分段标签，展示可跳转的收藏项并支持取消收藏。空状态提供返回刷题或知识库入口。

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test tests/progress.test.mjs`

Expected: PASS，0 failures。

- [ ] **Step 6: 提交**

```bash
git add js/core.js js/app.js js/views.js tests/progress.test.mjs
git commit -m "feat: add favorites and learning progress"
```

### Task 8: PWA 离线、启动脚本与最终验收

**Files:**

- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `启动.bat`
- Create: `scripts/serve.mjs`
- Create: `assets/icon.svg`
- Create: `README.md`
- Modify: `index.html`
- Modify: `js/app.js`

- [ ] **Step 1: 写离线验收**

Playwright 首次打开后等待 Service Worker 激活，断网刷新，断言首页、题库和背诵页面仍可用；检查 manifest 可访问且页面无控制台错误。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/ui.spec.mjs`

Expected: FAIL because Service Worker and manifest are missing。

- [ ] **Step 3: 实现 PWA 与启动器**

Manifest 使用独立显示模式、主题色和图标；Service Worker 预缓存 HTML、CSS、JS、数据和图标，导航请求离线回退到 `index.html`。Node 服务器限定绑定 `0.0.0.0`，输出电脑与局域网访问地址；`启动.bat` 调用 bundled Node 或系统 Node。

- [ ] **Step 4: 运行全部自动测试**

Run: `node --test tests/*.test.mjs`

Expected: 全部 PASS，0 failures。

- [ ] **Step 5: 手机与桌面视觉验收**

用 Playwright 在 375x812、768x1024、1440x900 三种视口逐页检查：首页、知识库搜索结果、答题前后、主观题三模式、收藏和错题本。截图确认无横向滚动、文字溢出、控件重叠和空白画布。

- [ ] **Step 6: 启动本地服务**

Run: `node scripts/serve.mjs`

Expected: 输出 `http://127.0.0.1:4173` 和局域网地址，页面可访问。

- [ ] **Step 7: 提交**

```bash
git add manifest.webmanifest sw.js 启动.bat scripts/serve.mjs assets README.md index.html js/app.js tests/ui.spec.mjs
git commit -m "feat: make review app installable and offline"
```
