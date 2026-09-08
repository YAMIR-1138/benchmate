import { fmt, parseNum } from '../lib/fmt';
import { load, save } from '../lib/store';
import { $, $$, copyText, esc, html, toast } from '../lib/dom';

interface Row { name: string; ff: string; rl: string; ctrl: boolean }
type State = { rows: Row[] };
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

export function renderLuciferase(main: HTMLElement) {
  const st = load<State>('luciferase', { rows: [{ name: 'ctrl', ff: '', rl: '', ctrl: true }, { name: 'ctrl', ff: '', rl: '', ctrl: true }, { name: 'A', ff: '', rl: '', ctrl: false }, { name: 'A', ff: '', rl: '', ctrl: false }] });
  main.append(html`
    <div class="note" style="margin-top:16px">Firefly ÷ Renilla per well, then each well over the mean of the control wells. Rows with the same name are averaged as replicates. Tick the control wells.</div>
    <table class="data" id="tbl"><tr><th>Well</th><th style="text-align:right">Firefly</th><th style="text-align:right">Renilla</th><th>Ctrl</th><th style="text-align:right">F / R</th></tr></table>
    <div class="actions"><button class="btn" id="add">+ Row</button><button class="btn" id="paste">Paste</button><button class="btn quiet" id="clear">Clear</button></div>
    <div id="pastebox" hidden style="margin-top:10px"><textarea id="pastetxt" rows="5" placeholder="One well per line: name, firefly, renilla  (tab or comma separated; name optional)" style="width:100%;font-family:var(--mono);font-size:14px;padding:10px;border:var(--bw) solid var(--line);border-radius:10px;background:var(--lcd);color:var(--lcd-ink)"></textarea><div class="actions"><button class="btn primary" id="paste-go">Add rows</button></div></div>
    <div class="result" id="out" hidden>
      <div class="cap" style="color:inherit;opacity:0.8">Fold over control</div>
      <div class="list" id="groups" style="margin-top:6px"></div>
      <div class="actions"><button class="btn" id="copy">Copy results</button></div>
    </div>
  `);
  const tbl = $(main, '#tbl');
  function ratio(r: Row) { const f = parseNum(r.ff), l = parseNum(r.rl); return f !== undefined && l ? f / l : undefined; }
  function paintRows() {
    $$(tbl, 'tr.r').forEach((x) => x.remove());
    st.rows.forEach((r, i) => {
      const q = ratio(r); const tr = document.createElement('tr'); tr.className = 'r';
      tr.innerHTML = `<td><input data-i="${i}" data-f="name" value="${esc(r.name)}" style="width:58px;min-height:40px;padding:0 6px;font-weight:700" /></td>
        <td class="num"><input data-i="${i}" data-f="ff" type="text" inputmode="decimal" value="${esc(r.ff)}" placeholder="—" style="width:76px;min-height:40px;padding:0 6px;font-family:var(--mono);text-align:right" /></td>
        <td class="num"><input data-i="${i}" data-f="rl" type="text" inputmode="decimal" value="${esc(r.rl)}" placeholder="—" style="width:76px;min-height:40px;padding:0 6px;font-family:var(--mono);text-align:right" /></td>
        <td style="text-align:center"><input data-i="${i}" data-f="ctrl" type="checkbox" ${r.ctrl ? 'checked' : ''} style="width:22px;height:22px" /></td>
        <td class="num" style="color:var(--orange)">${q === undefined ? '—' : fmt(q, 3)}</td>`;
      tbl.append(tr);
    });
    $$<HTMLInputElement>(tbl, 'input[data-i]').forEach((inp) => inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', () => {
      const r = st.rows[Number(inp.dataset.i)]; if (inp.dataset.f === 'ctrl') r.ctrl = inp.checked; else (r as any)[inp.dataset.f!] = inp.value;
      save('luciferase', st); const q = ratio(r); inp.closest('tr')!.lastElementChild!.textContent = q === undefined ? '—' : fmt(q, 3); paintOut();
    }));
  }
  let summary = '';
  function paintOut() {
    const ctrls = st.rows.filter((r) => r.ctrl).map(ratio).filter((x): x is number => x !== undefined);
    const out = $(main, '#out'); out.hidden = ctrls.length === 0; if (!ctrls.length) return;
    const base = mean(ctrls);
    const groups = new Map<string, number[]>();
    for (const r of st.rows) { const q = ratio(r); if (q === undefined) continue; const k = r.name.trim() || '(unnamed)'; groups.set(k, [...(groups.get(k) ?? []), q / base]); }
    const lines: string[] = [];
    $(main, '#groups').innerHTML = [...groups.entries()].map(([k, v]) => { const m = mean(v), s = sd(v); lines.push(`${k}\t${fmt(m, 3)}\t${v.length > 1 ? fmt(s, 3) : ''}\t${v.length}`); return `<div class="item"><b class="grow">${esc(k)}</b><span class="mono" style="font-size:20px;color:var(--orange)">${fmt(m, 3)}×</span>${v.length > 1 ? `<span class="mono" style="font-size:13px;opacity:0.8">± ${fmt(s, 3)} · n=${v.length}</span>` : `<span class="mono" style="font-size:13px;opacity:0.6">n=1</span>`}</div>`; }).join('');
    summary = `Name\tFold\tSD\tn\n${lines.join('\n')}`;
  }
  $(main, '#add').addEventListener('click', () => { st.rows.push({ name: '', ff: '', rl: '', ctrl: false }); save('luciferase', st); paintRows(); });
  $(main, '#clear').addEventListener('click', () => { st.rows = [{ name: 'ctrl', ff: '', rl: '', ctrl: true }, { name: 'A', ff: '', rl: '', ctrl: false }]; save('luciferase', st); paintRows(); paintOut(); });
  $(main, '#paste').addEventListener('click', () => { const b = $(main, '#pastebox'); b.hidden = !b.hidden; });
  $(main, '#paste-go').addEventListener('click', () => {
    const txt = $<HTMLTextAreaElement>(main, '#pastetxt').value; let n = 0;
    for (const line of txt.split(/\r?\n/)) { const p = line.split(/[\t,;]+|\s{2,}/).map((s) => s.trim()).filter(Boolean); if (p.length < 2) continue; const nums = p.slice(-2); const name = p.length > 2 ? p.slice(0, -2).join(' ') : ''; if (parseNum(nums[0]) === undefined) continue; st.rows.push({ name, ff: nums[0], rl: nums[1], ctrl: false }); n++; }
    if (!n) { toast('Nothing to add'); return; } save('luciferase', st); $<HTMLTextAreaElement>(main, '#pastetxt').value = ''; $(main, '#pastebox').hidden = true; paintRows(); paintOut(); toast(`${n} rows added`);
  });
  $(main, '#copy').addEventListener('click', async () => { if (await copyText(summary)) toast('Copied'); });
  paintRows(); paintOut();
}
