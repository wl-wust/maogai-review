import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  getStats,
  gradeAnswer,
  loadState,
  recordAnswer,
  toggleFavorite
} from '../js/core.js';

test('多选答案忽略顺序并拒绝缺项', () => {
  assert.equal(gradeAnswer(['C', 'A'], 'AC'), true);
  assert.equal(gradeAnswer(['A'], 'AC'), false);
  assert.equal(gradeAnswer(['A', 'A', 'C'], 'AC'), true);
});

test('答题记录累计正确率与错题', () => {
  const state = createInitialState();
  recordAnswer(state, 'q001', true, new Date('2026-11-09T10:00:00Z'));
  recordAnswer(state, 'q001', true, new Date('2026-11-09T10:01:00Z'));
  recordAnswer(state, 'q002', false, new Date('2026-11-09T10:02:00Z'));
  assert.equal(state.answered.q001.attempts, 2);
  assert.equal(state.answered.q001.correctCount, 2);
  assert.equal(state.answered.q001.streak, 2);
  assert.equal(state.answered.q002.wrongCount, 1);
  assert.equal(state.answered.q002.streak, 0);
  assert.equal(getStats(state).accuracy, 67);
});

test('收藏可以切换且不产生重复 ID', () => {
  const state = createInitialState();
  assert.equal(toggleFavorite(state, 'questions', 'q001'), true);
  assert.equal(toggleFavorite(state, 'questions', 'q001'), false);
  assert.equal(toggleFavorite(state, 'questions', 'q001'), true);
  assert.deepEqual(state.favorites.questions, ['q001']);
});

test('损坏的本地数据回退到初始状态', () => {
  const storage = {
    getItem() {
      return '{bad json';
    }
  };
  const state = loadState(storage);
  assert.deepEqual(state.favorites, { questions: [], subjective: [], knowledge: [] });
  assert.deepEqual(state.answered, {});
});
