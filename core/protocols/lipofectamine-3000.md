---
title: Lipofectamine 3000 transfection
short: Lipo 3000
duration: 30 min hands-on, 2–4 days total
tags: [transfection, cell culture]
vessel: 12-well
formats: [6-well, 12-well, 24-well, 96-well]
materials:
  - Opti-MEM
  - Lipofectamine 3000 Reagent
  - P3000 Reagent
  - Plasmid DNA (know the ng/µL of each)
---
<!-- 12-well and 24-well amounts are the lab's own sheets. 6-well and 96-well follow the lab's scaling notes; Opti-MEM for those two is from the Thermo table. -->

## 1. Seed cells
Seed cells the day before.
input: Cell type
input: No. of cells per well

## 2. Check confluence
Cells should be 70–90 % confluent.

## 3. Work in the dark
Lipofectamine and P3000 are light sensitive. Dim the hood light.

## 4. Reduce medium
fmt: Reduce the medium in each well to = 12-well 0.5 mL; 24-well 350 µL
It improves transfection efficiency.

## 5. Mix A: Opti-MEM + Lipofectamine
per_well: Opti-MEM = 6-well 125 µL; 12-well 50 µL; 24-well 25 µL; 96-well 5 µL
per_well: Lipofectamine 3000 = 6-well 5 µL; 12-well 1.5 µL; 24-well 1 µL; 96-well 0.2 µL
Vortex briefly.

## 6. Mix B: Opti-MEM + DNA + P3000
Add P3000 last. One tube per plasmid.
per_well: Opti-MEM = 6-well 125 µL; 12-well 50 µL; 24-well 25 µL; 96-well 5 µL
per_well: DNA = 6-well 2500 ng; 12-well 500 ng; 24-well 500 ng; 96-well 100 ng
per_well: P3000 Reagent = 6-well 5 µL; 12-well 1 µL; 24-well 1 µL; 96-well 0.2 µL
input: Plasmids

## 7. Mix well
No need to vortex.

## 8. Combine
Add the DNA mix (B) to the Lipofectamine mix (A).

## 9. Incubate, then add to cells
timer: 10-15m
fmt: Add drop-wise per well = 6-well 250 µL; 12-well 100 µL; 24-well 50 µL; 96-well 10 µL

## 10. Check cells
Check cells in the microscope.

## 11. Spin down
Spin the plate down briefly.

## 12. Change medium
Change medium at the end of the day. Tap the step number to cross it out on runs that skip it.
warning: Minimum 2.5 h after transfection.
timer: 2h30m

## 13. Incubate
Incubate cells for 2–4 days at 37 °C.
