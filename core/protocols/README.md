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
| `per_well: 25 µL Optimem` | A quantity per well. The app multiplies by the wells of each condition and lists the tubes. |
| `per_well: Opti-MEM = 12-well 50 µL; 24-well 25 µL` | Same, with a different amount per plate format. The sheet has a format picker; `vessel:` is the default and `formats:` lists the choices. |
| `fmt: Add drop-wise per well = 12-well 100 µL; 24-well 50 µL` | A sentence whose number depends on the format. |
| `### a. Sub-step` | A lettered sub-step inside a step (a, b, c), with its own text and `per_well:` lines. |
| `<!-- … -->` | A one-line comment, not shown. |

On the paper view a step's title is hidden when the step has its own sentence (body or `fmt:`), so write the sentence the way the sheet says it.

A run of a protocol remembers: plate format, the conditions (name, wells, plasmid ng/µL), the
filled-in blanks, and which steps were crossed out.

Original documents live in `source/`.
