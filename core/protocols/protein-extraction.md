---
title: Whole cell protein extraction
short: Protein extraction
duration: 1.5 h
tags: [protein, lysate, 6-well]
vessel: 6-well
per: well
materials:
  - PBS, cold
  - RIPA buffer without Complete
  - Complete mini protease inhibitor (1:7)
  - NaF 0.5 M
  - Na₃VO₄ 200 mM
  - PMSF 100 mM and EDTA 0.5 M (harvest medium approach)
---
<!-- From the lab's short checklist. Cross out the approach you are not using. -->

## 1. Samples
input: Project
input: Samples

## 2. RIPA lysis buffer
RIPA lysis buffer: make fresh, keep on ice. 200 µL per well of a 6-well plate.
per_well: RIPA buffer w/o Complete = 168 µL
per_well: Complete mini 1:7 = 28 µL
per_well: NaF 0.5 M (final 10 mM) = 4 µL
per_well: Na₃VO₄ 200 mM (final 1 mM) = 1 µL
hint: the sheet's X1 is 150 µL: 126 + 21 + 3 + 0.75

## 3. Direct lysis approach
### a. Rinse
Rinse the cells in each well 2–3 times with PBS.
### b. Lyse
Add 200 µL RIPA lysis buffer per well. Agitate the plate to mix.
### c. Ice
Leave the plate on ice.
timer: 30m
### d. Collect
Pipette the lysate into 1.5 mL tubes (a scraper helps).
### e. Spin
Centrifuge 20 min at 17 000 ×g, 4 °C.
timer: 20m
### f. Supernatant
Carefully transfer the supernatant to new tubes. Discard the pellet. Quantify or freeze.

## 4. Harvest medium approach
### a. Harvest medium
Harvest medium: 3.5 mL per well, made fresh, kept at 4 °C.
per_well: PBS X1 cold = 3.5 mL
per_well: PMSF 100 mM (final 1 mM) = 35 µL
per_well: EDTA 0.5 M (final 0.5 mM) = 3.5 µL
### b. Rinse
Rinse the cells in each well 2–3 times with PBS.
### c. Scrape
Add 2 mL harvest medium per well, scrape, transfer to a 15 mL tube. Rinse the well with another 1.5 mL and pool.
### d. Pellet
Centrifuge 20 min at 1 200 ×g, 4 °C. Discard the supernatant, keep the pellet.
timer: 20m
### e. Lyse
Add RIPA lysis buffer to the pellet (150 µL per sample). Agitate on ice.
timer: 30m
### f. Spin
Centrifuge 20 min at 17 000 ×g, 4 °C.
timer: 20m
### g. Supernatant
Carefully transfer the supernatant to new tubes. Discard the pellet. Quantify or freeze.
