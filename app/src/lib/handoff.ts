// Hand-off between devices without a server: the payload rides inside a link, and the link inside a QR code.
import qrcode from 'qrcode-generator';
import { $, el, esc, copyText, toast } from './dom';

export type Payload = { t: 'plate'; v: number; plate: unknown } | { t: 'run'; v: number; id: string; run: unknown } | { t: 'cdna'; v: number; cdna: unknown };

const b64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

// Base-41 over characters a QR code stores in its compact alphanumeric mode (about a quarter fewer bits than
// base64 in byte mode). No space, %, / or :, so the code is safe in a URL fragment and in the router's path split.
const A41 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-.';
export function b41(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 2) {
    if (i + 1 < b.length) { let v = b[i] * 256 + b[i + 1]; const c0 = v % 41; v = (v - c0) / 41; const c1 = v % 41; s += A41[c0] + A41[c1] + A41[(v - c1) / 41]; }
    else s += A41[b[i] % 41] + A41[Math.floor(b[i] / 41)];
  }
  return s;
}
export function unb41(s: string): Uint8Array {
  const out: number[] = []; const d = (ch: string) => { const k = A41.indexOf(ch); if (k < 0) throw new Error('Damaged code.'); return k; };
  for (let i = 0; i < s.length; i += 3) {
    if (i + 2 < s.length) { const v = d(s[i]) + d(s[i + 1]) * 41 + d(s[i + 2]) * 1681; if (v > 65535) throw new Error('Damaged code.'); out.push(v >> 8, v & 255); }
    else { const v = d(s[i]) + d(s[i + 1] ?? '0') * 41; if (v > 255) throw new Error('Damaged code.'); out.push(v); }
  }
  return new Uint8Array(out);
}

// Plates travel as runs of wells: one entry per stretch of a row with the same gene and tick state and the
// sample stepping by 0 or 1. A regular qPCR plate of 117 wells becomes 9 entries.
type W = { s?: number; g?: number; d?: boolean };
const p36 = (x: string) => (x === '' ? undefined : parseInt(x, 36));
export function packWells(wells: Record<string, W>, fmt: number): string {
  const cols = fmt === 384 ? 24 : fmt === 96 ? 12 : fmt === 48 ? 8 : fmt === 24 ? 6 : fmt === 12 ? 4 : 3, rows = fmt / cols, at = (r: number, c: number) => wells[`${String.fromCharCode(65 + r)}${c + 1}`];
  const out: string[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols;) {
    const w = at(r, c); if (!w || (w.s === undefined && w.g === undefined && !w.d)) { c++; continue; }
    const nx = at(r, c + 1); const step = nx && w.s !== undefined && nx.s !== undefined && (nx.s - w.s === 1) ? 1 : 0;
    let n = 1;
    while (c + n < cols) { const v = at(r, c + n); if (!v || v.g !== w.g || !!v.d !== !!w.d || (w.s === undefined) !== (v.s === undefined) || (w.s !== undefined && v.s !== w.s + step * n)) break; n++; }
    out.push([(r * cols + c).toString(36), n.toString(36), w.s === undefined ? '' : w.s.toString(36), w.g === undefined ? '' : w.g.toString(36), step ? '1' : '', w.d ? '1' : ''].join('.').replace(/\.+$/, ''));
    c += n;
  }
  return out.join('_');
}
export function unpackWells(runs: string, fmt: number): Record<string, W> {
  const cols = fmt === 384 ? 24 : fmt === 96 ? 12 : fmt === 48 ? 8 : fmt === 24 ? 6 : fmt === 12 ? 4 : 3, wells: Record<string, W> = {};
  for (const t of runs ? runs.split('_') : []) {
    const [pos, n, s, g, step, d] = t.split('.'); const i0 = parseInt(pos, 36), len = parseInt(n, 36), s0 = p36(s ?? ''), g0 = p36(g ?? ''), k = step === '1' ? 1 : 0;
    for (let j = 0; j < len; j++) { const i = i0 + j, w: W = {}; if (s0 !== undefined) w.s = s0 + k * j; if (g0 !== undefined) w.g = g0; if (d === '1') w.d = true; wells[`${String.fromCharCode(65 + Math.floor(i / cols))}${(i % cols) + 1}`] = w; }
  }
  return wells;
}
const compact = (p: Payload): Payload => {
  if (p.t !== 'plate') return p;
  const pl = p.plate as { fmt: number; wells: Record<string, W> };
  const { wells, ...rest } = pl; return { t: 'plate', v: 2, plate: { ...rest, r: packWells(wells ?? {}, pl.fmt) } };
};
const expand = (p: any): Payload => {
  if (p?.t === 'plate' && p.plate && typeof p.plate.r === 'string') { const { r, ...rest } = p.plate; p = { t: 'plate', v: 1, plate: { ...rest, wells: unpackWells(r, rest.fmt) } }; }
  return p as Payload;
};

