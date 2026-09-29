// In-app QR scanner for Bench Mate hand-offs. Uses the browser's BarcodeDetector when present (Android Chrome),
// otherwise decodes camera frames with jsQR, which is loaded only when this screen needs it.
import { $, html } from '../lib/dom';

type Decoder = (src: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>;

async function makeDecoder(): Promise<Decoder> {
  const BD = (window as any).BarcodeDetector;
  if (BD) {
    try {
      const formats: string[] = await BD.getSupportedFormats?.() ?? [];
      if (formats.includes('qr_code')) {
        const det = new BD({ formats: ['qr_code'] });
        return async (v) => { const r = await det.detect(v); return r[0]?.rawValue ?? null; };
      }
    } catch { /* fall through to jsQR */ }
  }
  const jsQR = (await import('jsqr')).default;
  return async (v, c) => {
    const w = v.videoWidth, h = v.videoHeight; if (!w || !h) return null;
    const k = Math.min(1, 720 / Math.max(w, h)); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const ctx = c.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  };
}

/** The part after "#/import/" in a Bench Mate link, from any origin (so a printed QR from the public site works in any copy of the app). */
export const importCode = (text: string): string | null => { const m = text.trim().match(/#\/import\/([A-Za-z0-9_-]+)/); return m ? m[1] : null; };

export function renderScan(main: HTMLElement) {
  main.append(html`
    <div class="scanbox"><video id="sc-v" playsinline muted></video><div class="scanframe"></div></div>
    <div class="mono muted" id="sc-status" style="text-align:center;font-size:13px;margin-top:10px">Starting camera…</div>
    <div class="note" style="margin-top:16px">Point the camera at a Bench Mate QR: a printed sheet or plate, or another phone's "Send to device". It opens here, in this app.</div>
    <div class="actions" style="padding-top:12px"><label class="btn" for="sc-img" style="cursor:pointer">Scan from a photo</label><input id="sc-img" type="file" accept="image/*" hidden /></div>
    <div class="custom" style="padding-top:10px"><input id="sc-link" type="text" placeholder="or paste a Bench Mate link" /><button class="btn primary" id="sc-go" style="flex:0 0 84px">Open</button></div>
  `);
  const video = $<HTMLVideoElement>(main, '#sc-v'), status = $(main, '#sc-status'), canvas = document.createElement('canvas');
  let stream: MediaStream | null = null, stopped = false, timer = 0;
  const stop = () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); stream = null; };
  (main as any).__cleanup = stop;
  const open = (text: string) => {
    const code = importCode(text);
    if (!code) { status.textContent = 'That QR is not a Bench Mate link.'; return false; }
    stop(); location.hash = `#/import/${code}`; return true;
  };
  $(main, '#sc-go').addEventListener('click', () => { const v = $<HTMLInputElement>(main, '#sc-link').value; if (!open(v)) status.textContent = 'Paste the whole link, it contains "#/import/".'; });
  $<HTMLInputElement>(main, '#sc-img').addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    status.textContent = 'Reading the photo…';
    try {
      const bmp = await createImageBitmap(f); const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = (await import('jsqr')).default; const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (!r) status.textContent = 'No QR code found in that photo.'; else open(r.data);
    } catch { status.textContent = 'Could not read that image.'; }
    (e.target as HTMLInputElement).value = '';
  });
  (async () => {
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'No camera access in this browser. Paste the link instead.'; return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); }
    catch (e) { status.textContent = (e as Error).name === 'NotAllowedError' ? 'Camera permission was refused. Allow it in the browser settings, or paste the link.' : 'Could not start the camera. Paste the link instead.'; return; }
    if (stopped) { stop(); return; }
    video.srcObject = stream; await video.play().catch(() => undefined);
    const decode = await makeDecoder(); status.textContent = 'Looking for a QR code…';
    const loop = async () => {
      if (stopped) return;
      try { const text = await decode(video, canvas); if (text && open(text)) return; } catch { /* next frame */ }
      timer = window.setTimeout(loop, 180);
    };
    loop();
  })();
}
