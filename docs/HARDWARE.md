# Bench Mate box: hardware shopping list

Prices are typical AliExpress prices and will move around. Check the listing before you
order. Two builds: a cheap one to prove the idea, and the one to actually put on the bench.

## Build A · the €25 proof (2.8", resistive touch, works with gloves)

| Part | What to search for | ~Price | Why |
|---|---|---|---|
| Board + screen | **ESP32-2432S028R** "Cheap Yellow Display", 2.8" 320×240, resistive touch | 8–15 | Cheapest ESP32 with a colour touchscreen. Resistive touch works through nitrile gloves. Has a speaker amp and a 2-pin speaker connector. Huge community, ready LVGL examples. |
| Speaker | 8 Ω 1 W mini speaker, 2-pin JST 1.25 | 1 | For the alarm. Plugs into the CYD speaker connector. |
| Power | **TP4056 USB-C charger + 5 V boost** combo module (search "TP4056 boost 5V USB-C" or "134N3P") | 1.5–2 | The CYD has no battery circuit and wants 5 V. This charges the cell and boosts to 5 V. |
| Battery | 3.7 V LiPo 103450 (2000 mAh) or one protected 18650 + holder | 4–7 | 2000 mAh runs the CYD ~6 h with the backlight on. Battery may be easier to buy locally, many sellers won't ship cells. |
| Big button | 30 mm arcade push button (any colour) | 1–2 | The counter button. Hittable with the side of a gloved hand. |
| Knob | **KY-040** rotary encoder module with push | 1 | Set minutes and numbers without a keypad. |
| Buzzer | passive piezo buzzer module (3 pin) | 0.5 | Backup alarm if you skip the speaker. |
| Wires | Dupont jumper set, female–female | 1–2 | |
| Enclosure | 3D-print: "Enclosure for Sunton ESP32-2432S028R" on Printables (free) | 0–3 | Or any 100×70×35 mm ABS project box and a craft knife. |

Total: roughly 20–30.

Gotchas: the CYD exposes only a few free GPIOs on the P3 and CN1 connectors. The encoder
takes two, the button one, the buzzer one. That's the lot, and it's enough.

## Build B · the bench instrument (4.3", 800×480, battery charging on board)

| Part | What to search for | ~Price | Why |
|---|---|---|---|
| Board + screen + case | **Waveshare ESP32-S3-Touch-LCD-4.3B** (the B variant ships with a plastic case) | 30–40 | 800×480 IPS, 5-point capacitive touch, ESP32-S3 with 8 MB PSRAM so LVGL is smooth. Lithium battery header (PH2.0) with charger on board, USB-C. TF card slot for protocols. |
| Battery | 3.7 V LiPo 2000–3000 mAh with **PH2.0** plug, protected | 5–9 | Check polarity before plugging: red must go to the + mark on the board. Vendors wire PH2.0 both ways and a reversed plug kills the board. |
| Big button | 30 mm arcade push button | 1–2 | Counter. |
| Knob | KY-040 rotary encoder module | 1 | Numbers and minutes. |
| Buzzer | passive piezo buzzer module, or a small 8 Ω speaker + PAM8403 amp board | 0.5–2 | Loud alarm. The 4.3B has no speaker amp of its own. |
| Expander | PCF8574 I2C IO expander board | 1 | Optional. The 4.3B keeps most GPIOs behind an expander; this gives you 8 more pins on the I2C header for buttons. |
| Wires | JST-PH 2.0 pigtails, Dupont set | 2 | |

Total: roughly 45–55.

Gotchas: capacitive touch is fine with dry nitrile gloves and poor with wet ones, which is
why the button and the knob exist. Free enclosures on Printables and Thingiverse fit the
non-B board; the B ships with its own case, so plan the button and knob on a small side
box or a printed lid.

## Build C · zero soldering

**M5Stack CoreS3** (~50–60): battery, speaker, case, buttons and Grove ports in one unit.
2" screen, capacitive. Plug a Grove button and a Grove encoder in and you're done. Smaller
screen than B, but nothing to build.

## Tiny timer-only

**LILYGO T-Display-S3** (~15): 1.9" screen, two buttons, battery header. Not enough screen
for ladders or protocols; perfect as a pocket timer + counter.

## Recommendation

Order **one CYD kit (Build A)** now, it's cheap and the firmware work transfers, and
**one Waveshare 4.3B (Build B)** for the real box. Same LVGL code runs on both with a
different display driver.
