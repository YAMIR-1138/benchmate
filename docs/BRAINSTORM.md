# BenchMate — prototype brainstorm

Working name: **BenchMate** (also considered: LabMate, BenchBuddy). Check app-store and
trademark collisions before committing to the name.

A pocket / bench companion for molecular biology. Runs on Android, iPhone, iPad and,
eventually, a standalone ESP32 device that lives on the bench.

---

## 1. What the app is

A fast, offline, no-account toolbox. Every tool must be reachable in one or two taps and
usable with gloved, one-handed, half-wet hands. No login, no cloud, no waiting.

### Module list (v1 candidates)

| Module | What it does | Notes / lab reality |
|---|---|---|
| **Dilution calc** | C1·V1 = C2·V2, solve for any one of the four | Unit-aware (M, mM, µM, nM, mg/mL, %, "10X → 1X"). Output the two numbers people actually pipette: *stock volume* and *diluent volume*. Serial-dilution planner as v2. |
| **Molar calc** | mass ↔ moles ↔ concentration ↔ volume, given MW | Preset MW list (NaCl, Tris, EDTA, glucose, glycine, SDS…). "Make X mL of Y M from powder." % w/v ↔ molarity. |
| **Unit converter** | volume, mass, concentration, length, temperature, time | Plus lab-specific ones: **RCF (×g) ↔ RPM** (needs rotor radius), **DNA ng ↔ pmol ↔ copies** (needs bp length, ds/ss), **A260 → conc** (dsDNA 50, ssDNA 33, RNA 40 µg/mL per AU). |
| **Timer** | multiple named concurrent timers, presets, loud alarm | Presets: 30 s, 1 min, 5, 10, 15, 30 min, 1 h. Keep screen awake while running. History of last timers. See platform caveat below. |
| **Counter** | tally counter(s) with undo | Colony counter; **hemocytometer mode**: 4 corner squares → cells/mL with dilution factor and trypan-blue viability %. Haptic tick. |
| **Ladders** | DNA / RNA / protein ladders as a rendered gel lane | Band sizes + ng per band. Side-by-side comparison. Data-driven: one JSON per ladder. |
| **Plates & vessels** | surface area, working volume, seeding calculator | 6/12/24/48/96/384-well; 35/60/100/150 mm dishes; T25/T75/T175 flasks. "Seed N cells/cm² → cells per well and volume of suspension." Plate-map layout tool later. |
| **Protocols** | easy-to-read, step-by-step protocol reader | One step per screen, big text, "next" button. Steps can carry an embedded timer ("incubate 5 min" → tap to start). Checklist ticks. Protocols are data files, not code. |
| **ΣpinZero** | centrifuge rotor balancer (existing web app, github.com/YAMIR-1138/SpinZero) | Single `index.html`, already teal/orange with dark mode. Embed as a module with a rotor-slot picker; add "RCF ↔ RPM for this rotor" next to it. |

### Later / maybe
Master-mix calculator (n + 10 %), PCR setup, primer Tm, gel % guide, buffer recipes
(with pKa), pipette-check helper, quick notes, plate-map editor, barcode/QR for
samples.

---

## 2. Design principles (bench-first)

- **Big targets, high contrast, dark mode.** Bench light is bad and gloves are clumsy.
- **Units on every field.** Never make the user convert in their head.
- **Remember last inputs** per tool. People run the same dilution ten times a day.
- **Zero-latency launch.** Opening a calculator must be faster than reaching for a phone calculator.
- **Offline always, no accounts.** Data lives on the device.
- **Everything is data.** Ladders, plates, reagents, protocols, unit tables are JSON /
  Markdown files, so they are shared verbatim between the phone app and the ESP32 firmware.

---

## 3. Architecture: one data core, thin UIs

```
benchmate/
├── core/                 # platform-independent, shared by every edition
│   ├── data/
│   │   ├── ladders/*.json        # bands, ng per band, vendor, cat. no.
│   │   ├── vessels.json          # plates, dishes, flasks
│   │   ├── reagents.json         # common MW presets
│   │   └── units.json            # conversion tables
│   ├── protocols/*.md            # Markdown + front-matter, step-per-heading
│   └── tests/vectors/*.json      # input → expected output, run by every implementation
├── app/                  # phone / tablet edition (PWA, TypeScript)
├── firmware/             # ESP32 edition (C/C++, LVGL)
└── docs/
```

**Why shared data + shared test vectors instead of shared code:** the actual math
(C1V1 = C2V2, mass = M·V·MW, RCF = 1.118e-5·r·RPM²) is a few lines. Re-implementing it
in TypeScript and in C is cheaper than making one codebase compile to both, and the
test-vector file guarantees both agree. If the logic ever grows (serial-dilution
planning, buffer pKa solvers), move the core to C and compile it to WebAssembly for the
web edition — the structure above already allows that.

---

## 4. Platform strategy

### Phone / tablet: PWA first, native wrapper later

