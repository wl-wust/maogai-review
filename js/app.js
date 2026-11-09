import { chapters, questions } from '../data/questions.js';
import {
  clearState,
  getWrongIds,
  loadState,
  recordAnswer,
  resolveLastSession,
  saveState,
  setLastSession,
  toggleFavorite
} from './core.js';
import { escapeHTML, refreshIcons, toast } from './ui.js';
import { renderHome } from './views/home.js';
import {
  renderKnowledge,
  renderKnowledgeResults
} from './views/knowledge.js';
import {
  buildQuiz,
  createQuizSession,
  getSessionSummary,
  gradeQuizAnswer,
  toggleSelection
} from './quiz.js';
import { renderQuiz } from './views/quiz.js';

const navItems = [
  { route: 'home', label: '首页', icon: 'layout-dashboard' },
  { route: 'knowledge', label: '知识库', icon: 'library-big' },
  { route: 'quiz', label: '刷题', icon: 'circle-help' },
  { route: 'recite', label: '背诵', icon: 'book-open-check' },
  { route: 'favorites', label: '收藏', icon: 'bookmark' }
];

let state = loadState();
const main = document.querySelector('#main-content');
let knowledgeQuery = '';
let knowledgeOptions = { chapterId: 'all', kind: 'all' };
let lastRoute = null;

renderNavigation();
renderRoute();
refreshIcons();

window.addEventListener('hashchange', () => renderRoute());
document.addEventListener('click', handleAction);
document.addEventListener('input', handleInput);

function renderNavigation() {
  const desktop = navItems
    .map(
      (item) => `
        <a href="#/${item.route}" data-nav="${item.route}" class="nav-link">
          <i data-lucide="${item.icon}" aria-hidden="true"></i>
          <span>${item.label}</span>
        </a>
      `
    )
    .join('');
  const mobile = navItems
    .map(
      (item) => `
        <a href="#/${item.route}" data-nav="${item.route}" class="mobile-nav-link">
          <i data-lucide="${item.icon}" aria-hidden="true"></i>
          <span>${item.label}</span>
        </a>
      `
    )
    .join('');
  document.querySelector('#desktop-nav').innerHTML = desktop;
  document.querySelector('#mobile-nav').innerHTML = mobile;
}

function currentRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home';
  const [route, query = ''] = raw.split('?');
  return {
    name: navItems.some((item) => item.route === route) ? route : 'home',
    params: new URLSearchParams(query)
  };
}

