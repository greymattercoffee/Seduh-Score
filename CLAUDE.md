# Seduh Score — Claude Code orientation

Read these two files in full before touching anything:
1. `CONVENTIONS.md` — all patterns, naming rules, architecture decisions
2. `CHANGELOG.md` — current version and what's pending

---

## Non-negotiables

### CSS contract — never violate
These token names and overlay classes are read directly by
module files and shared JS. Renaming or removing any of them
silently breaks the platform:

**Contract tokens (never rename or remove):**
`--txt`, `--txt2`, `--txt3`, `--am`, `--am-h`, `--am-bg`,
`--am-bd`, `--bl`, `--bl-bg`, `--bl-bd`, `--gn`, `--gn-bg`,
`--gn-bd`, `--rd`, `--rd-bg`, `--rd-bd`, `--pu`, `--pu-bg`,
`--pu-bd`, `--accent`, `--accent-h`, `--accent-bg`,
`--accent-bd`, `--accent-ink`, `--bg`, `--surface`, `--ink`

**Overlay classes (never rename or remove):**
All `.tmr-*` classes, all `.aud-*` classes,
`#tmr-overlay`, `#aud-overlay`, `#pdf-overlay`,
all `.pdf-*` print rules

### Git — never push to main
All changes go to `dev` branch only.
main ← protected, live. dev ← all active work.
Releases happen via PR from dev → main on GitHub.

### Files — work local only
Never access GitHub URLs directly.
Work from local files in this repo only.

### After every session that ships code
Update `CHANGELOG.md` before closing. Non-negotiable.

---

## Architecture

Static multi-file web app. No build step, no bundler,
no framework, no dependencies.

```
index.html              ← dashboard only
bbtc/index.html         ← self-contained module
throwdown/index.html    ← self-contained module
liga/index.html         ← self-contained module
timer/index.html        ← standalone timer page
shared/
  theme.css             ← design system (v4.1, audited June 2026)
  timer.js              ← shared timer component
  audience.js           ← shared audience overlay
  storage.js            ← localStorage wrapper
  assets/               ← seduh-mark.svg + favicons
```

Each module loads shared files via relative paths:
```html
<link rel="stylesheet" href="../shared/theme.css">
<script src="../shared/storage.js"></script>
<script src="../shared/timer.js"></script>
<script src="../shared/audience.js"></script>
```

---

## Known quirks (temporary — resolve in v4.1 completion pass)

**BBTC (`bbtc/index.html`):**
- Has a local `:root` block overriding platform tokens with
  a divergent cool-grey palette — deferred fix in POA-05
- Uses `.hdr` header class instead of `.plat-hdr` — deferred
  fix in POA-06
- Audience overlay is self-contained, does not use shared
  audience.js contract — deferred fix in POA-09
- Display name still says "Brunei Barista Team Championship"
  — rename to "Barista Team Championship" in POA-06/POA-10

**Throwdown (`throwdown/index.html`):**
- Loads audience.js but bypasses Audience.init() and
  Audience.show() — fix in POA-04

**Liga (`liga/index.html`):**
- Calls Timer.init() at module level instead of inside
  bind() — fix in POA-07

These are known and documented. Do not attempt to fix them
unless the session is specifically scoped to the relevant POA.

---

## Semantic colour contract

Colour is functional, not decorative. Never reassign:
- Blue = rounds in progress
- Green = completion / winners
- Purple = redemption
- Red = destructive actions / ties
- Amber = primary brand accent (Grey Matter / Seduh Score)

---

## Repo
Remote: `https://github.com/greymattercoffee/Seduh-Score.git`
Live: `https://greymattercoffee.github.io/Seduh-Score/`
Local: `C:\Users\mfosa\OneDrive\Documents\Seduh-Score`
Current version: check CHANGELOG.md
