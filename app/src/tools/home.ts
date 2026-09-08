import { TOOLS, toggleTheme } from '../main';
import { icons } from '../lib/icons';
import { el } from '../lib/dom';
import { timerEngine } from './timerEngine';
import { mmss } from '../lib/fmt';
import logo from '../assets/logo.png';

export function renderHome(app: HTMLElement, main: HTMLElement) {
  const brand = el('div', { class: 'brand' });
  brand.innerHTML = `
    <img src="${logo}" alt="TGGR Lab" />
    <div style="flex:1 1 auto"><div class="lab">TGGR</div><div class="word">Bench <b>Mate</b></div></div>
    <button class="iconbtn themebtn" aria-label="Toggle light/dark"></button>`;
  const tb = brand.querySelector<HTMLButtonElement>('.themebtn')!;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  tb.innerHTML = dark ? icons.sun : icons.moon;
  tb.onclick = toggleTheme;
  app.append(brand, el('div', { class: 'stripe' }));

  const grid = el('div', { class: 'grid' });
  TOOLS.forEach((t, i) => {
    const running = t.id === 'timer' ? timerEngine.timers.filter((x) => x.endAt).length : 0;
    const last = i === TOOLS.length - 1 && TOOLS.length % 2 === 1;
    const a = el('a', { class: `tile k${(i % 4) + 1}` + (last ? ' wide' : '') + (t.soon ? ' soon' : ''), href: `#/${t.id}` });
    a.innerHTML = last ? `${icons[t.icon]}<div style="flex:1 1 auto"><div class="name">${t.name}</div><div class="sub">${t.sub}</div></div><span class="idx">${t.idx}</span>` : `<div class="row">${icons[t.icon]}<span class="idx">${t.idx}</span></div>
      <div><div class="name">${t.name}</div><div class="sub">${running ? `${running} running · ${mmss(Math.max(...timerEngine.timers.filter((x) => x.endAt).map((x) => x.endAt! - Date.now())))}` : t.sub}</div></div>`;
    grid.append(a);
  });
  main.append(grid);
  app.append(main);
  const foot = el('div', { class: 'foot' });
  foot.innerHTML = `<span>model BM-1 · v${__APP_VERSION__}</span><span>no ads · no accounts</span>`;
  app.append(foot);
}
