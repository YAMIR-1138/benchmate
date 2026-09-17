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
export function clearLog(ids?: string[]): void { save(KEY, ids ? logEntries().filter((e) => !ids.includes(e.id)) : []); }
export const dayKey = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Markdown for pasting into a chat model or a notebook: newest day first, entries in time order. */
export function exportLog(entries: LogEntry[], forAI: boolean): string {
  const days = new Map<string, LogEntry[]>();
  for (const e of [...entries].sort((a, b) => a.t - b.t)) days.set(dayKey(e.t), [...(days.get(dayKey(e.t)) ?? []), e]);
  const out: string[] = [];
  if (forAI) out.push('Bench log from TGGR Bench Mate. Write it up as a lab-notebook entry per day: what was done, in order, with every number exactly as written. Flag anything that looks inconsistent or unfinished. Times are local.', '');
  for (const [day, es] of days) {
    out.push(`# Bench log · ${day}`, '');
    for (const e of es) out.push(`## ${hhmm(e.t)} · ${e.title}`, e.text, '');
  }
  return out.join('\n').trim() + '\n';
}
