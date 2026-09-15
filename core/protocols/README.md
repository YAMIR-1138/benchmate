# Protocol format

One Markdown file per protocol. YAML front-matter, then one `##` heading per step.
Lines starting with a keyword are parsed into UI elements; everything else is prose.

| Keyword | Meaning |
|---|---|
| `timer: 15m` | Shows a "start timer" chip on the step (`30s`, `5m`, `2h30m`, `10-15m` for a range). |
| `warning: text` | Orange callout. |
| `note: text` | Muted callout. |
| `input: label` | A blank the user fills in for this run, shown as a sub-bullet "label: ____". Remembered per run. |
| `blank: label` | The same blank, but inline after the sentence, with no label shown. |
| `hint: text` | Small muted text in brackets. Takes the `= format value; …` form too. |
| `per: sample` (front-matter) | The word used on the sheet in place of "well", for protocols counted per sample or per tube. |
| `per_well: 25 µL Optimem` | A quantity per well. The app multiplies by the wells of each condition and lists the tubes. |
| `per_well: Opti-MEM = 12-well 50 µL; 24-well 25 µL` | Same, with a different amount per plate format. The sheet has a format picker; `vessel:` is the default and `formats:` lists the choices. |
| `per_well: DNA = 12-well 500 ng; 24-well 500 ng \| editable` | The amount becomes a blank the user can change for this run. |
| `per_well: Lipofectamine = 1.5 µL per µg DNA` | A reagent tied to another reagent by ratio. It follows whatever DNA amount is in use. |
| `fmt: Add drop-wise per well = 12-well 100 µL; 24-well 50 µL` | A sentence whose number depends on the format. |
| `### a. Sub-step` | A lettered sub-step inside a step (a, b, c), with its own text and `per_well:` lines. |
| `<!-- … -->` | A one-line comment, not shown. |

On the paper view a step's title is hidden when the step has its own sentence (body or `fmt:`), so write the sentence the way the sheet says it.

A run of a protocol remembers: plate format, the conditions (name, wells, plasmid ng/µL), the
filled-in blanks, and which steps were crossed out.

Original documents live in `source/`.
