---
title: Pierce BCA protein assay
short: BCA
duration: 1 h
tags: [protein, quantification]
vessel: plate
formats: [plate, nanodrop]
per: well
materials:
  - Pierce BCA Reagent A and Reagent B
  - BSA standard 2 mg/mL (kit ampules, aliquots at −20 °C)
  - Lysis buffer (same as the samples)
  - 96-well flat-bottom plate or 96-well PCR plate
---
<!-- plate = full protocol read on the ELISA reader; nanodrop = small-volume version read on the NanoDrop colorimetric app. -->

## 1. Experiment
input: Experiment
input: Samples

## 2. Warm up
Heat the oven or water bath to 37 °C (a PCR block works with a PCR plate or strips).

## 3. BSA standards
fmt: Serial dilution in DDW from the 2 mg/mL stock, each step = plate 50 µL + 50 µL.; nanodrop 10 µL + 10 µL.
fmt: The 0.1 vial is = plate 40 µL of 0.25 + 60 µL DDW.; nanodrop 4 µL of 0.25 + 6 µL DDW.
Vials: 2 (stock), 1, 0.5, 0.25, 0.1 mg/mL, blank.

## 4. Working reagent
Reagent A + B, 50 : 1. One "well" per reading: 6 standards in triplicate + 2 lysis-buffer blanks = 20, plus 4 per sample (two dilutions in duplicate).
per_well: Reagent A = plate 200 µL; nanodrop 40 µL
per_well: Reagent B = plate 4 µL; nanodrop 0.8 µL
hint: enter 20 + 4 × samples as the wells in the corner
note: WR keeps 1 week at room temperature.

## 5. Dilute samples 1 : 5
fmt: Per sample = plate 6 µL sample + 24 µL lysis buffer.; nanodrop 2 µL sample + 8 µL lysis buffer.
Enough for duplicates.

## 6. Load
fmt: Standards in triplicate, diluted and undiluted sample in duplicate, per well = plate 10 µL.; nanodrop 2 µL.

## 7. Add working reagent
fmt: Working reagent per well = plate 200 µL.; nanodrop 40 µL.
Cover and mix on the plate shaker at 850 rpm for 30 s.

## 8. Incubate
37 °C for 30 min (up to 2 h). Cool to room temperature.
timer: 30m

## 9. Read
fmt: Read after 5 min, within an hour, on the = plate ELISA reader at 562 nm (540–590 nm).; nanodrop NanoDrop colorimetric BCA function, blank with water.
Take the USB stick for the results.

## 10. Calculate
Subtract the average blank. Plot the standard curve (quadratic or best fit). Subtract the lysis-buffer reading from every sample.
