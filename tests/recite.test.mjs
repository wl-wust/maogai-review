import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCloze, getReciteMode, RECITE_MODES } from '../js/recite.js';

const answer = '1. 第一要义是发展。\n2. 核心是以人为本。\n3. 根本方法是统筹兼顾。';

test('挖空模式保留分段并生成可点击空格', () => {
  const html = buildCloze(answer, ['发展', '以人为本', '统筹兼顾']);
  assert.ok(html.includes('cloze-blank'));
  assert.ok(html.includes('data-answer="发展"'));
  assert.ok(html.includes('1. 第一要义是'));
  assert.equal((html.match(/cloze-blank/g) ?? []).length, 3);
});

test('没有关键词时按要点生成有限数量挖空', () => {
  const html = buildCloze(answer, [], 2);
  assert.ok((html.match(/cloze-blank/g) ?? []).length >= 1);
  assert.ok((html.match(/cloze-blank/g) ?? []).length <= 2);
});

test('背诵模式回退到无答案', () => {
  assert.equal(RECITE_MODES.length, 3);
  assert.equal(getReciteMode({ subjective: { modes: {} } }, 's01'), 'hidden');
  assert.equal(getReciteMode({ subjective: { modes: { s01: 'cloze' } } }, 's01'), 'cloze');
  assert.equal(getReciteMode({ subjective: { modes: { s01: 'bad' } } }, 's01'), 'hidden');
});
