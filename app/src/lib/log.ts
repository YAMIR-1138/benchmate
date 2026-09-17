import { load, save } from './store';
import { esc, toast, vibrate } from './dom';

export interface LogEntry { id: string; t: number; tool: string; title: string; text: string; exp?: string }
export interface Experiment { id: string; name: string; t: number }
const KEY = 'log', EXPS = 'log.exps', ACTIVE = 'log.active';
const uid = () => Math.random().toString(36).slice(2, 9);

export const logEntries = () => load<LogEntry[]>(KEY, []);
export const experiments = () => load<Experiment[]>(EXPS, []);
export const activeExp = (): Experiment | undefined => { const id = load<string>(ACTIVE, ''); return experiments().find((e) => e.id === id); };
export function setActiveExp(id: string | undefined): void { save(ACTIVE, id ?? ''); }
export function addExperiment(name: string): Experiment { const e = { id: uid(), name: name.trim() || 'Experiment', t: Date.now() }; save(EXPS, [e, ...experiments()]); setActiveExp(e.id); return e; }
export function renameExperiment(id: string, name: string): void { const es = experiments(); const e = es.find((x) => x.id === id); if (e && name.trim()) { e.name = name.trim(); save(EXPS, es); } }
/** Removes the experiment; its entries stay in the log, unfiled. */
export function removeExperiment(id: string): void { save(EXPS, experiments().filter((e) => e.id !== id)); save(KEY, logEntries().map((e) => (e.exp === id ? { ...e, exp: undefined } : e))); if (load<string>(ACTIVE, '') === id) setActiveExp(undefined); }

export function addLog(tool: string, title: string, text: string): void {
  const entries = logEntries(); const exp = activeExp();
  entries.unshift({ id: uid(), t: Date.now(), tool, title, text: text.trim(), exp: exp?.id });
  save(KEY, entries.slice(0, 1000)); vibrate(10); toast(exp ? `Added to ${exp.name}` : 'Added to log');
}
export function updateLog(id: string, patch: { title?: string; text?: string; exp?: string | undefined; t?: number }): void {
  const es = logEntries(); const e = es.find((x) => x.id === id); if (!e) return;
  if (patch.title !== undefined) e.title = patch.title.trim() || e.title;
  if (patch.text !== undefined) e.text = patch.text.trim();
  if ('exp' in patch) e.exp = patch.exp || undefined;
  if (patch.t !== undefined && Number.isFinite(patch.t)) e.t = patch.t;
  save(KEY, es);
}
export function removeLog(id: string): void { save(KEY, logEntries().filter((e) => e.id !== id)); }
export function clearLog(ids?: string[]): void { save(KEY, ids ? logEntries().filter((e) => !ids.includes(e.id)) : []); }
/** Move an entry one place up or down within the list it is shown in. The list is newest first, so "up" means later. */
export function moveLog(id: string, dir: -1 | 1, shown: string[]): void {
  const es = logEntries(); const pos = shown.indexOf(id); const other = shown[pos + dir]; if (pos < 0 || !other) return;
  const i = es.findIndex((e) => e.id === id), j = es.findIndex((e) => e.id === other); if (i < 0 || j < 0) return;
  [es[i], es[j]] = [es[j], es[i]]; save(KEY, es);
}
export function setLogTime(id: string, hhmm: string): void {
  const e = logEntries().find((x) => x.id === id); const m = hhmm.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
  if (!e || !m || Number(m[1]) > 23 || Number(m[2]) > 59) return;
  const d = new Date(e.t); d.setHours(Number(m[1]), Number(m[2]), 0, 0); updateLog(id, { t: d.getTime() });
}
export function setLogDate(id: string, ymd: string): void {
  const e = logEntries().find((x) => x.id === id); const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!e || !m) return;
  const d = new Date(e.t); d.setFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3])); updateLog(id, { t: d.getTime() });
}
export const dayKey = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const ymd = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Markdown for a notebook or a chat model: one section per day, entries in the order shown (oldest first). */
export function exportLog(entries: LogEntry[], forAI: boolean, experiment?: Experiment): string {
  const days = new Map<string, LogEntry[]>();
  for (const e of [...entries].reverse()) days.set(dayKey(e.t), [...(days.get(dayKey(e.t)) ?? []), e]);
  const out: string[] = [];
  if (forAI) out.push(`Bench log from TGGR Bench Mate${experiment ? `, one experiment across ${days.size} day${days.size === 1 ? '' : 's'}` : ''}. Write it up as a lab-notebook entry${experiment ? ' for the experiment, day by day' : ' per day'}: what was done, in order, with every number exactly as written. Flag anything that looks inconsistent or unfinished. Times are local.`, '');
  if (experiment) out.push(`# ${experiment.name}`, '');
  const dayT = (l: LogEntry[]) => Math.min(...l.map((x) => x.t));
  for (const [day, es] of [...days.entries()].sort((a, b) => dayT(a[1]) - dayT(b[1]))) {
    out.push(`${experiment ? '##' : '#'} ${experiment ? day : `Bench log · ${day}`}`, '');
    for (const e of es) out.push(`${experiment ? '###' : '##'} ${hhmm(e.t)} · ${e.title}`, e.text, '');
  }
  return out.join('\n').trim() + '\n';
}

/** "Add to log" with a title and an optional note, for calculations that need a label (which sample, which plate). */
export function addLogWithNote(tool: string, title: string, text: string): void {
  const exp = activeExp();
  const sheet = document.createElement('div'); sheet.className = 'sheet';
  sheet.innerHTML = `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">Add to log</b><button class="iconbtn" id="lg-close" aria-label="close" style="font-size:20px">✕</button></div>
    <div class="muted" style="font-size:13px;margin-top:4px">→ ${exp ? esc(exp.name) : 'unfiled'}</div>
    <div class="compose" style="padding-top:10px"><input id="lg-title" type="text" value="${esc(title)}" aria-label="title" /><textarea id="lg-note" rows="2" placeholder="note (optional): sample, plate, why"></textarea></div>
    <div class="muted" style="font-size:13px;margin-top:8px;white-space:pre-wrap">${esc(text)}</div>
    <div class="actions"><button class="btn primary" id="lg-add">Add</button><button class="btn quiet" id="lg-cancel">Cancel</button></div>
  </div>`;
  document.body.append(sheet);
  const close = () => sheet.remove();
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
  sheet.querySelector('#lg-close')!.addEventListener('click', close); sheet.querySelector('#lg-cancel')!.addEventListener('click', close);
  sheet.querySelector('#lg-add')!.addEventListener('click', () => {
    const t = (sheet.querySelector('#lg-title') as HTMLInputElement).value.trim() || title, n = (sheet.querySelector('#lg-note') as HTMLTextAreaElement).value.trim();
    addLog(tool, t, n ? `${text}\n${n}` : text); close();
  });
  (sheet.querySelector('#lg-title') as HTMLInputElement).focus();
}
