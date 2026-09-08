import { load, save } from '../lib/store';
import { vibrate } from '../lib/dom';

export interface Timer { id: string; label: string; durationMs: number; endAt: number | null; remainingMs: number; done: boolean; createdAt: number }

class Engine {
  timers: Timer[] = load<Timer[]>('timers', []);
  listeners = new Set<() => void>();
  private iv: number | undefined;
  private audio?: AudioContext;
  private alarmIv: number | undefined;
  private wakeLock: any = null;

  start() {
    if (this.iv) return;
    this.iv = window.setInterval(() => this.tick(), 250);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { this.tick(); this.wake(); } });
    this.tick();
  }
  onChange(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { save('timers', this.timers); this.listeners.forEach((f) => f()); }

  add(durationMs: number, label: string): Timer {
    const t: Timer = { id: Math.random().toString(36).slice(2, 9), label, durationMs, endAt: Date.now() + durationMs, remainingMs: durationMs, done: false, createdAt: Date.now() };
    this.timers.unshift(t); this.unlockAudio(); this.wake(); this.emit(); return t;
  }
  remaining(t: Timer): number { return t.endAt ? Math.max(0, t.endAt - Date.now()) : t.remainingMs; }
  pause(t: Timer) { if (!t.endAt) return; t.remainingMs = this.remaining(t); t.endAt = null; this.emit(); }
  resume(t: Timer) { if (t.endAt || t.done) return; t.endAt = Date.now() + t.remainingMs; this.unlockAudio(); this.wake(); this.emit(); }
  reset(t: Timer) { t.done = false; t.endAt = null; t.remainingMs = t.durationMs; this.stopAlarm(); this.emit(); }
  remove(t: Timer) { this.timers = this.timers.filter((x) => x !== t); this.stopAlarm(); this.emit(); }
  dismiss(t: Timer) { this.remove(t); }

  private tick() {
    let changed = false;
    for (const t of this.timers) {
      if (t.endAt && !t.done && Date.now() >= t.endAt) { t.done = true; t.endAt = null; t.remainingMs = 0; changed = true; this.alarm(t); }
    }
    if (changed) this.emit(); else this.listeners.forEach((f) => f());
    if (!this.timers.some((t) => t.endAt)) this.releaseWake();
  }

  // ---- alarm ----
  unlockAudio() { try { this.audio ??= new (window.AudioContext || (window as any).webkitAudioContext)(); if (this.audio.state === 'suspended') this.audio.resume(); } catch { /* no audio */ } }
  private beep() {
    if (!this.audio) return;
    const ctx = this.audio, now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 1760; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now + i * 0.22); g.gain.exponentialRampToValueAtTime(0.4, now + i * 0.22 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.18);
      o.start(now + i * 0.22); o.stop(now + i * 0.22 + 0.2);
    }
  }
  private alarm(t: Timer) {
    this.unlockAudio(); this.beep(); vibrate([200, 100, 200, 100, 400]);
    if (this.alarmIv === undefined) this.alarmIv = window.setInterval(() => { if (this.timers.some((x) => x.done)) { this.beep(); vibrate([200, 100, 200]); } else this.stopAlarm(); }, 1500);
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('TGGR Bench Mate', { body: `${t.label} · done`, tag: t.id }); } catch { /* ignore */ }
  }
  stopAlarm() { if (this.alarmIv !== undefined && !this.timers.some((x) => x.done)) { clearInterval(this.alarmIv); this.alarmIv = undefined; } }
  requestNotifications() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ } }

  // ---- wake lock ----
  private async wake() {
    try { if ('wakeLock' in navigator && !this.wakeLock && this.timers.some((t) => t.endAt)) this.wakeLock = await (navigator as any).wakeLock.request('screen'); } catch { /* denied */ }
  }
  private releaseWake() { try { this.wakeLock?.release(); } catch { /* ignore */ } this.wakeLock = null; }
}
export const timerEngine = new Engine();
