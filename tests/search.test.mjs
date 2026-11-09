import test from 'node:test';
import assert from 'node:assert/strict';
import { searchContent } from '../js/search.js';

test('搜索覆盖知识卡、选择题和主观题', () => {
  assert.ok(searchContent('毛泽东思想').some((item) => item.kind === 'knowledge'));
  assert.ok(searchContent('六届六中全会').some((item) => item.kind === 'question'));
  assert.ok(searchContent('农村包围城市').some((item) => item.kind === 'subjective'));
});

test('空搜索无结果，多关键词优先匹配覆盖更多的内容', () => {
  assert.deepEqual(searchContent('   '), []);
  const results = searchContent('农村包围城市 武装夺取政权');
  assert.ok(results.length > 0);
  assert.ok(results[0].score >= results.at(-1).score);
});
