import { chapters, questions } from '../../data/questions.js';
import { getWrongIds } from '../core.js';
import {
  canSubmitAnswer,
  getAnswerText,
  getSessionQuestions,
  getSessionSummary,
  toggleSelection
} from '../quiz.js';
import { escapeHTML, formatDate, icon, progressBar, typeLabel } from '../ui.js';

const typeOptions = [
  { value: 'all', label: '全部题型' },
  { value: 'single', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'judge', label: '判断题' }
];

export function renderQuiz(state, params) {
  const session = state.lastSession;
  const inSession =
    session &&
    (params.get('resume') === '1' ||
      params.get('question') ||
      params.get('continue') === '1');
  if (inSession && session.questionIds?.length) {
    if (session.finished) return renderQuizSummary(state, session);
    return renderQuizSession(state, session);
  }
  return renderQuizHome(state, params);
}

function renderQuizHome(state, params) {
  const selectedChapter = params.get('chapter') ?? 'all';
  const wrongIds = getWrongIds(state);
  const session = state.lastSession;
  const resumable = session && !session.finished && session.questionIds?.length;
  return `
    <div class="page quiz-page">
      <section class="page-intro compact-intro">
        <div>
          <p class="eyebrow">PRACTICE MODE</p>
          <h1>章节练习</h1>
          <p class="page-lead">按章节或题型练习，选择答案后提交即可查看答案与解析。</p>
        </div>
      </section>

      ${
        resumable
          ? renderResumeBanner(session)
          : ''
      }

      <section class="setup-panel">
        <div class="setup-copy">
          <span class="section-kicker">新练习</span>
          <h2>设置本轮范围</h2>
          <p>题库中的 270 道选择题全部可用，答题记录会自动保存。</p>
        </div>
        <div class="setup-form">
          <label>
            <span>章节</span>
            <select id="quiz-chapter">
              <option value="all" ${selectedChapter === 'all' ? 'selected' : ''}>全部章节</option>
              ${chapters
                .map(
                  (chapter) =>
                    `<option value="${chapter.id}" ${selectedChapter === chapter.id ? 'selected' : ''}>${escapeHTML(chapter.shortTitle)}</option>`
                )
                .join('')}
            </select>
          </label>
          <label>
            <span>题型</span>
            <select id="quiz-type">
              ${typeOptions
                .map((item) => `<option value="${item.value}">${item.label}</option>`)
                .join('')}
            </select>
          </label>
          <label>
            <span>顺序</span>
            <select id="quiz-order">
              <option value="sequence">按题库顺序</option>
              <option value="random">随机打乱</option>
            </select>
          </label>
          <button class="primary-button setup-submit" type="button" data-action="start-quiz">
            ${icon('play', 18)}
            开始练习
          </button>
        </div>
      </section>

      <section class="quiz-options-grid">
        <article class="mode-card">
          <span class="mode-icon accent">${icon('layers-3', 23)}</span>
          <h2>全部题目</h2>
          <p>270 道单选、多选和判断题，适合从头完整过一遍。</p>
          <button class="secondary-button" type="button" data-action="start-all-quiz">
            ${icon('arrow-right', 17)}
            开始全部题目
          </button>
        </article>
        <article class="mode-card">
          <span class="mode-icon teal">${icon('refresh-cw', 23)}</span>
          <h2>错题重练</h2>
          <p>${wrongIds.length ? `当前有 ${wrongIds.length} 道题最近一次答错。` : '目前没有错题，继续保持。'}</p>
          <button class="secondary-button" type="button" data-action="retry-wrong" ${wrongIds.length ? '' : 'disabled'}>
            ${icon('target', 17)}
            重练错题
          </button>
        </article>
        <article class="mode-card">
          <span class="mode-icon gold">${icon('bookmark-check', 23)}</span>
          <h2>收藏题目</h2>
          <p>${state.favorites.questions.length ? `已收藏 ${state.favorites.questions.length} 道选择题。` : '答题时点击收藏，稍后可集中复习。'}</p>
          <a class="secondary-button" href="#/favorites?tab=questions">
            ${icon('bookmark', 17)}
            查看收藏
          </a>
        </article>
      </section>
    </div>
  `;
}

