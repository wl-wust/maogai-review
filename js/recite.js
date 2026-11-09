export const RECITE_MODES = [
  { value: 'hidden', label: '无答案' },
  { value: 'cloze', label: '挖空背' },
  { value: 'full', label: '完整答案' }
];

const MODE_VALUES = new Set(RECITE_MODES.map((item) => item.value));

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function deriveKeywords(answer, limit) {
  const phrases = [];
  for (const line of String(answer).split('\n')) {
    const clean = line.replace(/^\s*\d+[.、]\s*/, '').replace(/[。；;：:，,]/g, ' ');
    const matches = clean.match(/[\u4e00-\u9fa5]{4,10}/g) ?? [];
    for (const match of matches) {
      const value = match.slice(0, Math.min(6, match.length));
      if (value.length >= 4 && !phrases.includes(value)) phrases.push(value);
      if (phrases.length >= limit) return phrases;
    }
  }
  return phrases;
}

function renderBlank(value, index) {
  return `<button class="cloze-blank" type="button" data-action="reveal-cloze" data-answer="${escapeHTML(value)}" data-index="${index}" aria-label="点击显示挖空内容"><span>${'•'.repeat(Math.min(6, Math.max(3, value.length)))}</span></button>`;
}

export function buildCloze(answer, keywords = [], limit = 8) {
  const uniqueKeywords = [...new Set(keywords.filter((item) => String(item).trim().length >= 2))]
    .map((item) => String(item).trim())
    .sort((left, right) => right.length - left.length);
  const candidates = uniqueKeywords.length ? uniqueKeywords : deriveKeywords(answer, limit);
  let blankIndex = 0;
  return String(answer)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      let cursor = 0;
      let output = '';
      while (cursor < line.length && blankIndex < limit) {
        let nearest = -1;
        let nearestKeyword = '';
        for (const keyword of candidates) {
          const position = line.indexOf(keyword, cursor);
          if (
            position >= 0 &&
            (nearest < 0 ||
              position < nearest ||
              (position === nearest && keyword.length > nearestKeyword.length))
          ) {
            nearest = position;
            nearestKeyword = keyword;
          }
        }
        if (nearest < 0) break;
        output += escapeHTML(line.slice(cursor, nearest));
        output += renderBlank(nearestKeyword, blankIndex);
        blankIndex += 1;
        cursor = nearest + nearestKeyword.length;
      }
      output += escapeHTML(line.slice(cursor));
      return `<p>${output}</p>`;
    })
    .join('');
}

export function getReciteMode(state, itemId) {
  const value = state.subjective?.modes?.[itemId];
  return MODE_VALUES.has(value) ? value : 'hidden';
}

export function setReciteMode(state, itemId, mode) {
  if (!MODE_VALUES.has(mode)) throw new Error(`未知背诵模式：${mode}`);
  state.subjective.modes[itemId] = mode;
  return mode;
}
