import { addLog, clearLog, dayKey, exportLog, hhmm, logEntries, moveLog, removeLog, setLogTime, updateLog, type LogEntry } from '../lib/log';
import { TOOLS } from '../main';
import { $, $$, copyText, esc, html, toast } from '../lib/dom';

export function renderLog(main: HTMLElement) {
  let scope: 'today' | 'all' = 'today';
  main.append(html`
    <div class="note" style="margin-top:14px">Every tool has an <b>Add to log</b> button. Notes typed here go in with the time. Tap an entry to edit it. Export the day as text for a notebook or a chat model.</div>
    <div class="compose"><input id="ntitle" type="text" placeholder="title (optional)" /><textarea id="note" rows="2" placeholder="note, e.g. cells ~80 % confluent, passaged 1:6"></textarea><div class="actions" style="padding-top:8px"><button class="btn primary" id="addnote">Add note</button></div></div>
    <div class="seg-ctl" id="scope" style="margin-top:14px"><button data-s="today" class="on">Today</button><button data-s="all">All days</button></div>
    <div id="entries" style="margin-top:6px"></div>
    <div class="actions" id="exports"><button class="btn primary" id="ai">Copy for AI</button><button class="btn" id="plain">Copy text</button><button class="btn" id="share" hidden>Share</button></div>
    <div class="actions" style="margin-top:8px"><button class="btn quiet" id="clear">Clear shown</button></div>
  `);
  const toolName = (id: string) => TOOLS.find((t) => t.id === id)?.name ?? id;
  const shown = (): LogEntry[] => { const all = logEntries(); return scope === 'all' ? all : all.filter((e) => dayKey(e.t) === dayKey(Date.now())); };
  function paint() {
    const es = shown(); const box = $(main, '#entries');
    $(main, '#exports').hidden = es.length === 0; $(main, '#clear').hidden = es.length === 0;
    if (!es.length) { box.innerHTML = `<div class="muted" style="padding:24px 0;text-align:center;font-size:15px">${scope === 'today' ? 'Nothing logged today.' : 'Nothing logged yet.'}</div>`; return; }
    const days = new Map<string, LogEntry[]>();
    for (const e of es) days.set(dayKey(e.t), [...(days.get(dayKey(e.t)) ?? []), e]);
    box.innerHTML = [...days.entries()].map(([day, list]) => `<div class="section"><div class="cap">${esc(day)}</div><div class="list">${list.map((e) => `<div class="item" style="align-items:flex-start;padding:10px 0;gap:8px"><input type="text" inputmode="numeric" class="ltime" data-t="${e.id}" value="${hhmm(e.t)}" aria-label="time" /><div class="grow lbody" data-e="${e.id}" style="min-width:0;cursor:text"><div style="font-weight:700">${esc(e.title)}${e.tool !== 'note' ? ` <span class="mono muted" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase">${esc(toolName(e.tool))}</span>` : ''}</div><div style="font-size:14px;white-space:pre-wrap;word-break:break-word;margin-top:2px">${esc(e.text)}</div></div><span class="lmove"><button data-mv="-1" data-id="${e.id}" aria-label="move up">▲</button><button data-mv="1" data-id="${e.id}" aria-label="move down">▼</button></span><button class="x" data-x="${e.id}" aria-label="remove" style="flex:0 0 auto">×</button></div>`).join('')}</div></div>`).join('');
    $$<HTMLElement>(box, '[data-x]').forEach((b) => b.addEventListener('click', () => { removeLog(b.dataset.x!); paint(); }));
    $$<HTMLElement>(box, '[data-mv]').forEach((b) => b.addEventListener('click', () => { moveLog(b.dataset.id!, Number(b.dataset.mv) as -1 | 1); paint(); }));
    $$<HTMLInputElement>(box, '.ltime').forEach((i) => i.addEventListener('change', () => { setLogTime(i.dataset.t!, i.value); paint(); }));
    $$<HTMLElement>(box, '.lbody').forEach((el) => el.addEventListener('click', () => {
      const e = logEntries().find((x) => x.id === el.dataset.e); if (!e || el.querySelector('textarea')) return;
      el.innerHTML = `<input class="ltitle" type="text" value="${esc(e.title)}" aria-label="title" /><textarea class="ltext" rows="${Math.min(10, Math.max(2, e.text.split('\n').length + 1))}" aria-label="text">${esc(e.text)}</textarea><div class="actions" style="padding-top:6px"><button class="btn primary" data-save>Save</button><button class="btn quiet" data-cancel>Cancel</button></div>`;
      el.style.cursor = 'auto';
      el.querySelector<HTMLTextAreaElement>('.ltext')!.focus();
      el.querySelector('[data-save]')!.addEventListener('click', (ev) => { ev.stopPropagation(); updateLog(e.id, { title: el.querySelector<HTMLInputElement>('.ltitle')!.value, text: el.querySelector<HTMLTextAreaElement>('.ltext')!.value }); paint(); });
      el.querySelector('[data-cancel]')!.addEventListener('click', (ev) => { ev.stopPropagation(); paint(); });
    }));
  }
  $(main, '#addnote').addEventListener('click', () => { const i = $<HTMLTextAreaElement>(main, '#note'), t = $<HTMLInputElement>(main, '#ntitle'); const v = i.value.trim(); if (!v && !t.value.trim()) return; addLog('note', t.value.trim() || 'Note', v || t.value.trim()); i.value = ''; t.value = ''; paint(); });
  $<HTMLTextAreaElement>(main, '#note').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $(main, '#addnote').dispatchEvent(new Event('click')); });
  $(main, '#scope').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (!b) return; scope = b.dataset.s as typeof scope; $$(main, '#scope button').forEach((x) => x.classList.toggle('on', x === b)); paint(); });
  $(main, '#ai').addEventListener('click', async () => { if (await copyText(exportLog(shown(), true))) toast('Copied · paste into the chat'); });
  $(main, '#plain').addEventListener('click', async () => { if (await copyText(exportLog(shown(), false))) toast('Copied'); });
  const share = $<HTMLButtonElement>(main, '#share');
  if (typeof navigator.share === 'function') { share.hidden = false; share.addEventListener('click', () => { navigator.share({ title: 'Bench log', text: exportLog(shown(), false) }).catch(() => undefined); }); }
  $(main, '#clear').addEventListener('click', () => { const es = shown(); if (confirm(`Remove ${es.length} entr${es.length === 1 ? 'y' : 'ies'} from the log?`)) { clearLog(es.map((e) => e.id)); paint(); } });
  paint();
}
