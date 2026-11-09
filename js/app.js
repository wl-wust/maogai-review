import { chapters, questions } from '../data/questions.js';
import {
  clearState,
  getStats,
  loadState,
  resolveLastSession,
  saveState,
  toggleFavorite
} from './core.js';
import { escapeHTML, refreshIcons, toast } from './ui.js';
import { renderHome } from './views/home.js';
import {
  renderKnowledge,
  renderKnowledgeResults
} from './views/knowledge.js';

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

window.addEventListener('hashchange', renderRoute);
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

function renderRoute() {
  const { name, params } = currentRoute();
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
  } else main.innerHTML = renderPlaceholder(name, params);

  lastRoute = name;
  refreshIcons(main);
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
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
    if (!session) {
      state.lastSession = {
        mode: 'all',
        questionIds: questions.map((q) => q.id),
        index: 0,
        updatedAt: new Date().toISOString()
      };
      persist();
    }
    window.location.hash = '#/quiz?resume=1';
    return;
  }

  if (action === 'reset-progress') {
    const confirmed = window.confirm('确定清空答题记录、错题和收藏吗？此操作无法撤销。');
    if (!confirmed) return;
    clearState();
    state = loadState();
    renderRoute();
    toast('学习记录已清空');
  }

  if (action === 'favorite') {
    const { category, id } = trigger.dataset;
    if (!category || !id) return;
    const active = toggleFavorite(state, category, id);
    persist();
    renderRoute();
    toast(active ? '已加入收藏' : '已取消收藏');
  }

  if (action === 'clear-search') {
    knowledgeQuery = '';
    const input = document.querySelector('[data-search-input]');
    if (input) input.value = '';
    updateKnowledgeResults();
    input?.focus();
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

window.addEventListener('online', () => toast('已恢复网络，当前仍可继续离线使用'));
window.addEventListener('offline', () => toast('已进入离线模式，学习记录会继续保存在本机'));

// 避免未使用变量在后续模块拆分时被误删。
void getStats;
