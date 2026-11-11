// A small burst of bench-coloured confetti for finished work. Skipped when the system asks for reduced motion.
import { vibrate } from './dom';
const COLOURS = ['var(--teal)', 'var(--orange)', 'var(--mustard)', 'var(--avocado)'];
export function party(x = innerWidth / 2, y = innerHeight * 0.55): void {
  vibrate([20, 40, 20]);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'party'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 34; i++) {
    const p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
    p.style.cssText = `left:${x}px;top:${y}px;background:${COLOURS[i % 4]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 120}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 80}ms;${i % 3 === 0 ? 'border-radius:50%;' : i % 3 === 1 ? 'width:6px;height:16px;border-radius:0 0 4px 4px;' : ''}`;
    box.append(p);
  }
  document.body.append(box); setTimeout(() => box.remove(), 1500);
}
