// Hand-off between devices without a server: the payload rides inside a link, and the link inside a QR code.
import qrcode from 'qrcode-generator';
import { $, el, esc, copyText, toast } from './dom';

export type Payload = { t: 'plate'; v: 1; plate: unknown } | { t: 'run'; v: 1; id: string; run: unknown };

const b64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try { const ab = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(); return new Uint8Array(ab); } catch { return null; }
}
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const ab = await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer(); return new Uint8Array(ab);
}

/** Encode to the short form used in the URL: "z" + deflated, or "j" + plain. */
export async function encode(p: Payload): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(p));
  const z = await deflate(raw);
  return z && z.length < raw.length ? 'z' + b64u(z) : 'j' + b64u(raw);
}
export async function decode(s: string): Promise<Payload> {
  const kind = s[0], body = unb64u(s.slice(1));
  const raw = kind === 'z' ? await inflate(body) : body;
  const p = JSON.parse(new TextDecoder().decode(raw));
  if (!p || (p.t !== 'plate' && p.t !== 'run')) throw new Error('Not a Bench Mate hand-off.');
  return p as Payload;
}

export function importUrl(code: string): string {
  const base = location.origin + location.pathname;
  return `${base}#/import/${code}`;
}

/** QR of the import link as an inline SVG string, or '' if the payload is too big. */
export async function qrSvg(p: Payload): Promise<string> {
  try { const q = qrcode(0, 'M'); q.addData(importUrl(await encode(p)), 'Byte'); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace('<svg', '<svg style="width:100%;height:100%"'); } catch { return ''; }
}

/** Bottom sheet with QR, link, share. */
export async function showHandoff(title: string, p: Payload): Promise<void> {
  const code = await encode(p); const url = importUrl(code);
  let qrHtml = '';
  try { const q = qrcode(0, 'M'); q.addData(url, 'Byte'); q.make(); qrHtml = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch { qrHtml = ''; }
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
