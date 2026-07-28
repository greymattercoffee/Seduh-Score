# Seduh Score — Claude Code orientation

*State: v5.12.5 — matches CHANGELOG.md as of July 2026*

Read these two files in full before touching anything:
1. `CONVENTIONS.md` — all patterns, naming rules, architecture decisions
2. `CHANGELOG.md` — current version and what's pending

---

## Delegation Strategy


Pure exploration/research (no edits): delegate to Explore, don't grep in the main thread.
After writing or modifying code in any module: use code-reviewer.
After implementing or changing scoring, bracket, or ranking logic: use scoring-logic-auditor — non-negotiable for anything touching redistribution math.
Before finalizing a new module's architecture (e.g. Cup Taster): use module-pattern-checker.
After UI/UX changes to timekeeper, score entry, or judge-facing screens: use ui-accessibility-reviewer.
After finishing a module or spec, or periodically: use kb-sync to catch drift the KB recon skill hasn't picked up yet.
For multi-module or multi-file refactors: spawn parallel general-purpose subagents per module, then synthesize in the main thread.
When drafting or revising a module spec: use the `spec-writer` skill.

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

## KB sync architecture

As of v5.11.0, Claude Projects knowledge base sync is split by git status:

- **Git-tracked docs** (`CHANGELOG.md`, `KB-PROTOCOL.md`, `CLAUDE.md`,
  `CONVENTIONS.md`, `README.md`, `AUDIT.md`) sync via the GitHub
  integration (Settings → Connectors → GitHub →
  `greymattercoffee/Seduh-Score`). Sync is manual-trigger, not automatic —
  run "Sync now" at the start of any Strategy session that references
  these docs, and after any Code session that edits them.
- **Gitignored docs** (`STRATEGY.md`, `ROADMAP.md`, `PLAN_OF_ACTION.md`,
  `PLAN_OF_ACTION_MUA.md`, `THROWDOWN-ARCHIVE-SPEC.md`) are excluded from
  git by design (business-sensitive) and therefore invisible to the GitHub
  integration. These stay on manual upload — no way around this without
  changing the gitignore boundary itself (a separate, larger decision,
  parked as of this writing).

This split was adopted to close the KB-staleness gap found during the
July 2026 repo audit (Strategy working from a KB snapshot one version
behind live `main`/`dev`).

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
tour/index.html          ← module tour page (POA-43, v5.6.0)
pitch/index.html         ← unlisted "The Platform" pitch page (POA-52, v5.8.0;
                           restructured POA-60, v5.10.3 — problem-first,
                           pricing + governance sections, no version/spiral
                           lore — moved to bts/)
bts/index.html            ← unlisted "Behind the Seduh" build-story page
                           (POA-60, v5.10.3) — codename spiral (7 shipped
                           cycles), per-cycle timeline, founder bio
onboard/index.html       ← public org onboarding intake form (POA-47, v5.9.0)
booth/                   ← mini-games (setup, display, guess, grinder) — live but
                           unlisted (ships with every Hosting deploy; confirmed
                           reachable July 2026). First event use target Oct 2026
                           per STRATEGY.md; rules hardened & deployed (POA-59,
                           v5.10.2-booth.3, July 2026)
shared/
  theme.css             ← design system (v4.1, audited June 2026)
  storage.js            ← localStorage wrapper (Store() factory)
  gates.js              ← tier/feature gating — see Non-negotiables above
  auth.js               ← Firebase auth state, dispatches seduh:gates-ready
  firebase.js           ← Firebase SDK init (app/auth/Firestore/Storage)
  eventconfig.js        ← organiser customisation (accent, logo, event identity)
  timer.js              ← shared timer component
  audience.js           ← shared audience overlay
  pdf.js                ← shared PDF export module (POA-55) — first consumer Throwdown
  sound.js              ← shared sound effects (used by bbtc, liga, timer)
  version.js            ← platform version constant (v5.5.1, POA-42 Part A) — sourced by index.html footer
  upcoming-events.js    ← shared event carousel (v5.5.2, POA-42 Part B) — UpcomingEvents.mount(); used by index.html + coming-soon/index.html
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

`pdf.js` — shipped (POA-55 in PLAN_OF_ACTION.md). `PdfExport.open/close/print`
per the CONVENTIONS.md spec, gated by the `pdf_branding` Gates key. First
consumer is Throwdown (POA-55 Step 0 pivot — Throwdown had a 30 Aug 2026 event
and benefited sooner than BBTC needed one). BBTC migrated onto this module at
v5.12.5 (MUA-07), closing out the `stash@{0}` refactor that had been parked
since the July 2026 full-repo audit. Liga/Cup Taster adoption remains
separate, future work.

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
