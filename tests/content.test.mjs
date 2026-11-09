import test from 'node:test';
import assert from 'node:assert/strict';

test('选择题数量和题型完整', async () => {
  const { questions } = await import('../data/questions.js');
  assert.equal(questions.length, 270);
  assert.equal(questions.filter((q) => q.type === 'single').length, 90);
  assert.equal(questions.filter((q) => q.type === 'multiple').length, 85);
  assert.equal(questions.filter((q) => q.type === 'judge').length, 95);
  assert.equal(new Set(questions.map((q) => q.id)).size, 270);
  assert.ok(
    questions.every(
      (q) =>
        q.stem &&
        q.answer &&
        q.explanation &&
        q.options.length >= 2 &&
        q.chapterId &&
        q.chapter
    )
  );
});

test('主观题与知识库可用于搜索', async () => {
  const { subjective } = await import('../data/subjective.js');
  const { knowledge } = await import('../data/knowledge.js');
  assert.equal(subjective.length, 12);
  assert.ok(knowledge.length >= 9);
  assert.ok(subjective.every((item) => item.question && item.answer.length > 30));
  assert.ok(knowledge.every((item) => item.title && item.content.length > 30));
});
