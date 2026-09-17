import { load, save } from './store';
import { toast, vibrate } from './dom';

export interface LogEntry { id: string; t: number; tool: string; title: string; text: string }
const KEY = 'log';
export const logEntries = () => load<LogEntry[]>(KEY, []);
export function addLog(tool: string, title: string, text: string): void {
  const entries = logEntries();
  entries.unshift({ id: Math.random().toString(36).slice(2, 9), t: Date.now(), tool, title, text: text.trim() });
  save(KEY, entries.slice(0, 500)); vibrate(10); toast('Added to log');
}
export function removeLog(id: string): void { save(KEY, logEntries().filter((e) => e.id !== id)); }
/** Move an entry one place up or down within its day. The list is newest first, so "up" means later in the day. */
export function moveLog(id: string, dir: -1 | 1): void {
  const es = logEntries(); const i = es.findIndex((e) => e.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= es.length || dayKey(es[i].t) !== dayKey(es[j].t)) return;
  [es[i], es[j]] = [es[j], es[i]]; save(KEY, es);
}
export function setLogTime(id: string, hhmm: string): void {
  const es = logEntries(); const e = es.find((x) => x.id === id); const m = hhmm.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
  if (!e || !m || Number(m[1]) > 23 || Number(m[2]) > 59) return;
  const d = new Date(e.t); d.setHours(Number(m[1]), Number(m[2]), 0, 0); e.t = d.getTime(); save(KEY, es);
}
export function clearLog(ids?: string[]): void { save(KEY, ids ? logEntries().filter((e) => !ids.includes(e.id)) : []); }
export const dayKey = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Markdown for pasting into a chat model or a notebook: one section per day, entries in the order shown (oldest first). */
export function exportLog(entries: LogEntry[], forAI: boolean): string {
  const days = new Map<string, LogEntry[]>();
  for (const e of [...entries].reverse()) days.set(dayKey(e.t), [...(days.get(dayKey(e.t)) ?? []), e]);
  const out: string[] = [];
  if (forAI) out.push('Bench log from TGGR Bench Mate. Write it up as a lab-notebook entry per day: what was done, in order, with every number exactly as written. Flag anything that looks inconsistent or unfinished. Times are local.', '');
  for (const [day, es] of days) {
    out.push(`# Bench log · ${day}`, '');
    for (const e of es) out.push(`## ${hhmm(e.t)} · ${e.title}`, e.text, '');
  }
  return out.join('\n').trim() + '\n';
}