async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try { const ab = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(); return new Uint8Array(ab); } catch { return null; }
}
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const ab = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer(); return new Uint8Array(ab);
}

/** The code after "#/import/": "Q" + base-41 of the deflated payload; "j" + base64 where compression is missing. Older links used "z" + base64. */
export async function encode(p: Payload): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(compact(p)));
  const z = await deflate(raw);
  return z ? 'Q' + b41(z) : 'j' + b64u(raw);
}
export async function decode(code: string): Promise<Payload> {
  const s = code.includes('%') ? decodeURIComponent(code) : code;
  const kind = s[0];
  const raw = kind === 'Q' ? await inflate(unb41(s.slice(1))) : kind === 'z' ? await inflate(unb64u(s.slice(1))) : unb64u(s.slice(1));
  const p = expand(JSON.parse(new TextDecoder().decode(raw)));
  if (!p || (p.t !== 'plate' && p.t !== 'run' && p.t !== 'cdna')) throw new Error('Not a Bench Mate hand-off.');
  return p;
}

export function importUrl(code: string): string {
  const base = location.origin + location.pathname;
  return `${base}#/import/${code}`;
}

/** QR of an import link: the address in byte mode, the code in the denser alphanumeric mode. Medium error correction. */
function qrOf(code: string): ReturnType<typeof qrcode> {
  const q = qrcode(0, 'M'); const head = importUrl('');
  if (/^[0-9A-Z$*+\-.]+$/.test(code)) { q.addData(head, 'Byte'); q.addData(code, 'Alphanumeric'); } else q.addData(head + code, 'Byte');
  q.make(); return q;
}
/** QR of the import link as an inline SVG string, or '' if the payload is too big. */
export async function qrSvg(p: Payload): Promise<string> {
  try { return qrOf(await encode(p)).createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace('<svg', '<svg style="width:100%;height:100%;display:block"'); } catch { return ''; }
}

/** Bottom sheet with QR, link, share. */
export async function showHandoff(title: string, p: Payload): Promise<void> {
  const code = await encode(p); const url = importUrl(code);
  let qrHtml = '';
  try { qrHtml = qrOf(code).createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch { qrHtml = ''; }
  const sheet = el('div', { class: 'sheet' });
  sheet.innerHTML = `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">${esc(title)}</b><button class="iconbtn" id="ho-close" aria-label="close" style="font-size:20px">✕</button></div>
    <div class="muted" style="font-size:14px;margin-top:4px">Scan with the other device, or send the link. Opening it imports a copy.</div>
    ${qrHtml ? `<div class="qr">${qrHtml.replace('<svg', '<svg style="width:100%;height:100%"')}</div>` : `<div class="note">Too much data for a QR code. Send the link instead.</div>`}
    <div class="link">${esc(url)}</div>
    <div class="actions"><button class="btn primary" id="ho-share">Share…</button><button class="btn" id="ho-copy">Copy link</button></div>
  </div>`;
  document.body.append(sheet);
  const close = () => sheet.remove();
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
  $(sheet, '#ho-close').addEventListener('click', close);
  $(sheet, '#ho-copy').addEventListener('click', async () => { if (await copyText(url)) toast('Link copied'); });
  const share = $(sheet, '#ho-share') as HTMLButtonElement;
  if (!navigator.share) share.hidden = true;
  share.addEventListener('click', async () => { try { await navigator.share({ title, url }); } catch { /* cancelled */ } });
}
