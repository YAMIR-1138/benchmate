export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v);
  }
  for (const c of children) e.append(c);
  return e;
}

export function html(strings: TemplateStringsArray, ...vals: unknown[]): DocumentFragment {
  const t = document.createElement('template');
  t.innerHTML = strings.reduce((acc, s, i) => acc + s + (i < vals.length ? String(vals[i]) : ''), '');
  return t.content;
}

export function esc(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function $<T extends Element = HTMLElement>(root: ParentNode, sel: string): T {
  const e = root.querySelector<T>(sel);
  if (!e) throw new Error(`missing ${sel}`);
  return e;
}
export function $$<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] { return Array.from(root.querySelectorAll<T>(sel)); }

export function unitSelect(name: string, units: string[], selected: string, extraClass = ''): string {
  return `<select class="unit ${extraClass}" name="${name}" aria-label="unit">${units.map((u) => `<option value="${esc(u)}" ${u === selected ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>`;
}

export function vibrate(ms: number | number[]): void { try { navigator.vibrate?.(ms); } catch { /* ignore */ } }

export async function copyText(s: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(s); return true; } catch { return false; }
}

export function toast(msg: string): void {
  let t = document.querySelector<HTMLElement>('.toast');
  if (!t) { t = el('div', { class: 'toast' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t?.classList.remove('show'), 1600);
}
