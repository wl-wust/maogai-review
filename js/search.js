import { knowledge } from '../data/knowledge.js';
import { questions } from '../data/questions.js';
import { subjective } from '../data/subjective.js';

function normalize(value) {
  return String(value ?? '')
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, '')
    .trim();
}

function excerpt(text, terms, length = 86) {
  const source = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const lower = source.toLocaleLowerCase('zh-CN');
  const positions = terms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
  const start = Math.max(0, (positions[0] ?? 0) - 22);
  const value = source.slice(start, start + length);
  return `${start > 0 ? '…' : ''}${value}${start + length < source.length ? '…' : ''}`;
}

const knowledgeIndex = knowledge.map((item) => ({
  kind: 'knowledge',
  id: item.id,
  chapterId: item.chapterId,
  title: item.title,
  subtitle: item.chapter,
  titleText: normalize(`${item.title} ${item.summary} ${item.keywords.join(' ')}`),
  bodyText: normalize(`${item.content} ${item.chapter}`),
  body: `${item.summary} ${item.content}`,
  target: `#/knowledge?card=${item.id}`
}));

const questionIndex = questions.map((item) => ({
  kind: 'question',
  id: item.id,
  chapterId: item.chapterId,
  title: `第 ${item.number} 题 · ${item.type === 'single' ? '单选题' : item.type === 'multiple' ? '多选题' : '判断题'}`,
  subtitle: item.chapter,
  titleText: normalize(item.stem),
  bodyText: normalize(
    `${item.stem} ${item.options.map((option) => `${option.key} ${option.text}`).join(' ')} ${item.answer} ${item.explanation}`
  ),
  body: `${item.stem} ${item.explanation}`,
  target: `#/quiz?chapter=${item.chapterId}&question=${item.id}`
}));

const subjectiveIndex = subjective.map((item) => ({
  kind: 'subjective',
  id: item.id,
  chapterId: item.chapterId,
  title: item.question,
  subtitle: `${item.chapter} · 主观题`,
  titleText: normalize(item.question),
  bodyText: normalize(`${item.answer} ${item.keywords.join(' ')} ${item.chapter}`),
  body: item.answer,
  target: `#/recite?item=${item.id}`
}));

const searchIndex = [...knowledgeIndex, ...subjectiveIndex, ...questionIndex];

export function searchContent(query, options = {}) {
  const terms = String(query ?? '')
    .toLocaleLowerCase('zh-CN')
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);
  if (!terms.length) return [];

  return searchIndex
    .filter((item) => !options.kind || item.kind === options.kind)
    .filter((item) => !options.chapterId || item.chapterId === options.chapterId)
    .map((item) => {
      let score = 0;
      let matchedTerms = 0;
      for (const term of terms) {
        const titleHit = item.titleText.includes(term);
        const bodyHit = item.bodyText.includes(term);
        if (titleHit || bodyHit) matchedTerms += 1;
        if (titleHit) score += 12;
        if (bodyHit) score += 4;
        if (item.titleText.startsWith(term)) score += 6;
      }
      if (matchedTerms !== terms.length) return null;
      return {
        kind: item.kind,
        id: item.id,
        chapterId: item.chapterId,
        title: item.title,
        subtitle: item.subtitle,
        excerpt: excerpt(item.body, terms),
        score,
        target: item.target
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, 'zh-CN'))
    .slice(0, options.limit ?? 40);
}
