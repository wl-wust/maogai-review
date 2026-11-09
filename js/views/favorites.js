import { knowledge } from '../../data/knowledge.js';
import { questions } from '../../data/questions.js';
import { subjective } from '../../data/subjective.js';
import {
  getStats,
  getWrongIds,
  getRecentAnswers
} from '../core.js';
import { escapeHTML, formatDate, icon, emptyState, typeLabel } from '../ui.js';

const tabs = [
  { id: 'questions', label: '选择题' },
  { id: 'subjective', label: '主观题' },
  { id: 'knowledge', label: '知识卡' },
  { id: 'wrong', label: '错题本' }
];

export function renderFavorites(state, params) {
  const requested = params.get('tab') ?? 'questions';
  const active = tabs.some((item) => item.id === requested) ? requested : 'questions';
  const stats = getStats(state);
  const wrongIds = getWrongIds(state);
  const counts = {
    questions: state.favorites.questions.length,
    subjective: state.favorites.subjective.length,
    knowledge: state.favorites.knowledge.length,
    wrong: wrongIds.length
  };
  return `
    <div class="page favorites-page">
      <section class="page-intro compact-intro">
        <div>
          <p class="eyebrow">SAVED & REVIEW</p>
          <h1>收藏与错题</h1>
          <p class="page-lead">集中查看已收藏内容、最近答题记录和需要再次巩固的错题。</p>
        </div>
      </section>

      <section class="memory-band">
        <div class="memory-copy">
          <span class="section-kicker">学习记忆</span>
          <h2>${stats.answeredCount ? '记录已同步到本机' : '还没有答题记录'}</h2>
          <p>${stats.answeredCount ? `累计作答 ${stats.attempts} 次，最近学习记录会随时保存。` : '完成一道题后，正确率、错题和继续进度会自动写入本机。'}</p>
        </div>
        <div class="memory-stats">
          <div><strong>${stats.answeredCount}</strong><span>已答题目</span></div>
          <div><strong>${stats.accuracy}%</strong><span>正确率</span></div>
          <div><strong>${stats.wrongCount}</strong><span>当前错题</span></div>
          <div><strong>${stats.favoriteCount}</strong><span>全部收藏</span></div>
        </div>
      </section>

      <div class="favorites-tabs" role="tablist" aria-label="收藏分类">
        ${tabs
          .map(
            (tab) => `
              <a
                role="tab"
                aria-selected="${active === tab.id}"
                class="${active === tab.id ? 'is-active' : ''}"
                href="#/favorites?tab=${tab.id}"
              >
                ${tab.label}
                <span>${counts[tab.id]}</span>
              </a>
            `
          )
          .join('')}
      </div>

      <section class="favorites-content">
        ${renderTabContent(active, state, wrongIds)}
      </section>

      ${renderRecent(state)}
    </div>
  `;
}

function renderTabContent(active, state, wrongIds) {
  if (active === 'questions') return renderQuestions(state.favorites.questions, state);
  if (active === 'subjective') return renderSubjective(state.favorites.subjective, state);
  if (active === 'knowledge') return renderKnowledge(state.favorites.knowledge, state);
  return renderWrong(wrongIds, state);
}

