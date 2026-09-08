# TGGR Bench Mate

A bench companion for molecular biology, made by and for TGGR Lab. Offline, no ads, no
accounts. Runs as an installable web app on Android, iPhone and iPad; an ESP32 bench
edition is planned.

Tools: dilution, molar, unit converter (incl. ×g ↔ rpm, DNA amount, A260), timers,
counter, DNA/RNA/protein ladders, plates and seeding, step-by-step protocols, and a built-in
edition of [ΣpinZero](https://github.com/YAMIR-1138/SpinZero) for rotor balancing.

## Layout

| Path | What |
|---|---|
| `app/` | The web app (Vite + TypeScript, no framework). |
| `core/data/` | Ladders, vessels: JSON shared by every edition. |
| `core/protocols/` | Protocols as Markdown, one file each. Format in `core/protocols/README.md`. |
| `core/tests/vectors/` | Input/expected pairs every edition must reproduce. |
| `assets/brand/` | Logo. |
| `docs/` | Brainstorm, decisions, screen mockups. |

## Run it

```bash
cd app
npm install
npm run dev      # http://localhost:5173/benchmate/
npm test
npm run build    # -> app/dist
```

## Deploy

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/pages.yml`.
One-time setup: repository Settings → Pages → Source: **GitHub Actions**. The app is then at
`https://yamir-1138.github.io/benchmate/`. Open it on a phone and "Add to Home Screen".

## Add a protocol

Drop a Markdown file into `core/protocols/`. One `##` heading per step; `timer:`,
`warning:`, `note:`, `input:` and `per_well:` lines become UI. See the README there.
