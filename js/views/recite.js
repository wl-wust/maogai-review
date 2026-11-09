import { subjective } from '../../data/subjective.js';
import { buildCloze, getReciteMode, RECITE_MODES } from '../recite.js';
import { escapeHTML, icon, progressBar } from '../ui.js';

export function renderRecite(state, params) {
  const itemId = params.get('item');
  const explicitIndex = subjective.findIndex((item) => item.id === itemId);
  const index =
    explicitIndex >= 0
      ? explicitIndex
      : Math.min(Math.max(0, state.subjective.index ?? 0), subjective.length - 1);
  const item = subjective[index];
  const mode = getReciteMode(state, item.id);
  const favorite = state.favorites.subjective.includes(item.id);
  const percent = Math.round(((index + 1) / subjective.length) * 100);
  return `
    <div class="page recite-page">
      <section class="page-intro compact-intro">
        <div>
          <p class="eyebrow">RECITATION MODE</p>
          <h1>主观题背诵</h1>
          <p class="page-lead">先尝试回忆答案，再用挖空或完整答案核对要点。</p>
        </div>
      </section>

      <div class="mode-switch" role="group" aria-label="背诵模式">
        ${RECITE_MODES.map(
          (itemMode) => `
            <button
              class="${mode === itemMode.value ? 'is-active' : ''}"
              type="button"
              data-action="set-recite-mode"
              data-mode="${itemMode.value}"
              aria-pressed="${mode === itemMode.value}"
            >
              ${itemMode.label}
            </button>
          `
        ).join('')}
      </div>

      <div class="recite-layout">
        <aside class="recite-index" aria-label="主观题列表">
          <div class="recite-index-title">
            <span>题目目录</span>
            <small>${subjective.length} 题</small>
          </div>
          <div class="recite-index-list">
            ${subjective
              .map(
                (entry, entryIndex) => `
                  <a
                    class="${entryIndex === index ? 'is-active' : ''}"
                    href="#/recite?item=${entry.id}"
                  >
                    <span>${String(entryIndex + 1).padStart(2, '0')}</span>
                    <strong>${escapeHTML(entry.question)}</strong>
                  </a>
                `
              )
              .join('')}
          </div>
        </aside>

        <article class="recite-card">
          <div class="recite-topline">
            <div class="recite-position">
              <span>${escapeHTML(item.chapter)}</span>
              <small>${index + 1} / ${subjective.length}</small>
            </div>
            <button
              class="mini-icon-button ${favorite ? 'is-active' : ''}"
              type="button"
              data-action="favorite"
              data-category="subjective"
              data-id="${item.id}"
              aria-label="${favorite ? '取消收藏' : '收藏主观题'}"
            >
              ${icon('bookmark', 18)}
            </button>
          </div>
          ${progressBar(percent, '主观题浏览进度')}
          <div class="recite-question">
            <span>Q${String(index + 1).padStart(2, '0')}</span>
            <h2>${escapeHTML(item.question)}</h2>
          </div>
          ${renderAnswerStage(item, mode)}

          <div class="recite-navigation">
            <a
              class="secondary-button ${index === 0 ? 'is-disabled' : ''}"
              href="${index === 0 ? '#/recite' : `#/recite?item=${subjective[index - 1].id}`}"
              ${index === 0 ? 'aria-disabled="true" tabindex="-1"' : ''}
            >
              ${icon('arrow-left', 17)}
              上一题
            </a>
            <span>${index + 1} / ${subjective.length}</span>
            <a
              class="primary-button ${index === subjective.length - 1 ? 'is-disabled' : ''}"
              href="${index === subjective.length - 1 ? '#/recite' : `#/recite?item=${subjective[index + 1].id}`}"
              ${index === subjective.length - 1 ? 'aria-disabled="true" tabindex="-1"' : ''}
            >
              ${index === subjective.length - 1 ? '已是最后一题' : '下一题'}
              ${icon('arrow-right', 17)}
            </a>
          </div>
        </article>
      </div>
    </div>
  `;
}

function renderAnswerStage(item, mode) {
  if (mode === 'hidden') {
    return `
      <section class="answer-stage hidden-answer">
        <div class="hidden-answer-mark">${icon('eye-off', 30)}</div>
        <h3>答案已隐藏</h3>
        <p>先尝试按“总述 + 分点”的方式复述，再切换到挖空或完整答案核对。</p>
        <div class="hint-row">
          ${item.keywords.map((keyword) => `<span>${escapeHTML(keyword.slice(0, 1))}${'○'.repeat(Math.max(0, keyword.length - 1))}</span>`).join('')}
        </div>
      </section>
    `;
  }

  if (mode === 'cloze') {
    return `
      <section class="answer-stage cloze-answer">
        <div class="answer-stage-heading">
          <span>${icon('scan-text', 18)} 挖空背诵</span>
          <small>点击色块显示原文</small>
        </div>
        <div class="recite-answer-content">
          ${buildCloze(item.answer, item.keywords, 9)}
        </div>
      </section>
    `;
  }

  return `
    <section class="answer-stage full-answer">
      <div class="answer-stage-heading">
        <span>${icon('list-checks', 18)} 完整答案</span>
        <small>按要点分条记忆</small>
      </div>
      <div class="recite-answer-points">
        ${item.points
          .map(
            (point, index) => `
              <div class="answer-point">
                <span>${index + 1}</span>
                <p>${escapeHTML(point)}</p>
              </div>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}
