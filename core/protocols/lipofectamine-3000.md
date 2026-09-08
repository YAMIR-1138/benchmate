---
title: Lipofectamine 3000 transfection
short: Lipo 3000
duration: 30 min hands-on, 2–4 days total
tags: [transfection, cell culture, 24-well]
vessel: 24-well
materials:
  - Opti-MEM
  - Lipofectamine 3000 Reagent
  - P3000 Reagent
  - Plasmid DNA
scaling:
  - "6-well: 2500 ng DNA, 5 µL P3000, 5 µL Lipofectamine per well"
  - "96-well: 100 ng DNA, 0.2 µL P3000, 0.2 µL Lipofectamine per well"
---

## 1. Seed cells
Seed cells in a 24-well plate the day before.
input: Cell type
input: Cells per well

## 2. Check confluence
Cells should be 70–90 % confluent.

## 3. Reduce medium
Reduce medium from 500 µL to 350 µL per well to improve transfection.

## 4. Mix A: Opti-MEM + Lipofectamine
per_well: 25 µL Opti-MEM
per_well: 1 µL Lipofectamine 3000

## 5. Mix B: Opti-MEM + DNA + P3000
Add P3000 last.
per_well: 25 µL Opti-MEM
per_well: 500 ng DNA
per_well: 1 µL P3000 Reagent
input: Plasmid
note: Mix well. No need to vortex.

## 6. Combine
Add the DNA mix (B) to the Lipofectamine mix (A).
timer: 10-15m

## 7. Add to cells
Add 50 µL of the combined mix drop-wise to each well.
Check cells in the microscope.

## 8. Spin down
Spin the plate down briefly.

## 9. Change medium
Change medium at the end of the day.
warning: Minimum 2.5 h after transfection.
timer: 2h30m

## 10. Incubate
Incubate cells for 2–4 days at 37 °C.
