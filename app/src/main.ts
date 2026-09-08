import './styles.css';
import { icons } from './lib/icons';
import { load, save } from './lib/store';
import { el } from './lib/dom';
import { renderHome } from './tools/home';
import { renderDilution } from './tools/dilution';
import { renderMolar } from './tools/molar';
import { renderConvert } from './tools/convert';
import { renderTimer } from './tools/timer';
import { renderCounter } from './tools/counter';
import { renderLadders } from './tools/ladders';
import { renderPlates } from './tools/plates';
import { renderProtocols } from './tools/protocols';
import { timerEngine } from './tools/timerEngine';

export interface Tool { id: string; idx: string; name: string; sub: string; icon: keyof typeof icons; render: (main: HTMLElement) => void; soon?: boolean }

export const TOOLS: Tool[] = [
  { id: 'dilution', idx: '01', name: 'Dilution', sub: 'C1V1 = C2V2', icon: 'drop', render: renderDilution },
  { id: 'molar', idx: '02', name: 'Molar', sub: 'mass · mol · M', icon: 'scale', render: renderMolar },
  { id: 'convert', idx: '03', name: 'Convert', sub: 'units, ×g ↔ rpm, DNA, A260', icon: 'swap', render: renderConvert },
  { id: 'timer', idx: '04', name: 'Timer', sub: 'alarms, presets', icon: 'clock', render: renderTimer },
  { id: 'counter', idx: '05', name: 'Counter', sub: 'colonies, cells', icon: 'tally', render: renderCounter },
  { id: 'ladders', idx: '06', name: 'Ladders', sub: 'DNA · RNA · protein', icon: 'lanes', render: renderLadders },
  { id: 'plates', idx: '07', name: 'Plates', sub: 'area, seeding', icon: 'plate', render: renderPlates },
  { id: 'protocols', idx: '08', name: 'Protocols', sub: 'step by step', icon: 'list', render: renderProtocols },
];

// ---- theme ----
type Theme = 'auto' | 'light' | 'dark';
function applyTheme(t: Theme) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
function isDark(): boolean {
  const t = document.documentElement.getAttribute('data-theme');
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
export function toggleTheme() {
  const next: Theme = isDark() ? 'light' : 'dark';
  save('theme', next); applyTheme(next);
  document.querySelectorAll('.themebtn').forEach((b) => (b.innerHTML = isDark() ? icons.sun : icons.moon));
}
applyTheme(load<Theme>('theme', 'auto'));

// ---- shell ----
export function header(title: string, idx?: string, right?: HTMLElement): HTMLElement {
  const h = el('div', { class: 'top' });
  h.append(el('a', { class: 'back', href: '#/', 'aria-label': 'Home', html: icons.back }));
  const h1 = el('h1'); h1.textContent = title;
  if (idx) h1.append(el('span', { class: 'idx' }, idx));
  h.append(h1);
  if (right) h.append(right);
  return h;
}

const app = document.getElementById('app')!;
let cleanup: (() => void) | undefined;

function route() {
  cleanup?.(); cleanup = undefined;
  const hash = location.hash.replace(/^#\/?/, '');
  const [id, ...rest] = hash.split('/');
  app.innerHTML = '';
  const main = el('main');
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) {
    renderHome(app, main);
  } else {
    app.append(header(tool.name, tool.idx));
    app.append(el('div', { class: 'hair' }));
    (main as any).dataset.sub = rest.join('/');
    tool.render(main);
    cleanup = (main as any).__cleanup;
  }
  if (!main.isConnected) app.append(main);
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);
timerEngine.start();
route();
