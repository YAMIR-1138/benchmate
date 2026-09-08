const w = (paths: string) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
export const icons = {
  drop: w('<path d="M12 3 C12 3 5 11 5 15 a7 7 0 0 0 14 0 C19 11 12 3 12 3 Z"/><path d="M9 15 a3 3 0 0 0 3 3"/>'),
  scale: w('<path d="M12 4 v16"/><path d="M4 8 h16"/><path d="M6 8 l-3 7 a3 3 0 0 0 6 0 Z"/><path d="M18 8 l-3 7 a3 3 0 0 0 6 0 Z"/><path d="M8 20 h8"/>'),
  swap: w('<path d="M4 8 h13"/><path d="M14 4 l4 4 -4 4"/><path d="M20 16 H7"/><path d="M10 12 l-4 4 4 4"/>'),
  clock: w('<circle cx="12" cy="13" r="8"/><path d="M12 9 v4 l3 2"/><path d="M9 3 h6"/>'),
  tally: w('<path d="M5 5 v14"/><path d="M9 5 v14"/><path d="M13 5 v14"/><path d="M17 5 v14"/><path d="M3 17 L20 7"/>'),
  lanes: w('<rect x="5" y="3" width="6" height="18" rx="1.5"/><rect x="14" y="3" width="6" height="18" rx="1.5"/><path d="M6.5 8 h3"/><path d="M6.5 12 h3"/><path d="M6.5 17 h3"/><path d="M15.5 7 h3"/><path d="M15.5 14 h3"/>'),
  plate: w('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.4"/><circle cx="12" cy="10" r="1.4"/><circle cx="16" cy="10" r="1.4"/><circle cx="8" cy="14.5" r="1.4"/><circle cx="12" cy="14.5" r="1.4"/><circle cx="16" cy="14.5" r="1.4"/>'),
  list: w('<path d="M9 6 h11"/><path d="M9 12 h11"/><path d="M9 18 h11"/><path d="M4 6 l1 1 2-2"/><path d="M4 12 l1 1 2-2"/><circle cx="5" cy="18" r="1"/>'),
  rotor: w('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="6" r="1.6"/><circle cx="17.2" cy="15" r="1.6"/><circle cx="6.8" cy="15" r="1.6"/>'),
  back: w('<path d="M15 5 l-7 7 7 7"/>'),
  sun: w('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: w('<path d="M20 14.5 A8 8 0 1 1 9.5 4 a6.5 6.5 0 0 0 10.5 10.5 Z"/>'),
};