function renderRoute(preserveScroll = false) {
  let { name, params } = currentRoute();
  normalizeSession();
  if (name === 'quiz' && params.get('question')) {
    prepareQuestionSession(params.get('question'));
    history.replaceState(null, '', '#/quiz?resume=1');
    params = new URLSearchParams('resume=1');
  }
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const active = link.dataset.nav === name;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  if (name === 'home') main.innerHTML = renderHome(state);
  else if (name === 'knowledge') {
    if (lastRoute !== 'knowledge') knowledgeQuery = '';
    knowledgeOptions = {
      chapterId: params.get('chapter') ?? 'all',
      kind: params.get('kind') ?? 'all'
    };
    main.innerHTML = renderKnowledge(state, params, knowledgeQuery);
  } else if (name === 'quiz') main.innerHTML = renderQuiz(state, params);
  else main.innerHTML = renderPlaceholder(name, params);

  lastRoute = name;
  refreshIcons(main);
  main.focus({ preventScroll: true });
  if (!preserveScroll) window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderPlaceholder(name, params) {
  const labels = {
    knowledge: ['知识库', '按章节和关键词检索知识卡、题目与解析。', 'library-big'],
    quiz: ['章节练习', '选择范围后逐题作答，提交即可查看答案解析。', 'circle-help'],
    recite: ['主观题背诵', '在无答案、挖空和完整答案三种模式间切换。', 'book-open-check'],
    favorites: ['我的收藏', '统一查看收藏的题目、主观题和知识卡。', 'bookmark']
  };
  const [title, description, iconName] = labels[name];
  const chapter = chapters.find((item) => item.id === params.get('chapter'));
  return `
    <div class="page">
      <section class="page-intro compact-intro">
        <div>
          <p class="eyebrow">${chapter ? escapeHTML(chapter.shortTitle) : 'MAOGAI REVIEW'}</p>
          <h1>${title}</h1>
          <p class="page-lead">${description}</p>
        </div>
      </section>
      <div class="empty-state">
        <span class="empty-icon"><i data-lucide="${iconName}" aria-hidden="true"></i></span>
        <h2>正在准备内容</h2>
        <p>该模块的数据已载入，页面交互将在下一步接入。</p>
      </div>
    </div>
  `;
}

function persist() {
  if (!saveState(state)) toast('当前浏览器无法保存学习记录', 'warning');
}

function handleAction(event) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;

  if (action === 'start-all') {
    const session = resolveLastSession(state, questions.map((q) => q.id));
    if (!session || session.finished) startPracticeSession({ chapterId: 'all', type: 'all' });
    window.location.hash = '#/quiz?resume=1';
    return;
  }

  if (action === 'reset-progress') {
    const confirmed = window.confirm('确定清空答题记录、错题和收藏吗？此操作无法撤销。');
    if (!confirmed) return;
    clearState();
    state = loadState();
    renderRoute(true);
    toast('学习记录已清空');
  }

  if (action === 'favorite') {
    const { category, id } = trigger.dataset;
    if (!category || !id) return;
    const active = toggleFavorite(state, category, id);
    persist();
    renderRoute(true);
    toast(active ? '已加入收藏' : '已取消收藏');
  }

  if (action === 'clear-search') {
    knowledgeQuery = '';
    const input = document.querySelector('[data-search-input]');
    if (input) input.value = '';
    updateKnowledgeResults();
    input?.focus();
  }

  if (action === 'start-quiz') {
    const chapterId = document.querySelector('#quiz-chapter')?.value ?? 'all';
    const type = document.querySelector('#quiz-type')?.value ?? 'all';
    const shuffle = document.querySelector('#quiz-order')?.value === 'random';
    startPracticeSession({ chapterId, type, shuffle });
    return;
  }

  if (action === 'start-all-quiz') {
    startPracticeSession({ chapterId: 'all', type: 'all' });
    return;
  }

  if (action === 'retry-wrong') {
    const summary = state.lastSession ? getSessionSummary(state.lastSession) : null;
    const wrongIds = summary?.wrongIds?.length ? summary.wrongIds : getWrongIds(state);
    if (!wrongIds.length) {
      toast('当前没有可重练的错题');
      return;
    }
    startPracticeSession({
      chapterId: 'all',
      type: 'all',
      source: 'wrong',
      questionIds: wrongIds
    });
    return;
  }

  if (action === 'restart-quiz') {
    const previous = state.lastSession;
    startPracticeSession({
      chapterId: previous?.chapterId ?? 'all',
      type: previous?.type ?? 'all',
      shuffle: previous?.shuffle
    });
    return;
  }

  if (action === 'select-option') {
    const session = state.lastSession;
    if (!session || session.finished) return;
    const question = questions.find((item) => item.id === trigger.dataset.question);
    if (!question) return;
    session.answers ??= {};
    const record = session.answers[question.id] ?? { selected: [], submitted: false };
    if (record.submitted) return;
    record.selected = toggleSelection(question, record.selected, trigger.dataset.key);
    session.answers[question.id] = record;
    session.updatedAt = new Date().toISOString();
    persist();
    renderRoute(true);
    return;
  }

  if (action === 'submit-answer') {
    const session = state.lastSession;
    if (!session || session.finished) return;
    const question = questions.find((item) => item.id === session.questionIds[session.index]);
    const record = question ? session.answers?.[question.id] : null;
    if (!question || !record || record.submitted) return;
    const correct = gradeQuizAnswer(question, record.selected);
    record.submitted = true;
    record.correct = correct;
    session.answers[question.id] = record;
    session.updatedAt = new Date().toISOString();
    recordAnswer(state, question.id, correct);
    persist();
    renderRoute(true);
    toast(correct ? '回答正确' : '已记录错题', correct ? 'success' : 'warning');
    return;
  }

  if (action === 'next-question') {
    const session = state.lastSession;
    if (!session) return;
    if (session.index >= session.questionIds.length - 1) session.finished = true;
    else session.index += 1;
    session.updatedAt = new Date().toISOString();
    persist();
    renderRoute(true);
    return;
  }

  if (action === 'previous-question') {
    const session = state.lastSession;
    if (!session || session.index <= 0) return;
    session.index -= 1;
    session.updatedAt = new Date().toISOString();
    persist();
    renderRoute(true);
  }
}

function handleInput(event) {
  if (!event.target.matches('[data-search-input]')) return;
  knowledgeQuery = event.target.value;
  updateKnowledgeResults();
}

function updateKnowledgeResults() {
  const container = document.querySelector('#knowledge-results');
  if (!container) return;
  container.innerHTML = renderKnowledgeResults(knowledgeQuery, knowledgeOptions, state);
  refreshIcons(container);
}

function normalizeSession() {
  const session = state.lastSession;
  if (!session || !Array.isArray(session.questionIds) || !session.questionIds.length) return;
  session.answers ??= {};
  session.index = Math.min(Math.max(0, Number(session.index) || 0), session.questionIds.length - 1);
  session.chapterId ??= 'all';
  session.type ??= 'all';
  session.source ??= 'practice';
  session.updatedAt ??= session.startedAt ?? new Date().toISOString();
  session.finished = Boolean(session.finished);
}

function startPracticeSession({
  chapterId = 'all',
  type = 'all',
  shuffle = false,
  source = 'practice',
  questionIds
}) {
  const pool = questionIds?.length
    ? questionIds
        .map((id) => questions.find((question) => question.id === id))
        .filter(Boolean)
    : buildQuiz(questions, { chapterId, type, shuffle });
  if (!pool.length) {
    toast('该范围暂无题目');
    return;
  }
  state.lastSession = createQuizSession(pool, {
    chapterId,
    type,
    shuffle,
    source
  });
  persist();
  const target = '#/quiz?resume=1';
  if (window.location.hash === target) renderRoute();
  else window.location.hash = target;
}

function prepareQuestionSession(questionId) {
  const question = questions.find((item) => item.id === questionId);
  if (!question) return;
  let session = state.lastSession;
  if (!session || !session.questionIds?.includes(questionId)) {
    const pool = buildQuiz(questions, { chapterId: question.chapterId });
    session = createQuizSession(pool, {
      chapterId: question.chapterId,
      type: 'all',
      source: 'question',
      index: pool.findIndex((item) => item.id === questionId)
    });
    state.lastSession = session;
  }
  session.index = session.questionIds.indexOf(questionId);
  session.finished = false;
  session.updatedAt = new Date().toISOString();
  setLastSession(state, session);
  persist();
}

window.addEventListener('online', () => toast('已恢复网络，当前仍可继续离线使用'));
window.addEventListener('offline', () => toast('已进入离线模式，学习记录会继续保存在本机'));
