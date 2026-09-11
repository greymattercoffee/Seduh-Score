# Seduh Score — Claude Code orientation

*State: v5.16.1 — matches CHANGELOG.md as of September 2026*

Read these two files in full before touching anything:
1. `CONVENTIONS.md` — all patterns, naming rules, architecture decisions
2. `CHANGELOG.md` — current version and what's pending

---

## Delegation Strategy


Before drafting an approach for any non-trivial request: run a Clarification
Gate yourself — resolve fillable assumptions, pick the most likely reading
when a request is ambiguous, and check whether a smaller change meets the
same underlying need, using existing module conventions and judgment as the
basis for each call. Escalate to the user only what's left after that: a
genuine blocker that changes scope or behavior, not a routine gap. No
dispatched agent for this — `spec-writer` was decided against as standalone
tooling (see CHANGELOG.md's POA-73 resolution); it's a main-thread pre-diff
step, same treatment as the touch-target checklist below, and it complements
`code-reviewer`/`module-pattern-checker`'s post-diff enforcement rather than
duplicating it.
Pure exploration/research (no edits): delegate to Explore, don't grep in the main thread.
After writing or modifying code in any module: use code-reviewer.
After implementing or changing scoring, bracket, or ranking logic: verify
against test fixtures covering non-happy-path shapes before closing the
session — this project's defect history (POA-65/66/67, POA-70/71) is
entirely in this category.
Before finalizing a new module's architecture (e.g. Cup Taster): use module-pattern-checker.
After UI/UX changes to timekeeper, score entry, or judge-facing screens: check touch target sizes (44px minimum, per MUA conventions), contrast, and tab/nav reachability yourself before closing the session — no dispatched agent for this; it's a main-thread checklist step.
For multi-module or multi-file refactors: spawn parallel general-purpose subagents per module, then synthesize in the main thread.

---

## Non-negotiables

### CSS contract — never violate
Certain CSS token names and overlay classes are read directly by module
files and shared JS. Renaming or removing any of them silently breaks the
platform — load the `css-contract` skill before touching `theme.css` or
any `.tmr-*`/`.aud-*`/`.pdf-*` surface.

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
elements are hidden, not disabled. Load the `gates-pattern` skill for
the full `FEATURES` registry and gate pattern (B3).

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