function renderResumeBanner(session) {
  const answered = Object.values(session.answers ?? {}).filter((item) => item.submitted).length;
  const chapter =
    session.chapterId === 'all'
      ? '全部章节'
      : chapters.find((item) => item.id === session.chapterId)?.shortTitle ?? '全部章节';
  return `
    <section class="resume-banner">
      <div class="resume-icon">${icon('history', 22)}</div>
      <div class="resume-copy">
        <span>上次练习 · ${escapeHTML(chapter)}</span>
        <strong>第 ${Math.min(session.index + 1, session.questionIds.length)} / ${session.questionIds.length} 题</strong>
        <small>${answered} 题已提交 · ${formatDate(session.updatedAt)}</small>
      </div>
      <a class="primary-button" href="#/quiz?resume=1">
        ${icon('play', 17)}
        继续作答
      </a>
    </section>
  `;
}

function renderQuizSession(state, session) {
  const sessionQuestions = getSessionQuestions(session, questions);
  const index = Math.min(session.index ?? 0, sessionQuestions.length - 1);
  const question = sessionQuestions[index];
  if (!question) return renderQuizSummary(state, { ...session, finished: true });
  const answerRecord = session.answers?.[question.id] ?? { selected: [], submitted: false };
  const selected = answerRecord.selected ?? [];
  const submitted = Boolean(answerRecord.submitted);
  const favorite = state.favorites.questions.includes(question.id);
  const percent = Math.round(((index + 1) / sessionQuestions.length) * 100);
  return `
    <div class="page quiz-session-page">
      <div class="quiz-toolbar">
        <a class="back-link" href="#/quiz">
          ${icon('arrow-left', 17)}
          退出本轮
        </a>
        <span>${escapeHTML(session.source === 'wrong' ? '错题重练' : session.source === 'question' ? '题目速查' : '章节练习')}</span>
        <button class="mini-icon-button ${favorite ? 'is-active' : ''}" type="button" data-action="favorite" data-category="questions" data-id="${question.id}" aria-label="${favorite ? '取消收藏' : '收藏题目'}">
          ${icon('bookmark', 18)}
        </button>
      </div>

      <div class="quiz-progress">
        <div class="progress-meta">
          <span>第 ${index + 1} / ${sessionQuestions.length} 题</span>
          <span>${escapeHTML(question.chapter)}</span>
        </div>
        ${progressBar(percent, '本轮答题进度')}
      </div>

      <article class="question-panel">
        <div class="question-heading">
          <span class="question-type">${typeLabel(question.type)}</span>
          <span class="question-number">Q${String(question.number).padStart(3, '0')}</span>
        </div>
        <h1>${escapeHTML(question.stem)}</h1>
        ${
          question.type === 'multiple'
            ? '<p class="question-hint">多选题，可选择多个答案</p>'
            : ''
        }

        <div class="option-list" role="group" aria-label="答案选项">
          ${question.options
            .map((option) =>
              renderOption(option, question, selected, submitted, answerRecord)
            )
            .join('')}
        </div>

        ${
          submitted
            ? renderAnswerResult(question, answerRecord)
            : `
              <div class="answer-actions">
                <button class="primary-button" type="button" data-action="submit-answer" ${canSubmitAnswer(question, selected) ? '' : 'disabled'}>
                  ${icon('check', 18)}
                  提交答案
                </button>
                <span>提交后查看答案解析</span>
              </div>
            `
        }
      </article>

      <div class="quiz-navigation">
        <button class="secondary-button" type="button" data-action="previous-question" ${index === 0 ? 'disabled' : ''}>
          ${icon('arrow-left', 17)}
          上一题
        </button>
        <button class="primary-button" type="button" data-action="next-question" ${submitted ? '' : 'disabled'}>
          ${index === sessionQuestions.length - 1 ? '完成本轮' : '下一题'}
          ${icon(index === sessionQuestions.length - 1 ? 'flag' : 'arrow-right', 17)}
        </button>
      </div>
    </div>
  `;
}

