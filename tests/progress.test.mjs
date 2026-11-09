import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  dismissWrong,
  getRecentAnswers,
  getWrongIds,
  recordAnswer
} from '../js/core.js';

test('从错题本移除后保留历史答题次数', () => {
  const state = createInitialState();
  recordAnswer(state, 'q001', false, new Date('2026-11-09T10:00:00Z'));
  assert.deepEqual(getWrongIds(state), ['q001']);
  dismissWrong(state, 'q001');
  assert.equal(getWrongIds(state).length, 0);
  assert.equal(state.answered.q001.wrongCount, 1);
  assert.equal(state.answered.q001.attempts, 1);
});

test('最近答题按时间倒序并带题目信息', () => {
  const state = createInitialState();
  recordAnswer(state, 'q001', true, new Date('2026-11-09T10:00:00Z'));
  recordAnswer(state, 'q002', false, new Date('2026-11-09T10:05:00Z'));
  const questions = [
    { id: 'q001', number: 1, stem: '第一题', chapter: '绪论' },
    { id: 'q002', number: 2, stem: '第二题', chapter: '绪论' }
  ];
  const recent = getRecentAnswers(state, questions, 2);
  assert.equal(recent[0].question.id, 'q002');
  assert.equal(recent[0].record.lastCorrect, false);
});
