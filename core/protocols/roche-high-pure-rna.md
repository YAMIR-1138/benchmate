---
title: Total RNA isolation, High Pure RNA Isolation Kit (Roche)
short: RNA isolation
duration: 25 min per sample
tags: [RNA, extraction, spin column]
per: sample
conditions: no
caps:
  - Lysis/Binding Buffer: green
  - DNase I Incubation Buffer: white
  - Wash Buffer I: black
  - Wash Buffer II: blue
  - Elution Buffer: colorless
materials:
  - High Pure Filter Tubes and Collection Tubes
  - PBS
  - Lysis/Binding Buffer
  - DNase I and DNase I Incubation Buffer
  - Wash Buffer I, Wash Buffer II
  - Elution Buffer
  - Sterile 1.5 mL tubes
note: TGGR edition of the pack-insert protocol for up to 1×10⁶ cultured cells. Changes from the insert: lysis mix can go straight onto the well, elution down to 30 µL.
---

## 1. Lysis mix
Master mix in one tube, 600 µL per sample:
per_well: PBS = 200 µL
per_well: Lysis/Binding Buffer = 400 µL
extra: 10 %
icon: mix

## 2. Lyse
icon: vortex
### a. From a pellet
Resuspend the pellet in 600 µL of the mix. Vortex 15 s.
### b. In the plate
Or in the plate: aspirate the medium, drop 600 µL of the mix straight onto the cells, vortex the plate 15 s, transfer the lysate to a tube.
timer: 15s

## 3. Load column
Insert a Filter Tube into a Collection Tube. Pipet the whole sample (max 700 µL) into the upper reservoir.
Centrifuge 15 s at 8000 ×g. Discard the flow-through, reassemble.
timer: 15s
icon: column

## 4. DNase mix
Mix, then pipet 100 µL onto the glass fibre fleece of each column. Incubate at 15–25 °C.
per_well: DNase I Incubation Buffer = 90 µL
per_well: DNase I = 10 µL
timer: 15m
icon: drop

## 5. Wash I
Add 500 µL Wash Buffer I. Centrifuge 15 s at 8000 ×g. Discard flow-through, reassemble.
timer: 15s
icon: wash

## 6. Wash II
Add 500 µL Wash Buffer II. Centrifuge 15 s at 8000 ×g. Discard flow-through, reassemble.
timer: 15s
icon: wash

## 7. Dry spin
Add 200 µL Wash Buffer II. Centrifuge 2 min at max speed (about 13 000 ×g).
note: The long spin removes residual wash buffer.
timer: 2m
icon: spin

## 8. Elute
Discard the Collection Tube. Put the Filter Tube into a clean 1.5 mL tube.
Add Elution Buffer, centrifuge 1 min at 8000 ×g.
per_well: Elution Buffer = 30 µL | editable
hint: 30 µL for concentrated RNA (lab minimum); the insert says 50–100 µL
note: With 30 µL, elute twice: pipet the eluate back onto the column and spin again. Same volume, more RNA.
timer: 1m
icon: elute

## 9. Done
Use the RNA directly in RT-PCR or store at −80 °C.
icon: freeze