Recommended for the prototype: a **Progressive Web App** (TypeScript + Vite; Svelte or
plain components), deployed to GitHub Pages.

Pros
- One codebase covers Android, iPhone and iPad on day one.
- Install from a link. No developer accounts, no store review while iterating.
- Labmates can try a new build within minutes of a push.
- Offline via service worker; installs to the home screen like a real app.

Cons / caveats
- **iOS background timers.** A PWA cannot reliably ring an alarm when the phone is locked
  or the app is in the background on iOS. Mitigation now: Wake Lock API keeps the screen on
  while a timer runs. Real fix: wrap the same code with **Capacitor** to get native local
  notifications, and ship via TestFlight / Play internal testing. That is a wrapping step,
  not a rewrite.
- No store presence until wrapped.

Alternative: **Flutter** from the start gives native timers and store builds immediately,
at the cost of slower iteration and no share-by-link. Worth it only if store distribution
is a hard requirement for the very first prototype.

### ESP32 edition: a bench appliance, not a port

The ESP32 edition should not try to be the whole app. It should be the tools that are
better as a physical object on the bench:

- **Timer** with a loud buzzer and a physical start/stop button.
- **Counter** with a big physical button (colony counting with a marker in the other hand).
- **Protocol step reader** with next / previous buttons. Hands-free-ish.
- **Dilution / RCF↔RPM** quick calcs using a rotary encoder for number entry.
- Ladders and plates only if the screen is large enough to be useful.

Hardware candidates

| Board | Screen | Input | Cost | Verdict |
|---|---|---|---|---|
| ESP32-2432S028R "Cheap Yellow Display" | 2.8" 320×240, resistive touch | touch, 1 button | ~€12 | Best for prototype. Resistive touch works with gloves. |
| Waveshare / Elecrow ESP32-S3 4.3" or 7" | 480×272 / 800×480 capacitive | touch | €25–45 | Good for ladders & protocols. Capacitive touch is unreliable with wet gloves. |
| M5Stack Core2 / CoreS3 | 2" 320×240 capacitive | touch, 3 buttons, speaker, battery, case | €50–70 | Looks like a finished product out of the box. Grove ports for a big external button. |
| LilyGO T-Display-S3 | 1.9", no touch | 2 buttons | ~€15 | Timer + counter only. |

Firmware: ESP-IDF (or Arduino core) + **LVGL 9**; UI layout in SquareLine Studio if
wanted. Physical inputs (buttons, rotary encoder, buzzer) are strongly preferred over
on-screen keypads: gloves, wet hands, small screen. Protocol files and settings can be
pushed from the phone to the device over BLE or WiFi later, so the phone is the editor and
the box is the reader.

Bonus option: the ESP32 can also **serve the PWA over its own WiFi hotspot**, so any phone
in the lab opens the app without internet. Cheap to add once the PWA exists.

---

## 5. Protocol file format (proposal)

Markdown with YAML front-matter. Human-editable in any editor, renderable on both
editions.

```markdown
---
title: Plasmid miniprep (spin column)
duration: 30 min
tags: [DNA, cloning]
materials:
  - Resuspension buffer (P1), cold
  - Lysis buffer (P2)
  - Neutralisation buffer (N3)
---

## 1. Pellet cells
Spin 1.5 mL overnight culture at 8000 ×g for 3 min.
timer: 3m

## 2. Resuspend
Add 250 µL P1. Vortex until no clumps remain.

## 3. Lyse
Add 250 µL P2, invert 4–6 times. Do not vortex.
timer: 5m
warning: Do not exceed 5 min.
```

Rules: one `##` heading per step; optional `timer:`, `warning:`, `checkpoint:` lines are
parsed into UI elements; everything else is plain prose.

---

## 6. Prototype plan

| Phase | Deliverable | Goal |
|---|---|---|
| **0** | Answers to the open questions; repo skeleton; data schemas for ladders, vessels, units, protocols. | Agree on scope. |
| **1** | PWA with dilution, molar, unit converter, timer, counter. Deployed to GitHub Pages. | Get it into labmates' hands within days. Collect "this number is wrong / this is annoying" feedback. |
| **2** | Ladders, plates & vessels, protocol reader with 3–5 real protocols, SpinZero page. | Feature-complete phone prototype. |
| **3** | ESP32 firmware on Cheap Yellow Display: timer, counter, protocol reader, dilution. Same data files. | Prove the bench-appliance idea. |
| **4** | Capacitor wrap → TestFlight / Play internal testing. Native notifications for timers. | Store-ready. |

---

## 7. Open questions (need answers before Phase 1)

1. **What is SpinZero?** A device you built, a centrifuge, a protocol, a product? What
   does "adding it" mean: a calculator for it, a control panel over BLE/WiFi, a page
   describing it?
2. **ESP32 edition, physically.** Screen size, touch vs buttons, battery vs USB-powered,
   buzzer, enclosure? Do you already own any boards? Target cost per unit? Standalone,
   or does it sync with the phone?
