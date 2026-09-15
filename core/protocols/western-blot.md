---
title: Western blotting – Invitrogen system
short: Western
duration: 2 days
tags: [protein, western, Invitrogen]
materials:
  - Laemmli sample buffer (LSB) 2×, 4× or 5× and β-mercaptoethanol
  - Running buffer 1×, Transfer buffer 1× or Transfer Stacks
  - PVDF or nitrocellulose membrane, Whatman paper
  - PBS, Tween 20, dry milk
  - Primary and secondary antibodies, ECL
---
<!-- The lab's Invitrogen sheet: Mini Gel Tank and Power Blotter. -->

## 1. Run
input: Project
input: Gel type (%)
input: Homemade or precast

## 2. Sample buffer
Prepare LSB with reducing agent. Keeps 1–2 months at 4 °C.
LSB 2×: 50 µL β-ME per 950 µL. LSB 4×: 100 µL per 900 µL. LSB 5×: 125 µL per 875 µL.
warning: β-mercaptoethanol is a severe irritant absorbed through the skin. Fume hood.

## 3. Samples
Dilute samples with PBS 1× to equal loading volumes. Typical load is 30–40 µg.
Sample : LSB = 1 : 1 for 2×, 3 : 1 for 4×, 4 : 1 for 5×. Size standard: 5 µL, not heated, on ice.
input: µg per lane
input: LSB used

## 4. Denature
Boil 5 min, or 30 min at 37 °C. Cap holders on before boiling.
timer: 5m

## 5. Assemble the Mini Gel Tank
400 mL Running buffer 1× per chamber. Fill to the cathode. Rinse wells 3× with buffer, cassette wells facing forward, raised position, close clamp.
note: Precast gel: peel the tape at the bottom first. One gel only: remove the second clamp.

## 6. Load
Well guide in. Load samples and standard. Up to 40 µL DDW on top of each well. Open the clamp and lower the cassette slowly.
input: Lanes 1–10

## 7. Run
Until the blue line disappears. Homemade gel 130–200 V, about 1 h. Precast 225 V, 25–40 min.
timer: 1h
input: Start time, V, mA
input: Finish time, V, mA

## 8. Equilibrate
Remove the gel with the well guide or spatula. Cut a corner for orientation. Transfer buffer 1× (or DDW with Transfer Stacks).
timer: 5-30m

## 9. Semi-dry transfer, Power Blotter
Blot within 15 min of assembling the sandwich. No bubbles. Clean gloves.
### a. With Transfer Stacks
No transfer buffer. Bottom stack on the anode, membrane with a cut corner, gel, top stack without the separator. Lock with the cathode, slide in.
### b. With your own stack
50 mL Transfer buffer 1×. 4 Whatman + 1 membrane cut to size, corner cut. Equilibrate 5 min. On the anode: Whatman ×2, membrane, gel, Whatman ×2. Lock, slide in.
### c. Program
Pick 1 or 2 mini gels, and the method by protein size.
note: Above 150 kDa, 8–10 min. Below 25 kDa, 4–6 min.
timer: 7m

## 10. Post-transfer
Ponceau (reuse it). Mark lanes and marker sizes. Wash off by shaking in PBS 1×. Keep the membrane wet in PBS, wrapped, in the fridge.

## 11. Blocking
30–50 mL of 5–10 % dry milk in PBS with 0.2 % Tween 20 (PBS-T-M). Overnight at 4 °C or 1–2 h at room temperature on the rocker. Rinse 5 s in PBS-T.
timer: 1-2h

## 12. Primary antibody
In 1–10 mL PBS-T-M or Advanblock, 1–2 h room temperature or overnight 4 °C on the rocker.
input: Primary antibody
input: Dilution
note: Keep the primary for reuse; add sodium azide if diluted in milk.
timer: 1-2h

## 13. Wash
PBS-T 0.2 %, 6 × 5 min or 3 × 10 min.
timer: 5m

## 14. Secondary antibody
In 10 mL PBS-T-M, 1 h room temperature on the rocker.
input: Secondary antibody
input: Dilution
timer: 1h

## 15. Wash
PBS-T 0.2 %, 6 × 5 min or 3 × 10 min. Then PBS-T 3 % for 3 min and PBS 1× without Tween for 10 min. Keep a drop of the antibody as an ECL marker.
timer: 5m

## 16. ECL
Mix the two solutions 1 : 1, about 1 mL each per membrane. Dot HRP-antibody markers on a scrap of membrane. Incubate 1–3 min on parafilm in a dark box. Drip on blotting paper, expose on plastic wrap.
timer: 2m

## 17. Image
Fusion Pulse TS (Vilber Lourmat). Camera wheel on 1. Chemiluminescence, blot on tray 1, Preview, adjust. Multiple and Auto (Manual for a fixed exposure). Start. Mark the marker, paste selection, OK. Save as TIF or JPG. Leave software and camera on.
After imaging shake 10 min in PBS 1×, wrap, refrigerate.

## 18. Stripping
Up to 2–3 times. Option 1: 1.25 mL Tris 1 M pH 6.7 + 140 µL β-ME + 2 mL SDS 20 %, to 20 mL with DDW, 30 min at 50 °C, wash PBS-T 0.5 % 2 × 10 min. Option 2: 2 mL glycine 1 M pH 2.5 in 20 mL DDW, 30–60 min room temperature, wash 3× PBS. Option 3: commercial stripping buffer.
Check with ECL and a long exposure. Shake 10 min in PBS, wrap, refrigerate.
timer: 30m
