---
name: css-contract
description: Full list of the CSS token names and overlay classes that shared JS and module files read directly. Load before touching theme.css or any .tmr-*/.aud-*/.pdf-* surface, since renaming or removing any of these silently breaks the platform.
---

# CSS contract — never violate

These token names and overlay classes are read directly by module files and
shared JS. Renaming or removing any of them silently breaks the platform.

## Contract tokens (never rename or remove)

`--txt`, `--txt2`, `--txt3`, `--am`, `--am-h`, `--am-bg`,
`--am-bd`, `--bl`, `--bl-bg`, `--bl-bd`, `--gn`, `--gn-bg`,
`--gn-bd`, `--rd`, `--rd-bg`, `--rd-bd`, `--pu`, `--pu-bg`,
`--pu-bd`, `--accent`, `--accent-h`, `--accent-bg`,
`--accent-bd`, `--accent-ink`, `--bg`, `--surface`, `--ink`

## Overlay classes (never rename or remove)

All `.tmr-*` classes, all `.aud-*` classes,
`#tmr-overlay`, `#aud-overlay`, `#pdf-overlay`,
all `.pdf-*` print rules