function renderOption(option, question, selected, submitted, answerRecord) {
  const isSelected = selected.includes(option.key);
  const isAnswer = question.answer.includes(option.key);
  const classes = [
    'option-button',
    isSelected ? 'is-selected' : '',
    submitted && isAnswer ? 'is-correct' : '',
    submitted && isSelected && !isAnswer ? 'is-wrong' : ''
  ]
    .filter(Boolean)
    .join(' ');
  return `
    <button
      class="${classes}"
      type="button"
      data-action="select-option"
      data-key="${option.key}"
      data-question="${question.id}"
      aria-pressed="${isSelected}"
      ${submitted ? 'disabled' : ''}
    >
      <span class="option-key">${option.key}</span>
      <span>${escapeHTML(option.text)}</span>
      ${
        submitted && isAnswer
          ? `<span class="option-mark correct-mark">${icon('check', 17)}</span>`
          : submitted && isSelected
            ? `<span class="option-mark wrong-mark">${icon('x', 17)}</span>`
            : ''
      }
    </button>
  `;
}

function renderAnswerResult(question, record) {
  return `
    <section class="answer-result ${record.correct ? 'is-correct' : 'is-wrong'}" aria-live="polite">
      <div class="answer-result-title">
        <span class="result-icon">${icon(record.correct ? 'circle-check' : 'circle-x', 22)}</span>
        <div>
          <strong>${record.correct ? '回答正确' : '回答错误'}</strong>
          <small>${record.correct ? '继续保持这个节奏' : '重点看一遍答案和解析'}</small>
        </div>
      </div>
      <div class="correct-answer">
        <span>正确答案</span>
        <strong>${escapeHTML(getAnswerText(question))}</strong>
      </div>
      <div class="explanation">
        <span>答案解析</span>
        <p>${escapeHTML(question.explanation)}</p>
      </div>
    </section>
  `;
}

function renderQuizSummary(state, session) {
  const summary = getSessionSummary(session);
  const sessionQuestions = getSessionQuestions(session, questions);
  return `
    <div class="page quiz-summary-page">
      <section class="summary-hero">
        <p class="eyebrow">ROUND COMPLETE</p>
        <h1>本轮完成</h1>
        <p>已经完成 ${summary.answered} / ${sessionQuestions.length} 道题，学习记录已保存。</p>
        <div class="summary-score">
          <strong>${summary.accuracy}%</strong>
          <span>本轮正确率</span>
        </div>
      </section>

      <div class="summary-grid">
        <div class="summary-stat">
          <span>${summary.correct}</span>
          <small>答对</small>
        </div>
        <div class="summary-stat">
          <span>${summary.wrong}</span>
          <small>答错</small>
        </div>
        <div class="summary-stat">
          <span>${summary.answered}</span>
          <small>已作答</small>
        </div>
      </div>

      ${
        summary.wrongIds.length
          ? `
            <section class="wrong-review">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">需要再看一遍</span>
                  <h2>本轮错题</h2>
                </div>
              </div>
              <div class="wrong-list">
                ${summary.wrongIds
                  .map((id) => {
                    const question = questions.find((item) => item.id === id);
                    return question
                      ? `<a href="#/quiz?question=${id}"><span>第 ${question.number} 题</span><strong>${escapeHTML(question.stem)}</strong>${icon('chevron-right', 17)}</a>`
                      : '';
                  })
                  .join('')}
              </div>
            </section>
          `
          : `
            <div class="perfect-result">
              ${icon('sparkles', 22)}
              <strong>本轮没有错题</strong>
              <span>可以继续下一轮练习，巩固记忆。</span>
            </div>
          `
      }

      <div class="summary-actions">
        ${
          summary.wrongIds.length
            ? `<button class="primary-button" type="button" data-action="retry-wrong">${icon('refresh-cw', 18)} 重练本轮错题</button>`
            : ''
        }
        <button class="secondary-button" type="button" data-action="restart-quiz">${icon('rotate-ccw', 18)} 再练一轮</button>
        <a class="ghost-button" href="#/home">${icon('house', 18)} 返回首页</a>
      </div>
    </div>
  `;
}

export function getSelectedKeys(question, current, key) {
  return toggleSelection(question, current, key);
}
