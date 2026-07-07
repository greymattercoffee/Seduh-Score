# Seduh Score — Claude Code orientation

*State: v5.5.0 — matches CHANGELOG.md as of July 2026*

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

### Gates — the only tier/feature check modules may call
`shared/gates.js` is core, load-bearing infrastructure. Every module's
gated feature goes through it:

```javascript
const access = Gates.canAccess('feature_key');
if (!access.allowed) { /* reason: 'tier' or 'disabled' */ }
```

Modules must never call `Gates.getTier()` or `Gates.isEnabled()`
directly, and must never inline tier/switch checks locally. Gated
elements are hidden, not disabled. See CONVENTIONS.md for the full
`FEATURES` registry and gate pattern (B3).

---

## Architecture

Static multi-file web app. No build step, no bundler,
no framework, no dependencies.

```
index.html              ← platform front door
admin/index.html         ← super admin panel (org tiers, platform switches, slideshow, upcoming events)
audience/index.html      ← remote audience viewer stub
bbtc/index.html          ← self-contained module
cup-taster/index.html    ← self-contained module
liga/index.html          ← self-contained module
throwdown/index.html     ← self-contained module
timer/index.html         ← standalone timer page
about/index.html         ← README renderer (public)
coming-soon/index.html   ← teaser landing page (served at "/" via Hosting redirect)
booth/                   ← mini-games (setup, display, guess, grinder) — in repo,
                           not yet publicly deployed; target Oct 2026 per STRATEGY.md
shared/
  theme.css             ← design system (v4.1, audited June 2026)
  storage.js            ← localStorage wrapper (Store() factory)
  gates.js              ← tier/feature gating — see Non-negotiables above
  auth.js               ← Firebase auth state, dispatches seduh:gates-ready
  firebase.js           ← Firebase SDK init (app/auth/Firestore/Storage)
  eventconfig.js        ← organiser customisation (accent, logo, event identity)
  timer.js              ← shared timer component
  audience.js           ← shared audience overlay
  pdf.js                ← shared PDF export module (v5.4, MUA-07 — BBTC pilot only)
  sound.js              ← shared sound effects (used by bbtc, liga, timer)
  assets/               ← seduh-mark.svg + favicons
```

Each module loads shared files via relative paths:
```html
<link rel="stylesheet" href="../shared/theme.css">
<script src="../shared/storage.js"></script>
<script src="../shared/gates.js"></script>
<script src="../shared/timer.js"></script>
<script src="../shared/audience.js"></script>
<!-- firebase.js + auth.js loaded as type="module" before </body> -->
```

`pdf.js` is currently included by BBTC only — do not add it to
Throwdown, Liga, or Cup Taster until each gets its own scoped
adoption session.

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
Live: `https://seduhscore.com` (Firebase Hosting, custom domain via Cloudflare)
Local: `C:\Users\mfosa\OneDrive\Documents\Seduh-Score`
Current version: check CHANGELOG.md