3. **Users.** Your lab only, or public release? This decides store distribution,
   branding, and how much polish the first prototype needs.
4. **Ladders you actually use.** Vendor and catalogue names (e.g. GeneRuler 1 kb,
   NEB 1 kb Plus, PageRuler Plus, RiboRuler HR). Same for plates/flasks brands if any
   have non-standard geometry.
5. **First protocols.** Which 3–5 protocols would you want on a bench screen tomorrow?
   Can you share them in any format (Word, PDF, photos of the lab binder)?
6. **Priority order.** Phone PWA first, or ESP32 first? Is "install from a link" fine for
   the prototype, or is App Store / Play Store a must from day one?
7. **Your tooling comfort.** Do you (or labmates) want to edit the app or the data files
   yourselves? Any preference between Arduino, ESP-IDF, MicroPython for the firmware?
8. **Locale.** English only? Decimal comma or point? µL vs uL?
9. **Look and feel.** Brand colours, logo, dark-mode-only or both? Want screen mockups
   before code?
10. **Data & privacy.** Confirm: fully offline, no accounts, no analytics.

---

## 8. Inspiration: Lab.Hacks (what to keep, what to beat)

Reference screenshots reviewed: RNA ladder vendor picker, Thermo RiboRuler ladder view,
Unit Converter menu, Mass/Mol calculator, Dilutions calculator.

**Keep**
- Dark theme, one tool per screen, big type. Reads well at the bench.
- Tool list as tall colour-coded cards with an icon: instantly scannable, thumb-sized.
- Ladders drawn as lanes with band labels and the product name underneath. Two ladders
  side by side (low range / high range) is the right default.
- Unit converter split into lab categories (OD600, time, centrifuge speed, concentration,
  volume, mass, length, area) instead of one giant dropdown.
- Mass/Mol has a "Periodic Table" button: type a formula, get the MW. Worth copying.

**Beat**
- **No ads, ever.** Two banner slots eat a quarter of the screen. That is the whole
  reason to build our own.
- Calculators are fixed-direction (three inputs → one hidden output). Ours: any field can
  be the unknown; leave one blank and it is solved.
- Dilution gives stock volume only. Ours also gives **diluent volume** and a one-line
  "Add 12.5 µL stock to 987.5 µL buffer" sentence you can read aloud.
- Half the screen is empty. Use it: result card, "copy", recent calculations, presets.
- No memory of last inputs. Ours remembers per tool.
- Ladder picker needs a vendor dialog first. Ours: favourites pinned on top, search box,
  all vendors in one scroll. Add **ng per band** and the loading amount, since that is
  what you need to quantify a band.
- RNA ladder labelled "bp"; RNA ladders are single-stranded and should read **nt**.
  Small, but it signals whether the app was made by people who do the work.
- Nothing hardware-aware: no timer alarm, no counter, no protocol reader, no bench device.
  That is our unique ground.

---

## 9. Decisions (2026-09-08)

| Question | Answer | Consequence |
|---|---|---|
| SpinZero | Existing single-file web app: balances centrifuge rotors with roots of unity. | Drops straight into the PWA as a module. Reuse its `--tube-fill` teal and `--empty-slot` orange as the app palette seed. |
| ESP32 hardware | Has boards and small LCDs, wants to buy for this project. | Recommendation: **Waveshare ESP32-S3-Touch-LCD-4.3** (800×480 capacitive IPS, 8 MB PSRAM, runs LVGL comfortably) plus a rotary encoder, a passive buzzer and one big arcade button. Buy one **Cheap Yellow Display** (ESP32-2432S028R) as well for a 12 € first try; its resistive touch works with gloves. |
| Users | Own lab first, public later if good. | No store, no accounts. Install-from-link PWA. Keep code clean enough to publish later. |
| Ladders | GeneRuler 1 kb Plus (SM1332), PageRuler Plus Prestained (26619). RiboRuler low/high as RNA examples. | In `core/data/ladders/`. |
| Protocols | Lipofectamine 3000, Promofectin + luciferase, Dual-Glo, Roche High Pure RNA. | Converted to the step format in `core/protocols/`. The transfection sheets have fill-in blanks and per-well volumes, so the format gained `input:` and `per_well:` (master-mix multiplier). |
| Priority | Phone first. | Phase 1 = PWA. ESP32 after the phone app is in daily use. |
| Editing by the lab | No. | Data files stay simple anyway, but no in-app editor is needed for v1. |
| Locale | English, µL. | Decimal point. |
| Look | Teal / orange, TggR Lab logo, simple, neat, retro. | Direction: 1970s bench-instrument. Cream or deep-teal ground, orange indicator accents, Didone serif for the wordmark (as in the logo), monospaced readouts for numbers, thin hairline borders. |
| Mockups first | Yes. | Screen mockups drafted before code. |
| Logo | Sent as an image in chat. | Not received as a file. Add the PNG to `assets/brand/` in the repo. |
