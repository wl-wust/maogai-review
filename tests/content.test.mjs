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
  assert.equal(subjective.length, 25);
  assert.equal(knowledge.length, 17);
  assert.equal(new Set(subjective.map((item) => item.id)).size, 25);
  assert.equal(new Set(knowledge.map((item) => item.id)).size, 17);
  assert.ok(subjective.every((item) => item.question && item.answer.length > 30));
  assert.ok(knowledge.every((item) => item.title && item.content.length > 30));
});

test('打勾章节的本章小结与教材思考题已补充', async () => {
  const { subjective } = await import('../data/subjective.js');
  const { knowledge } = await import('../data/knowledge.js');
  const checkedChapters = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter6', 'chapter7', 'chapter8'];
  for (const chapterId of checkedChapters) {
    assert.ok(
      knowledge.some(
        (item) => item.chapterId === chapterId && item.title === `第${chapterId.slice(7)}章 本章小结`
      ),
      `${chapterId} 缺少本章小结`
    );
  }
  for (const id of ['s13', 's14', 's15', 's16', 's17', 's18', 's19', 's20', 's21', 's22', 's23', 's24', 's25']) {
    assert.ok(subjective.some((item) => item.id === id), `${id} 思考题缺失`);
  }
});

test('内容更新后保留旧记录使用的数据标识', async () => {
  const { questions } = await import('../data/questions.js');
  const { subjective } = await import('../data/subjective.js');
  const { knowledge } = await import('../data/knowledge.js');
  const { STORAGE_KEY } = await import('../js/core.js');
  assert.equal(STORAGE_KEY, 'maogai-review-state-v1');
  for (const id of ['q001', 'q135', 'q270']) {
    assert.ok(questions.some((item) => item.id === id), `${id} 被意外删除`);
  }
  for (let index = 1; index <= 12; index += 1) {
    assert.ok(subjective.some((item) => item.id === `s${String(index).padStart(2, '0')}`));
  }
  for (let index = 1; index <= 10; index += 1) {
    assert.ok(knowledge.some((item) => item.id === `k${String(index).padStart(2, '0')}`));
  }
});
