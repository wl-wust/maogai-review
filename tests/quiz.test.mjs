import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../data/questions.js';
import {
  buildQuiz,
  canSubmitAnswer,
  createQuizSession,
  getAnswerText,
  gradeQuizAnswer
} from '../js/quiz.js';

test('按章节和题型筛选题目', () => {
  assert.equal(buildQuiz(questions, { chapterId: 'all', type: 'all' }).length, 270);
  assert.equal(buildQuiz(questions, { chapterId: 'intro' }).length, 30);
  assert.ok(
    buildQuiz(questions, { chapterId: 'chapter2', type: 'multiple' }).every(
      (item) => item.chapterId === 'chapter2' && item.type === 'multiple'
    )
  );
});

test('随机排序保留全部题目且不修改原数组', () => {
  const original = questions.map((item) => item.id);
  const randomized = buildQuiz(questions, { shuffle: true, rng: () => 0.5 });
  assert.equal(randomized.length, questions.length);
  assert.deepEqual(new Set(randomized.map((item) => item.id)), new Set(original));
  assert.deepEqual(questions.map((item) => item.id), original);
});

test('答题会话保存筛选条件与首题位置', () => {
  const pool = buildQuiz(questions, { chapterId: 'chapter1', type: 'single' });
  const session = createQuizSession(pool, {
    chapterId: 'chapter1',
    type: 'single',
    shuffle: false
  });
  assert.equal(session.questionIds.length, pool.length);
  assert.equal(session.index, 0);
  assert.deepEqual(session.answers, {});
});

test('提交规则和答案解析', () => {
  const single = questions.find((item) => item.type === 'single');
  const multiple = questions.find((item) => item.type === 'multiple');
  assert.equal(canSubmitAnswer(single, []), false);
  assert.equal(canSubmitAnswer(single, ['A']), true);
  assert.equal(canSubmitAnswer(multiple, []), false);
  assert.equal(gradeQuizAnswer(single, [single.answer]), true);
  assert.ok(getAnswerText(single).includes(single.answer));
});