function renderQuestions(ids, state) {
  if (!ids.length) {
    return emptyState(
      'bookmark',
      '还没有收藏选择题',
      '答题时点击题目右上角的收藏按钮，就会出现在这里。',
      '<a class="primary-button" href="#/quiz">开始刷题</a>'
    );
  }
  return `
    <div class="saved-list">
      ${ids
        .map((id) => questions.find((item) => item.id === id))
        .filter(Boolean)
        .map((question) => {
          const record = state.answered[question.id];
          return `
            <article class="saved-item">
              <div class="saved-item-meta">
                <span class="saved-kind">${typeLabel(question.type)}</span>
                <small>${escapeHTML(question.chapter)} · 第 ${question.number} 题</small>
                ${record ? `<em class="${record.lastCorrect ? 'correct' : 'wrong'}">${record.lastCorrect ? '最近答对' : '最近答错'}</em>` : '<em>未作答</em>'}
              </div>
              <a class="saved-item-title" href="#/quiz?question=${question.id}">${escapeHTML(question.stem)}</a>
              <div class="saved-item-actions">
                <a class="mini-text-link" href="#/quiz?question=${question.id}">查看题目 ${icon('arrow-right', 15)}</a>
                <button class="mini-text-button" type="button" data-action="favorite" data-category="questions" data-id="${question.id}">
                  ${icon('bookmark-x', 15)} 取消收藏
                </button>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderSubjective(ids, state) {
  if (!ids.length) {
    return emptyState(
      'book-open-check',
      '还没有收藏主观题',
      '在背诵页面收藏重点题，复习时可以快速回到这里。',
      '<a class="primary-button" href="#/recite">开始背诵</a>'
    );
  }
  return `
    <div class="saved-list">
      ${ids
        .map((id) => subjective.find((item) => item.id === id))
        .filter(Boolean)
        .map(
          (item) => `
            <article class="saved-item">
              <div class="saved-item-meta">
                <span class="saved-kind subjective">主观题</span>
                <small>${escapeHTML(item.chapter)}</small>
              </div>
              <a class="saved-item-title" href="#/recite?item=${item.id}">${escapeHTML(item.question)}</a>
              <p class="saved-excerpt">${escapeHTML(item.points[0])}</p>
              <div class="saved-item-actions">
                <a class="mini-text-link" href="#/recite?item=${item.id}">进入背诵 ${icon('arrow-right', 15)}</a>
                <button class="mini-text-button" type="button" data-action="favorite" data-category="subjective" data-id="${item.id}">
                  ${icon('bookmark-x', 15)} 取消收藏
                </button>
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderKnowledge(ids, state) {
  if (!ids.length) {
    return emptyState(
      'library-big',
      '还没有收藏知识卡',
      '知识库中的重点卡片可以收藏，便于集中回看。',
      '<a class="primary-button" href="#/knowledge">浏览知识库</a>'
    );
  }
  return `
    <div class="saved-list">
      ${ids
        .map((id) => knowledge.find((item) => item.id === id))
        .filter(Boolean)
        .map(
          (item) => `
            <article class="saved-item">
              <div class="saved-item-meta">
                <span class="saved-kind knowledge">知识卡</span>
                <small>${escapeHTML(item.chapter)}</small>
              </div>
              <a class="saved-item-title" href="#/knowledge?card=${item.id}">${escapeHTML(item.title)}</a>
              <p class="saved-excerpt">${escapeHTML(item.summary)}</p>
              <div class="saved-item-actions">
                <a class="mini-text-link" href="#/knowledge?card=${item.id}">打开知识卡 ${icon('arrow-right', 15)}</a>
                <button class="mini-text-button" type="button" data-action="favorite" data-category="knowledge" data-id="${item.id}">
                  ${icon('bookmark-x', 15)} 取消收藏
                </button>
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderWrong(ids, state) {
  if (!ids.length) {
    return emptyState(
      'badge-check',
      '当前没有错题',
      '答错的题会自动进入错题本，重练答对后也会保留历史记录。',
      '<a class="primary-button" href="#/quiz">继续刷题</a>'
    );
  }
  return `
    <div class="saved-list">
      ${ids
        .map((id) => questions.find((item) => item.id === id))
        .filter(Boolean)
        .map(
          (question) => `
            <article class="saved-item wrong-saved-item">
              <div class="saved-item-meta">
                <span class="saved-kind wrong">错题</span>
                <small>${escapeHTML(question.chapter)} · 第 ${question.number} 题</small>
                <em class="wrong">答错 ${state.answered[question.id]?.wrongCount ?? 1} 次</em>
              </div>
              <a class="saved-item-title" href="#/quiz?question=${question.id}">${escapeHTML(question.stem)}</a>
              <div class="saved-item-actions">
                <a class="mini-text-link" href="#/quiz?question=${question.id}">重做并看解析 ${icon('arrow-right', 15)}</a>
                <button class="mini-text-button" type="button" data-action="dismiss-wrong" data-id="${question.id}">
                  ${icon('check-check', 15)} 移出错题本
                </button>
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderRecent(state) {
  const recent = getRecentAnswers(state, questions, 4);
  if (!recent.length) return '';
  return `
    <section class="recent-section">
      <div class="section-heading">
        <div>
          <span class="section-kicker">最近作答</span>
          <h2>学习记录</h2>
        </div>
      </div>
      <div class="recent-grid">
        ${recent
          .map(
            ({ question, record }) => `
              <a class="recent-item" href="#/quiz?question=${question.id}">
                <span class="${record.lastCorrect ? 'correct' : 'wrong'}">${record.lastCorrect ? '正确' : '错误'}</span>
                <strong>${escapeHTML(question.stem)}</strong>
                <small>${formatDate(record.lastAt)} · ${escapeHTML(question.chapter)}</small>
              </a>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}
