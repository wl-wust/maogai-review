export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function icon(name, size = 20) {
  return `<i data-lucide="${escapeHTML(name)}" class="ui-icon" style="--icon-size:${size}px" aria-hidden="true"></i>`;
}

export function refreshIcons(root = document) {
  globalThis.lucide?.createIcons({
    root,
    attrs: {
      'stroke-width': 1.9,
      'aria-hidden': 'true'
    }
  });
}

export function toast(message, tone = 'default') {
  const region = document.querySelector('#toast-region');
  if (!region) return;
  const item = document.createElement('div');
  item.className = `toast toast-${tone}`;
  item.textContent = message;
  region.append(item);
  window.setTimeout(() => item.classList.add('is-visible'), 20);
  window.setTimeout(() => {
    item.classList.remove('is-visible');
    window.setTimeout(() => item.remove(), 220);
  }, 2600);
}

export function progressBar(percent, label = '') {
  return `
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${escapeHTML(label)}">
      <span style="width:${Math.max(0, Math.min(100, percent))}%"></span>
    </div>
  `;
}

export function formatDate(value) {
  if (!value) return '尚无记录';
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function typeLabel(type) {
  return { single: '单选题', multiple: '多选题', judge: '判断题' }[type] ?? '选择题';
}

export function emptyState(iconName, title, description, action = '') {
  return `
    <div class="empty-state">
      <span class="empty-icon">${icon(iconName, 28)}</span>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(description)}</p>
      ${action}
    </div>
  `;
}
