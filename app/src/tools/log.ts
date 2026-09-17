import { activeExp, addExperiment, addLog, clearLog, dayKey, experiments, exportLog, hhmm, logEntries, moveLog, removeExperiment, removeLog, renameExperiment, setActiveExp, setLogDate, setLogTime, updateLog, ymd, type LogEntry } from '../lib/log';
import { TOOLS } from '../main';
import { $, $$, copyText, esc, html, toast } from '../lib/dom';

type View = 'today' | 'all' | string; // or an experiment id

export function renderLog(main: HTMLElement) {
  let view: View = activeExp()?.id ?? 'today';
  main.append(html`
    <div class="chips" id="views" style="padding-top:14px"></div>
    <div id="exphead"></div>
    <div class="compose"><input id="ntitle" type="text" placeholder="title (optional)" /><textarea id="note" rows="2" placeholder="note, e.g. cells ~80 % confluent, passaged 1:6"></textarea><div class="actions" style="padding-top:8px"><button class="btn primary" id="addnote">Add note</button><span class="muted" id="target" style="font-size:13px;align-self:center"></span></div></div>
    <div id="entries" style="margin-top:6px"></div>
    <div class="actions" id="exports"><button class="btn primary" id="ai">Copy for AI</button><button class="btn" id="plain">Copy text</button><button class="btn" id="share" hidden>Share</button></div>
    <div class="actions" style="margin-top:8px"><button class="btn quiet" id="clear">Clear shown</button></div>
    <div class="note" style="margin-top:18px">Every tool has an <b>Add to log</b> button; entries go to the experiment marked ●. Tap an entry to edit it, its date or its experiment. Export what is shown as text for a notebook or a chat model.</div>
  `);
  const toolName = (id: string) => TOOLS.find((t) => t.id === id)?.name ?? id;
  const exp = () => experiments().find((e) => e.id === view);
  const shown = (): LogEntry[] => { const all = logEntries(); return view === 'all' ? all : view === 'today' ? all.filter((e) => dayKey(e.t) === dayKey(Date.now())) : all.filter((e) => e.exp === view); };

  function paintViews() {
    const act = activeExp();
    $(main, '#views').innerHTML = [`<button class="chip ${view === 'today' ? 'on' : ''}" data-v="today">Today</button>`, `<button class="chip ${view === 'all' ? 'on' : ''}" data-v="all">All</button>`,
      ...experiments().map((e) => `<button class="chip ${view === e.id ? 'on' : ''}" data-v="${e.id}">${act?.id === e.id ? '● ' : ''}${esc(e.name)}</button>`),
      `<button class="chip" id="newexp" style="border-style:dashed">+ Experiment</button>`].join('');
    const e = exp();
    $(main, '#exphead').innerHTML = e ? `<div class="section" style="padding-top:12px"><div style="display:flex;align-items:center;gap:8px"><input id="expname" type="text" value="${esc(e.name)}" aria-label="experiment name" style="flex:1 1 auto;min-width:0;min-height:44px;padding:0 12px;font-family:var(--display);font-weight:700;font-size:20px;background:transparent;border:0;border-bottom:1px dashed var(--line-soft)" />${act?.id === e.id ? `<button class="chip" id="unset" style="min-height:34px;font-size:12px">stop logging here</button>` : `<button class="chip on" id="setact" style="min-height:34px;font-size:12px">log here</button>`}<button class="x" id="delexp" aria-label="delete experiment">×</button></div><div class="muted" style="font-size:13px;margin-top:4px">started ${esc(dayKey(e.t))}</div></div>` : '';
    $(main, '#target').textContent = act ? `→ ${act.name}` : '→ unfiled';
    $(main, '#views').addEventListener('click', (ev) => { const b = (ev.target as HTMLElement).closest<HTMLElement>('.chip'); if (!b) return; if (b.id === 'newexp') { const name = prompt('Experiment name', ''); if (name === null) return; view = addExperiment(name).id; } else { view = b.dataset.v!; if (view !== 'today' && view !== 'all') setActiveExp(view); } paintAll(); });
    main.querySelector('#expname')?.addEventListener('change', (ev) => { renameExperiment(e!.id, (ev.target as HTMLInputElement).value); paintViews(); });
    main.querySelector('#setact')?.addEventListener('click', () => { setActiveExp(e!.id); paintViews(); });
    main.querySelector('#unset')?.addEventListener('click', () => { setActiveExp(undefined); paintViews(); });
    main.querySelector('#delexp')?.addEventListener('click', () => { if (!confirm(`Delete "${e!.name}"? Its entries stay in the log, unfiled.`)) return; removeExperiment(e!.id); view = 'today'; paintAll(); });
  }
  function paintEntries() {
    const es = shown(); const box = $(main, '#entries'); const ids = es.map((x) => x.id);
    $(main, '#exports').hidden = es.length === 0; $(main, '#clear').hidden = es.length === 0;
    if (!es.length) { box.innerHTML = `<div class="muted" style="padding:24px 0;text-align:center;font-size:15px">${view === 'today' ? 'Nothing logged today.' : view === 'all' ? 'Nothing logged yet.' : 'Nothing in this experiment yet. Entries you add now go here.'}</div>`; return; }
    const days = new Map<string, LogEntry[]>();
    for (const e of es) days.set(dayKey(e.t), [...(days.get(dayKey(e.t)) ?? []), e]);
    const expName = (id?: string) => experiments().find((x) => x.id === id)?.name;
    const dayT = (l: LogEntry[]) => Math.max(...l.map((x) => x.t));
    box.innerHTML = [...days.entries()].sort((a, b) => dayT(b[1]) - dayT(a[1])).map(([day, list]) => `<div class="section"><div class="cap">${esc(day)}</div><div class="list">${list.map((e) => `<div class="item" style="align-items:flex-start;padding:10px 0;gap:8px"><input type="text" inputmode="numeric" class="ltime" data-t="${e.id}" value="${hhmm(e.t)}" aria-label="time" /><div class="grow lbody" data-e="${e.id}" style="min-width:0;cursor:text"><div style="font-weight:700">${esc(e.title)}${e.tool !== 'note' ? ` <span class="mono muted" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase">${esc(toolName(e.tool))}</span>` : ''}${view === 'today' || view === 'all' ? (expName(e.exp) ? ` <span class="tag">${esc(expName(e.exp)!)}</span>` : '') : ''}</div><div style="font-size:14px;white-space:pre-wrap;word-break:break-word;margin-top:2px">${esc(e.text)}</div></div><span class="lmove"><button data-mv="-1" data-id="${e.id}" aria-label="move up">▲</button><button data-mv="1" data-id="${e.id}" aria-label="move down">▼</button></span><button class="x" data-x="${e.id}" aria-label="remove">×</button></div>`).join('')}</div></div>`).join('');
    $$<HTMLElement>(box, '[data-x]').forEach((b) => b.addEventListener('click', () => { removeLog(b.dataset.x!); paintEntries(); }));
    $$<HTMLElement>(box, '[data-mv]').forEach((b) => b.addEventListener('click', () => { moveLog(b.dataset.id!, Number(b.dataset.mv) as -1 | 1, ids); paintEntries(); }));
    $$<HTMLInputElement>(box, '.ltime').forEach((i) => i.addEventListener('change', () => { setLogTime(i.dataset.t!, i.value); paintEntries(); }));
    $$<HTMLElement>(box, '.lbody').forEach((el) => el.addEventListener('click', () => {
      const e = logEntries().find((x) => x.id === el.dataset.e); if (!e || el.querySelector('textarea')) return;
      el.innerHTML = `<input class="ltitle" type="text" value="${esc(e.title)}" aria-label="title" /><textarea class="ltext" rows="${Math.min(10, Math.max(2, e.text.split('\n').length + 1))}" aria-label="text">${esc(e.text)}</textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><input class="ldate" type="date" value="${ymd(e.t)}" aria-label="date" /><select class="lexp" aria-label="experiment"><option value="">unfiled</option>${experiments().map((x) => `<option value="${x.id}" ${x.id === e.exp ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
        <div class="actions" style="padding-top:6px"><button class="btn primary" data-save>Save</button><button class="btn quiet" data-cancel>Cancel</button></div>`;
      el.style.cursor = 'auto';
      el.querySelector<HTMLTextAreaElement>('.ltext')!.focus();
      el.querySelector('[data-save]')!.addEventListener('click', (ev) => { ev.stopPropagation(); updateLog(e.id, { title: el.querySelector<HTMLInputElement>('.ltitle')!.value, text: el.querySelector<HTMLTextAreaElement>('.ltext')!.value, exp: el.querySelector<HTMLSelectElement>('.lexp')!.value }); setLogDate(e.id, el.querySelector<HTMLInputElement>('.ldate')!.value); paintEntries(); });
      el.querySelector('[data-cancel]')!.addEventListener('click', (ev) => { ev.stopPropagation(); paintEntries(); });
    }));
  }
  function paintAll() { paintViews(); paintEntries(); }
  $(main, '#addnote').addEventListener('click', () => { const i = $<HTMLTextAreaElement>(main, '#note'), t = $<HTMLInputElement>(main, '#ntitle'); const v = i.value.trim(); if (!v && !t.value.trim()) return; addLog('note', t.value.trim() || 'Note', v || t.value.trim()); i.value = ''; t.value = ''; paintEntries(); });
  $<HTMLTextAreaElement>(main, '#note').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $(main, '#addnote').dispatchEvent(new Event('click')); });
  $(main, '#ai').addEventListener('click', async () => { if (await copyText(exportLog(shown(), true, exp()))) toast('Copied · paste into the chat'); });
  $(main, '#plain').addEventListener('click', async () => { if (await copyText(exportLog(shown(), false, exp()))) toast('Copied'); });
  const share = $<HTMLButtonElement>(main, '#share');
  if (typeof navigator.share === 'function') { share.hidden = false; share.addEventListener('click', () => { navigator.share({ title: exp()?.name ?? 'Bench log', text: exportLog(shown(), false, exp()) }).catch(() => undefined); }); }
  $(main, '#clear').addEventListener('click', () => { const es = shown(); if (confirm(`Remove ${es.length} entr${es.length === 1 ? 'y' : 'ies'} from the log?`)) { clearLog(es.map((e) => e.id)); paintEntries(); } });
  paintAll();
}
