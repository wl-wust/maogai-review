const STORAGE_KEY = 'maogai-review-state-v1';
const FAVORITE_CATEGORIES = ['questions', 'subjective', 'knowledge'];

export function createInitialState() {
  return {
    version: 1,
    answered: {},
    favorites: {
      questions: [],
      subjective: [],
      knowledge: []
    },
    lastSession: null,
    subjective: {
      index: 0,
      modes: {}
    }
  };
}

function normalizeAnswer(value) {
  const values = Array.isArray(value) ? value : String(value ?? '').split('');
  return [...new Set(values.map((item) => String(item).trim().toUpperCase()).filter(Boolean))].sort();
}

export function gradeAnswer(selected, answer) {
  const left = normalizeAnswer(selected);
  const right = normalizeAnswer(answer);
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function recordAnswer(state, questionId, correct, when = new Date()) {
  const previous = state.answered[questionId] ?? {
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    bestStreak: 0,
    lastCorrect: null,
    lastAt: null,
    lastWrongAt: null
  };
  const timestamp = when instanceof Date ? when.toISOString() : new Date(when).toISOString();
  const streak = correct ? previous.streak + 1 : 0;
  state.answered[questionId] = {
    ...previous,
    attempts: previous.attempts + 1,
    correctCount: previous.correctCount + (correct ? 1 : 0),
    wrongCount: previous.wrongCount + (correct ? 0 : 1),
    streak,
    bestStreak: Math.max(previous.bestStreak, streak),
    lastCorrect: Boolean(correct),
    lastAt: timestamp,
    lastWrongAt: correct ? previous.lastWrongAt : timestamp
  };
  return state.answered[questionId];
}

export function toggleFavorite(state, category, id) {
  if (!FAVORITE_CATEGORIES.includes(category)) throw new Error(`未知收藏分类：${category}`);
  const list = state.favorites[category];
  const existing = list.indexOf(id);
  if (existing >= 0) {
    list.splice(existing, 1);
    return false;
  }
  list.push(id);
  return true;
}

export function getStats(state) {
  const records = Object.values(state.answered);
  const attempts = records.reduce((sum, item) => sum + item.attempts, 0);
  const correct = records.reduce((sum, item) => sum + item.correctCount, 0);
  const answeredCount = records.length;
  const wrongCount = records.filter((item) => item.lastCorrect === false).length;
  return {
    answeredCount,
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    wrongCount,
    favoriteCount: FAVORITE_CATEGORIES.reduce(
      (sum, category) => sum + state.favorites[category].length,
      0
    )
  };
}

export function getWrongIds(state) {
  return Object.entries(state.answered)
    .filter(([, record]) => record.lastCorrect === false)
    .sort(([, left], [, right]) => new Date(right.lastWrongAt) - new Date(left.lastWrongAt))
    .map(([id]) => id);
}

export function getChapterProgress(state, questionIds) {
  const total = questionIds.length;
  const answered = questionIds.filter((id) => state.answered[id]).length;
  return {
    answered,
    total,
    percent: total ? Math.round((answered / total) * 100) : 0
  };
}

export function setLastSession(state, session) {
  state.lastSession = {
    ...session,
    updatedAt: new Date().toISOString()
  };
  return state.lastSession;
}

export function resolveLastSession(state, questionIds) {
  if (!state.lastSession) return null;
  const validIds = state.lastSession.questionIds?.filter((id) => questionIds.includes(id)) ?? [];
  if (!validIds.length) return null;
  return {
    ...state.lastSession,
    questionIds: validIds,
    index: Math.min(Math.max(0, state.lastSession.index ?? 0), validIds.length - 1)
  };
}

function sanitizeState(value) {
  const initial = createInitialState();
  if (!value || typeof value !== 'object') return initial;
  const answered = value.answered && typeof value.answered === 'object' ? value.answered : {};
  const favorites = value.favorites && typeof value.favorites === 'object' ? value.favorites : {};
  return {
    ...initial,
    ...value,
    answered,
    favorites: {
      questions: Array.isArray(favorites.questions) ? favorites.questions : [],
      subjective: Array.isArray(favorites.subjective) ? favorites.subjective : [],
      knowledge: Array.isArray(favorites.knowledge) ? favorites.knowledge : []
    },
    subjective: {
      index: Number.isFinite(value.subjective?.index) ? value.subjective.index : 0,
      modes:
        value.subjective?.modes && typeof value.subjective.modes === 'object'
          ? value.subjective.modes
          : {}
    }
  };
}

export function loadState(storage = globalThis.localStorage) {
  if (!storage) return createInitialState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : createInitialState();
  } catch {
    return createInitialState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export { STORAGE_KEY, FAVORITE_CATEGORIES };
