import { chapters } from '../../data/questions.js';
import { knowledge } from '../../data/knowledge.js';
import { searchContent } from '../search.js';
import { escapeHTML, icon, emptyState } from '../ui.js';

const kindLabels = {
  knowledge: '知识卡',
  question: '选择题',
  subjective: '主观题'
};

export function renderKnowledge(state, params, query = '') {
  const cardId = params.get('card');
  if (cardId) return renderCardDetail(state, cardId);

  const chapterId = params.get('chapter') ?? 'all';
  const kind = params.get('kind') ?? 'all';
  return `
    <div class="page knowledge-page">
      <section class="page-intro compact-intro">
        <div>
          <p class="eyebrow">SEARCHABLE NOTES</p>
          <h1>知识库</h1>
          <p class="page-lead">输入关键词，检索重点知识、选择题原文、答案与解析。</p>
        </div>
      </section>

      <section class="search-panel" aria-label="知识库搜索">
        <label class="search-field">
          ${icon('search', 20)}
          <input
            type="search"
            value="${escapeHTML(query)}"
            placeholder="搜索知识点、题干或答案，如：农村包围城市"
            autocomplete="off"
            data-search-input
          />
          <button type="button" class="clear-search" data-action="clear-search" aria-label="清空搜索">
            ${icon('x', 18)}
          </button>
        </label>
        <div class="filter-row" role="group" aria-label="按内容类型筛选">
          ${renderKindTab('all', '全部', kind)}
          ${renderKindTab('knowledge', '知识卡', kind)}
          ${renderKindTab('question', '选择题', kind)}
          ${renderKindTab('subjective', '主观题', kind)}
        </div>
        <div class="chapter-chips" aria-label="按章节筛选">
          ${renderChapterChip('all', '全部章节', chapterId)}
          ${chapters.map((chapter) => renderChapterChip(chapter.id, chapter.shortTitle, chapterId)).join('')}
        </div>
      </section>

      <section class="knowledge-results" id="knowledge-results" aria-live="polite">
        ${renderKnowledgeResults(query, { chapterId, kind }, state)}
      </section>
    </div>
  `;
}

export function renderKnowledgeResults(query, options, state) {
  const chapterId = options.chapterId === 'all' ? null : options.chapterId;
  const kind = options.kind === 'all' ? null : options.kind;
  if (query.trim()) {
    const results = searchContent(query, { chapterId, kind, limit: 50 });
    if (!results.length) {
      return emptyState('search-x', '没有找到匹配内容', '换一个关键词，或清除章节与类型筛选后再试。');
    }
    return `
      <div class="result-summary">
        <span>找到 ${results.length} 条相关内容</span>
        <small>题目、答案和解析均参与搜索</small>
      </div>
      <div class="search-result-list">
        ${results.map((item) => renderSearchResult(item)).join('')}
      </div>
    `;
  }

  const cards = knowledge
    .filter((item) => !chapterId || item.chapterId === chapterId)
    .filter(() => !kind || kind === 'knowledge');
  if (!cards.length) {
    return emptyState(
      'library',
      '该范围暂无知识卡',
      '可以切换章节，或直接搜索题目与主观题答案。'
    );
  }
  return `
    <div class="result-summary">
      <span>${cards.length} 张重点知识卡</span>
      <small>点击卡片查看结构化笔记</small>
    </div>
    <div class="knowledge-grid">
      ${cards.map((card) => renderKnowledgeCard(card, state)).join('')}
    </div>
  `;
}

function renderKindTab(value, label, active) {
  const params = new URLSearchParams();
  if (value !== 'all') params.set('kind', value);
  return `
    <a class="filter-tab ${active === value ? 'is-active' : ''}" href="#/knowledge?${params}">
      ${label}
    </a>
  `;
}

function renderChapterChip(value, label, active) {
  const params = new URLSearchParams();
  if (value !== 'all') params.set('chapter', value);
  return `
    <a class="chapter-chip ${active === value ? 'is-active' : ''}" href="#/knowledge?${params}">
      ${escapeHTML(label)}
    </a>
  `;
}

function renderKnowledgeCard(card, state) {
  const favorite = state.favorites.knowledge.includes(card.id);
  return `
    <article class="knowledge-card">
      <div class="card-meta">
        <span>${escapeHTML(card.chapter)}</span>
        <button class="mini-icon-button ${favorite ? 'is-active' : ''}" type="button" data-action="favorite" data-category="knowledge" data-id="${card.id}" aria-label="${favorite ? '取消收藏' : '收藏知识卡'}">
          ${icon('bookmark', 18)}
        </button>
      </div>
      <h2><a href="#/knowledge?card=${card.id}">${escapeHTML(card.title)}</a></h2>
      <p>${escapeHTML(card.summary)}</p>
      <div class="keyword-row">
        ${card.keywords.slice(0, 3).map((word) => `<span>${escapeHTML(word)}</span>`).join('')}
      </div>
      <a class="card-link" href="#/knowledge?card=${card.id}">
        查看知识卡
        ${icon('arrow-right', 16)}
      </a>
    </article>
  `;
}

function renderSearchResult(item) {
  return `
    <a class="search-result" href="${item.target}">
      <span class="result-kind kind-${item.kind}">${kindLabels[item.kind]}</span>
      <span class="result-content">
        <strong>${escapeHTML(item.title)}</strong>
        <small>${escapeHTML(item.subtitle)}</small>
        <p>${escapeHTML(item.excerpt)}</p>
      </span>
      ${icon('chevron-right', 18)}
    </a>
  `;
}

function renderCardDetail(state, cardId) {
  const card = knowledge.find((item) => item.id === cardId);
  if (!card) {
    return `
      <div class="page">
        ${emptyState(
          'file-question',
          '知识卡不存在',
          '该知识卡可能已被移除。',
          '<a class="primary-button" href="#/knowledge">返回知识库</a>'
        )}
      </div>
    `;
  }
  const favorite = state.favorites.knowledge.includes(card.id);
  return `
    <div class="page knowledge-detail-page">
      <a class="back-link" href="#/knowledge">
        ${icon('arrow-left', 17)}
        返回知识库
      </a>
      <article class="knowledge-detail">
        <div class="detail-heading">
          <div>
            <p class="eyebrow">${escapeHTML(card.chapter)}</p>
            <h1>${escapeHTML(card.title)}</h1>
            <p>${escapeHTML(card.summary)}</p>
          </div>
          <button class="secondary-button ${favorite ? 'is-favorite' : ''}" type="button" data-action="favorite" data-category="knowledge" data-id="${card.id}">
            ${icon('bookmark', 18)}
            ${favorite ? '已收藏' : '收藏'}
          </button>
        </div>
        <div class="detail-content">
          ${card.content
            .split('\n')
            .filter(Boolean)
            .map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`)
            .join('')}
        </div>
        <div class="keyword-row spacious">
          ${card.keywords.map((word) => `<span>${escapeHTML(word)}</span>`).join('')}
        </div>
        <div class="detail-actions">
          <a class="primary-button" href="#/quiz?chapter=${card.chapterId}">
            ${icon('circle-help', 18)}
            练习本章题目
          </a>
          <a class="secondary-button" href="#/knowledge?chapter=${card.chapterId}">
            ${icon('library', 18)}
            浏览同章知识
          </a>
        </div>
      </article>
    </div>
  `;
}
