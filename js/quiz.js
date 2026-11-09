import { gradeAnswer } from './core.js';

export function buildQuiz(allQuestions, options = {}) {
  const filtered = allQuestions.filter((question) => {
    if (options.chapterId && options.chapterId !== 'all' && question.chapterId !== options.chapterId) {
      return false;
    }
    if (options.type && options.type !== 'all' && question.type !== options.type) return false;
    return true;
  });
  if (!options.shuffle) return [...filtered];
  const rng = options.rng ?? Math.random;
  const result = [...filtered];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createQuizSession(pool, options = {}) {
  const questionIds = options.questionIds ?? pool.map((item) => item.id);
  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `quiz-${Date.now()}`,
    source: options.source ?? 'practice',
    chapterId: options.chapterId ?? 'all',
    type: options.type ?? 'all',
    shuffle: Boolean(options.shuffle),
    questionIds,
    index: Math.max(0, Math.min(options.index ?? 0, Math.max(0, questionIds.length - 1))),
    answers: {},
    startedAt: now,
    updatedAt: now,
    finished: false
  };
}

export function canSubmitAnswer(question, selected) {
  const values = Array.isArray(selected) ? selected : [];
  if (!values.length) return false;
  if (question.type === 'single' || question.type === 'judge') return values.length === 1;
  return values.length >= 1;
}

export function toggleSelection(question, selected, key) {
  const current = Array.isArray(selected) ? selected : [];
  if (question.type === 'multiple') {
    return current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key].sort();
  }
  return [key];
}

export function gradeQuizAnswer(question, selected) {
  return gradeAnswer(selected, question.answer);
}

export function getAnswerText(question) {
  const keys = String(question.answer).split('');
  return keys
    .map((key) => {
      const option = question.options.find((item) => item.key === key);
      return option ? `${key}. ${option.text}` : key;
    })
    .join('；');
}

export function getSessionQuestions(session, allQuestions) {
  const map = new Map(allQuestions.map((item) => [item.id, item]));
  return session.questionIds.map((id) => map.get(id)).filter(Boolean);
}

export function getSessionSummary(session) {
  const records = Object.values(session.answers ?? {}).filter((item) => item.submitted);
  const correct = records.filter((item) => item.correct).length;
  return {
    answered: records.length,
    correct,
    wrong: records.length - correct,
    accuracy: records.length ? Math.round((correct / records.length) * 100) : 0,
    wrongIds: Object.entries(session.answers ?? {})
      .filter(([, item]) => item.submitted && !item.correct)
      .map(([id]) => id)
  };
}
