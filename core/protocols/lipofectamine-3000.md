---
title: Lipofectamine 3000 protocol
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
<!-- Opti-MEM and default DNA per well: 12-well and 24-well from the lab's sheets, 6-well and 96-well from the Thermo table. Lipofectamine 3000 and P3000 scale with DNA at the low end of the official ratios: 1.5 µL and 2 µL per µg DNA. -->

## 1. Seed cells
fmt: Seed cells in a = 6-well 6 well plate; 12-well 12 well plate; 24-well 24 well plate; 96-well 96 well plate
input: Cell type

## 2. No. of cells
No. of cells:
blank: No. of cells per well
hint: typical = 6-well 0.5–1×10⁶; 12-well 0.5–2×10⁵; 24-well 0.5–1×10⁵; 96-well 1–4×10⁴

## 3. Confluence
Cells should be 70–90 % confluent.

## 4. Work in the dark

## 5. Reduce medium
fmt: Reduce the medium volume in each well to = 12-well 0.5 mL; 24-well 350 µL
to improve transfection efficiency.

## 6. Prepare two mixes
### a. Optimem and Lipofectamine
per_well: Optimem = 6-well 125 µL; 12-well 50 µL; 24-well 25 µL; 96-well 5 µL
per_well: Lipofectamine = 1.5 µL per µg DNA
hint: official range 1.5–3 µL per µg DNA, this sheet uses the low end
### b. Optimem, DNA and P3000 Reagent – add P3000 last
per_well: Optimem = 6-well 125 µL; 12-well 50 µL; 24-well 25 µL; 96-well 5 µL
per_well: DNA = 6-well 2500 ng; 12-well 500 ng; 24-well 500 ng; 96-well 100 ng | editable
per_well: P3000 = 2 µL per µg DNA
hint: DNA is editable; Lipofectamine and P3000 follow

## 7. Mix well
(no need to vortex)

## 8. Add DNA Mix to the Lipofectamine mix

## 9. Incubate and add drop-wise
fmt: Incubate 10–15 min and drop-wise = 6-well 250 µL; 12-well 100 µL; 24-well 50 µL; 96-well 10 µL
mix per well.
timer: 10-15m

## 10. Check cells in microscope

## 11. Spin down plate

## 12. Change medium at the end of the day
(2.5 h minimum)
timer: 2h30m

## 13. Incubate cells for 2–4 days at 37 °C
