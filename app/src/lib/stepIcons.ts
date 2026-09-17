// Line pictograms for protocol steps (`icon: name` in the Markdown). 48-unit grid, stroke follows the text colour.
const w = (d: string) => `<svg class="sico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const STEP_ICONS: Record<string, string> = {
  tube: w('<path d="M17 6h14"/><path d="M19 6v26a5 5 0 0 0 10 0V6"/><path d="M19 20h10"/>'),
  mix: w('<path d="M6 6h10"/><path d="M8 6v13a3 3 0 0 0 6 0V6"/><path d="M32 6h10"/><path d="M34 6v13a3 3 0 0 0 6 0V6"/><path d="M11 24v5h26v-5"/><path d="M24 29v5"/><path d="M18 34h12"/><path d="M20 34v6a4 4 0 0 0 8 0v-6"/>'),
  vortex: w('<path d="M17 6h14"/><path d="M19 6v26a5 5 0 0 0 10 0V6"/><path d="M21 18c2 1.5 4 1.5 6 0s4-1.5 6 0"/><path d="M21 24c2 1.5 4 1.5 6 0"/><path d="M8 12c-2 3-2 6 0 9"/><path d="M40 12c2 3 2 6 0 9"/>'),
  plate: w('<rect x="5" y="13" width="38" height="24" rx="4"/><circle cx="15" cy="25" r="4.5"/><circle cx="24" cy="25" r="4.5"/><circle cx="33" cy="25" r="4.5"/><path d="M24 4v4"/><path d="M22 8h4"/>'),
  column: w('<path d="M14 5h20"/><path d="M16 5v12l4 5h8l4-5V5"/><path d="M18 12h12"/><path d="M11 24h26"/><path d="M13 24v13a5 5 0 0 0 5 5h12a5 5 0 0 0 5-5V24"/>'),
  spin: w('<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="3"/><circle cx="24" cy="12" r="3.5"/><circle cx="34.4" cy="30" r="3.5"/><circle cx="13.6" cy="30" r="3.5"/><path d="M41 5a22 22 0 0 1 4 8"/><path d="M7 43a22 22 0 0 1-4-8"/>'),
  drop: w('<path d="M19 4h10"/><path d="M21 4v10l3 7 3-7V4"/><path d="M24 26c-3.5 4.5-5 7-5 9.5a5 5 0 0 0 10 0c0-2.5-1.5-5-5-9.5z"/>'),
  wash: w('<path d="M14 5h20"/><path d="M16 5v12l4 5h8l4-5V5"/><path d="M11 24h26"/><path d="M13 24v13a5 5 0 0 0 5 5h12a5 5 0 0 0 5-5V24"/><path d="M24 26v5"/><path d="M19 33v4"/><path d="M29 33v4"/>'),
  incubate: w('<circle cx="24" cy="26" r="15"/><path d="M24 17v9l6 4"/><path d="M18 5h12"/><path d="M24 5v6"/>'),
  elute: w('<path d="M14 4h20"/><path d="M16 4v10l4 5h8l4-5V4"/><path d="M24 21v6"/><path d="M13 30h22"/><path d="M15 30v9a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-9"/>'),
  freeze: w('<path d="M24 5v38"/><path d="M8 14.5l32 19"/><path d="M8 33.5l32-19"/><path d="M24 5l-5 5M24 5l5 5M24 43l-5-5M24 43l5-5"/><path d="M8 14.5l6.8 1.8M8 14.5l1.8-6.8M40 33.5l-6.8-1.8M40 33.5l-1.8 6.8"/><path d="M8 33.5l6.8-1.8M8 33.5l1.8 6.8M40 14.5l-6.8 1.8M40 14.5l-1.8-6.8"/>'),
  pcr: w('<path d="M6 40V8"/><path d="M6 40h36"/><path d="M10 34l8-10 8 6 8-14 6 4"/>'),
};
