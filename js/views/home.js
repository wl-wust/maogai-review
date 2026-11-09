import { chapters, questions } from '../../data/questions.js';
import { getChapterProgress, getStats } from '../core.js';
import { escapeHTML, icon, progressBar, formatDate } from '../ui.js';

export function renderHome(state) {
  const stats = getStats(state);
  const remaining = questions.length - stats.answeredCount;
  const lastSession = state.lastSession;
  return `
    <div class="page home-page">
      <section class="page-intro">
        <div>
          <p class="eyebrow">2026 AUTUMN · FINAL REVIEW</p>
          <h1>毛概复习</h1>
          <p class="page-lead">知识库、章节练习和背诵模式都已离线整合，打开即可开始。</p>
        </div>
        <button class="primary-button" type="button" data-action="start-all">
          ${icon('play', 18)}
          ${lastSession ? '继续上次练习' : '开始第一轮练习'}
        </button>
      </section>

      <section class="overview-band" aria-label="学习概览">
        <div class="overview-copy">
          <span class="section-kicker">学习概览</span>
          <h2>${stats.answeredCount ? '保持节奏，继续推进' : '从一道选择题开始'}</h2>
          <p>
            ${
              stats.answeredCount
                ? `已完成 ${stats.answeredCount} / ${questions.length} 道题，还有 ${remaining} 道等待复习。`
                : '题库共 270 道选择题，答题后会自动记录正确率、错题和上次进度。'
            }
          </p>
          <div class="overview-meta">
            <span>${icon('clock-3', 16)} ${lastSession ? formatDate(lastSession.updatedAt) : '尚未开始'}</span>
            <span>${icon('database', 16)} 全程离线</span>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat-item">
            <span id="stat-total">${questions.length}</span>
            <small>题库总数</small>
          </div>
          <div class="stat-item">
            <span>${stats.answeredCount}</span>
            <small>已答题目</small>
          </div>
          <div class="stat-item accent">
            <span>${stats.accuracy}%</span>
            <small>累计正确率</small>
          </div>
          <div class="stat-item warning">
            <span>${stats.wrongCount}</span>
            <small>当前错题</small>
          </div>
        </div>
      </section>

      <section class="content-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">按章节复习</span>
            <h2>选择练习范围</h2>
          </div>
          <a class="text-link" href="#/quiz">
            全部题型
            ${icon('arrow-right', 16)}
          </a>
        </div>
        <div class="chapter-grid">
          ${chapters.map((chapter, index) => renderChapter(chapter, index, state)).join('')}
        </div>
      </section>

      <section class="quick-actions">
        <a class="quick-action" href="#/knowledge">
          <span class="quick-icon">${icon('library-big', 22)}</span>
          <span><strong>搜索知识库</strong><small>查章节、答案和解析</small></span>
          ${icon('chevron-right', 18)}
        </a>
        <a class="quick-action" href="#/recite">
          <span class="quick-icon">${icon('book-open-check', 22)}</span>
          <span><strong>主观题背诵</strong><small>无答案、挖空、完整答案</small></span>
          ${icon('chevron-right', 18)}
        </a>
        <a class="quick-action" href="#/favorites">
          <span class="quick-icon">${icon('bookmark', 22)}</span>
          <span><strong>我的收藏</strong><small>${stats.favoriteCount} 个收藏内容</small></span>
          ${icon('chevron-right', 18)}
        </a>
      </section>
    </div>
  `;
}

function renderChapter(chapter, index, state) {
  const ids = questions.filter((question) => question.chapterId === chapter.id).map((q) => q.id);
  const progress = getChapterProgress(state, ids);
  return `
    <a class="chapter-card" href="#/quiz?chapter=${chapter.id}">
      <span class="chapter-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="chapter-copy">
        <strong>${escapeHTML(chapter.shortTitle)}</strong>
        <small>${progress.answered} / ${progress.total} 题</small>
      </span>
      ${progressBar(progress.percent, `${chapter.shortTitle}完成度`)}
      ${icon('arrow-up-right', 18)}
    </a>
  `;
}
