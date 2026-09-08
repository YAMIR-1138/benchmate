---
title: Promofectin transfection + luciferase readout
short: Promofectin
duration: 3 days
tags: [transfection, luciferase, 24-well]
vessel: 24-well
materials:
  - Opti-MEM
  - Promofectin (or Lipofectamine)
  - Plasmid DNA
  - TNFα (optional)
  - Dual-Glo Luciferase Reagent (−80 °C)
  - Dual-Glo Stop & Glo (prepare fresh, 1:100)
---

## 1. Seed cells
Seed cells in a 24-well plate.
input: Cell type
input: Cells per well

## 2. Check confluence
A day later, cells should be at 80 % confluence.

## 3. Mix A: Opti-MEM + Promofectin
per_well: 50 µL Opti-MEM
per_well: 2 µL Promofectin
note: With Lipofectamine instead: 25 µL Opti-MEM and 1 µL Lipofectamine per well.
Vortex.

## 4. Mix B: Opti-MEM + plasmid
per_well: 50 µL Opti-MEM
per_well: 50–500 ng plasmid (total)
input: Plasmid
Vortex.

## 5. Combine and wait
Wait 5 min, then combine A and B, mix and vortex.
timer: 5m

## 6. Complex formation
timer: 15-30m

## 7. Add to cells
Add 100 µL of mix drop-wise into the serum-containing medium (50 µL if using Lipofectamine).

## 8. Spin down
Spin the plate down briefly.

## 9. Change medium
Change medium at the end of the day.
warning: Minimum 2.5 h after transfection.
timer: 2h30m

## 10. Stimulate (optional)
24 h later add 10 ng/mL TNFα with fresh medium (1:10 000 dilution).

## 11. Luciferase readout
48 h after transfection, continue with the Dual-Glo luciferase protocol.
