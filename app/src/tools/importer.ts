import { decode } from '../lib/handoff';
import { load, save } from '../lib/store';
import { $, esc, html } from '../lib/dom';

/** #/import/<code>: show what is inside, add it on confirmation. */
export function renderImport(main: HTMLElement, code: string) {
  main.append(html`<div class="note" id="box" style="margin-top:16px">Reading…</div>`);
  const box = $(main, '#box');
  if (!code) { box.textContent = 'Nothing to import. Open a link or scan a QR code made by Bench Mate on another device.'; return; }
  decode(code).then((p) => {
    if (p.t === 'plate') {
      const plate = p.plate as { name: string; fmt: number; wells: Record<string, unknown>; note?: string };
      box.innerHTML = `<b style="font-size:17px">Plate map</b><div style="margin-top:6px">${esc(plate.name)} · ${plate.fmt}-well · ${Object.keys(plate.wells ?? {}).length} wells in use${plate.note ? ` · ${esc(plate.note)}` : ''}</div>
        <div class="actions"><button class="btn primary" id="go">Add to my plates</button><a class="btn" href="#/">Cancel</a></div>`;
      $(box, '#go').addEventListener('click', () => {
        const st = load<{ plates: any[]; active: string; mode: string; curS: number; curG: number }>('platemap2', { plates: [], active: '', mode: 'sample', curS: 0, curG: 0 });
        const copy = { ...plate, id: Math.random().toString(36).slice(2, 8) };
        st.plates.push(copy); st.active = copy.id; save('platemap2', st); location.hash = '#/platemap';
      });
    } else {
      const run = p.run as { format?: string; conditions?: { name: string }[] };
      const existing = load<Record<string, unknown> | null>(`protocol.${p.id}`, null);
      box.innerHTML = `<b style="font-size:17px">Protocol run · ${esc(p.id)}</b><div style="margin-top:6px">${esc(run.format ?? '')}${run.conditions?.length ? ` · ${run.conditions.map((c) => esc(c.name || '?')).join(', ')}` : ''}</div>
        ${existing ? `<div style="margin-top:6px;color:var(--orange)">This replaces the run you have for this protocol on this device.</div>` : ''}
        <div class="actions"><button class="btn primary" id="go">${existing ? 'Replace' : 'Import'}</button><a class="btn" href="#/">Cancel</a></div>`;
      $(box, '#go').addEventListener('click', () => { save(`protocol.${p.id}`, p.run); location.hash = `#/protocols/${p.id}`; });
    }
  }).catch((e: Error) => { box.textContent = `Could not read this: ${e.message}`; });
}
