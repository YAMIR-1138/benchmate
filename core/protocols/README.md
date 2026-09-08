# Protocol format

One Markdown file per protocol. YAML front-matter, then one `##` heading per step.
Lines starting with a keyword are parsed into UI elements; everything else is prose.

| Keyword | Meaning |
|---|---|
| `timer: 15m` | Shows a "start timer" chip on the step (`30s`, `5m`, `2h30m`, `10-15m` for a range). |
| `warning: text` | Orange callout. |
| `note: text` | Muted callout. |
| `input: label` | A blank the user fills in for this run (cell type, plasmid, volumes). Remembered per run. |
| `per_well: 25 µL Optimem` | A quantity per well. The app multiplies by the number of wells and adds 10 % for a master mix. |

Original documents live in `source/`.
