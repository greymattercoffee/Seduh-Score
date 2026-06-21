# Seduh Score — Audit Report
*Post POA-15 · June 2026*
*Local only — do not push to public repo*

## Cross-module checklist
Run these checks in every audit session:
- Storage key format: seduh_{module}_{vN}
- Timer.init() inside bind() — not at module level
- No inline tier checks — Gates.isPaid() /
  Gates.isCommunity() calls only (post-gates.js)
- Audience/PDF overlays use hardcoded hex (not tokens)
- Revival draw label in display strings (not wild card)
- No font-family:system-ui or sans-serif in local
  style blocks (deferred v4.1 item)

## Throwdown — POA-18
*Audited 21 June 2026 — v4.2.0 → v4.2.1*

### Dead code

**D1 — `getActiveRound()` (line 322–325): defined, never called.**
Returns `S.bracket.rounds[S.bracket.rounds.length - 1]`. Every caller accesses the last round directly inline. Left from an earlier draft. Safe to remove in a dead-code sweep.

**D2 — `openScoring(matchId)` (line 604–608): defined, never called.**
Sets `S.scoringMatchId`, calls `renderScoreModal()`, shows modal. This three-line body is duplicated verbatim in the `[data-score]` click handler in `bind()` (lines 1245–1249). Dead since that handler was added. Safe to remove.

**D3 — `S.bracket.mainPool`, `mergedPool`, `currentRound` (bracket init in `generateBracket()` lines 254–260 and `generateManualBracket()` lines 273–274): never read or written after initialisation.**
`redemptionPool` is actively used; these three are not. Left from an earlier bracket state model.

**D4 — `S.matches` (DEFAULT_STATE line 160, demo line 1315): initialised to `[]`, never read or written.**
All match data lives in `S.bracket.rounds[].pairs`. Carry-over from BBTC's flat-matches architecture.

### Pattern violations

**P3 — Event listeners attached in render functions — VIOLATION.**
CONVENTIONS: "Never attach event listeners outside of `bind()`."
- `render1v1ScoreModal()` attaches `.vbtn`, `sm-confirm`, `sm-cancel` listeners: lines 664–679
- `renderRedemptionScoreModal()` attaches `.rdvbtn`, `.rdtbtn`, `sm-confirm`, `sm-cancel` listeners: lines 724–755
- `sm-cancel` (lives outside `sm-body`, not rebuilt by renderScoreModal) also receives a listener from `bind()` line 1261 — potential accumulation per render cycle. Pre-existing; not a current crash risk.
- Deferred to POA-16 when modal architecture is revisited.

**P7 — Hardcoded hex in non-overlay render function — VIOLATION.**
Demo mode card in `rSetup()` line 846: `#F5F3FF`, `#C4B5FD`, `#6D28D9` in main app render.
Should be `var(--pu-bg)`, `var(--pu-bd)`, `var(--pu)`. The overlay exception does not apply here.

### Pattern checks — PASS

- **Timer.init() placement:** ✅ Line 1129 — inside `bind()`. Correct.
- **font-family:system-ui:** Not found in local `<style>` block (lines 9–79). Deferred v4.1 item is absent from this file — POA-06 can skip throwdown for this check.
- **Audience/PDF overlay hex:** ✅ `showAudience()` (lines 1056–1122) uses hardcoded hex throughout. No `var()` calls in overlay context.
- **`on()` guard:** ✅ Line 1127 — `if(el)` guard present.

### Deferred items confirmed

**Manual bracket UI (`b.phase === 'manual-setup'`) — POA-12 confirmed present:**
- `refreshManualSelects()`: lines 310–320 ✅
- `startManualBracket()` duplicate check (flatMap + dedup + alert + return): lines 284–293 ✅

**Redemption scoring modal split — POA-15 confirmed clean:**
- `render1v1ScoreModal(pair)`: line 634 ✅
- `renderRedemptionScoreModal(match, round)`: line 682 ✅
- No dead code from any old unified modal found ✅

**Three redemption pair generation sites — POA-15 all consistent:**
- Site 1 — `advanceBracket()` lines 368–376: `{ id, brewers, votes: Object.fromEntries(...), tiebreaker: null, winner: null }` ✅
- Site 2 — `continueAfterWildCard()` lines 483–491: identical structure ✅
- Site 3 — `skipWildCard()` lines 529–537: identical structure ✅

### B4 rename — display strings updated

All 8 changes applied. Syntax check: PASS.

| Line | Before | After |
|---|---|---|
| 822 | `Wild card revival` (card-hdr) | `Revival draw` |
| 824 | `Enable wild card round` (label) | `Enable revival draw` |
| 825 | `🃏 Draw Wild Card` (hint strong tag) | `🃏 Revival Draw` |
| 948 | `// Wild card pending — show draw interface` | `// Revival draw pending — show draw interface` |
| 952 | `🃏 Wild Card Round` (bracket banner eyebrow) | `🃏 Revival Draw` |
| 953 | `draw a wild card` (paragraph text) | `draw a revival` |
| 955 | `🃏 Draw Wild Card (N in pool)` (button) | `🃏 Revival Draw (N in pool)` |
| 960 | `// Wild card just drawn — show reveal` | `// Revival draw just drawn — show reveal` |
| 969 | `🃏 Wild Card Drawn!` (reveal banner eyebrow) | `🃏 Revival Draw!` |

### B2 storage key — confirmed

`seduh_throwdown_v1` — confirmed at line 142. Matches POA-23 locked format (`seduh_{module}_{vN}`). No shim needed.

### Fixes applied

- **B4 rename:** 8 display strings updated (see table above). Syntax OK.

### Still open / flagged as tech debt

**JS identifiers intentionally left (B4 scope exclusion):**
`S.wildCard`, `b.wildCards`, `b.pendingWildCard`, `b.pendingWildCardLosers`,
`drawWildCard()`, `continueAfterWildCard()`, `skipWildCard()`,
`wc-enable`, `wc-continue`, `do-draw-wc`, `skip-wc`

**Algorithm comments referencing "wild card" (not user-facing — intentionally left):**
Lines 343, 351, 362, 467, 475, 1173

**Deferred pattern violations:**
- P3 — Modal listeners outside bind() — defer to POA-16 modal architecture pass
- P7 — Demo card hex colors — fix in a QOL pass

**Dead code not removed (report only in this session — safe to sweep later):**
D1 `getActiveRound()`, D2 `openScoring()`, D3 `mainPool`/`mergedPool`/`currentRound` in bracket state, D4 `S.matches`

## BBTC — POA-19
*Audited 21 June 2026 — v4.2.1 → v4.2.2*

### Dead code

**D1 — `RC[*].time` property (line 315–319): defined on all four RC entries, never read.**
`time:'10 min'` / `time:'15 min'` on every round config object. The info strip in `rCreateForm()` hardcodes `"10 min"` directly in the template string — `RC[round].time` is never referenced anywhere. Dead data property.

**D2 — `cfg` variable in `rCreateForm()` (line 651): declared, never used.**
`const cfg=RC[S.nm.round];` is assigned but `cfg.drinks`, `cfg.time`, `cfg.maxJ` are never accessed in the function body. The template hardcodes `"15"`, `"10 min"`, `"45"` as literals. Dead variable.

**D3 — `S.nm.round` state field (line 334): always `'preliminary'`, never mutated.**
Initialized to `'preliminary'` in all three reset sites (lines 334, 421, 791). No handler or UI element ever changes it. The form only creates preliminary matches via the `doCF` handler; the field has no runtime effect.

### Pattern violations

**P1 — `font-family:system-ui,sans-serif` in `.pdf-page` class (line 219) — FLAG.**
In the local `<style>` block's PDF overlay CSS. Per POA-06, module-local `system-ui`/`sans-serif` should be replaced with `var(--font-body)`. Note: PDF print context may have legitimate reasons to avoid CSS vars — POA-06 to decide.

**P7 — Hardcoded hex in non-overlay render function — VIOLATION.**
Demo card in `rSetup()` (line 640): `#F5F3FF`, `#C4B5FD`, `#6D28D9` in main-app render output.
Should be `var(--pu-bg)`, `var(--pu-bd)`, `var(--pu)`. The overlay exception does not apply here.
Same pattern as Throwdown P7. Deferred to QOL pass.

### Pattern checks — PASS

- **Timer.init() placement:** ✅ Line 759 — inside `bind()`. Comment: *"init() is idempotent."*
- **font-family:system-ui:** Found only in `.pdf-page` (PDF overlay context) — see P1 above.
- **Audience/PDF overlay hex:** ✅ Audience CSS (lines 183–210) and PDF CSS (lines 212–246) use hardcoded hex throughout. No `var()` calls in either overlay context.
- **`on()` guard:** ✅ Line 747 — `if(el)` present.

### Deferred items confirmed (POA-06, POA-09, POA-10)

**`.hdr` header class — POA-06:**
Line 14 (CSS): `.hdr{display:flex;...}` — `.hdr` not `.plat-hdr`.
Line 632 (render): `<div class="hdr">` in `rMain()`. Confirmed present, untouched.

**Audience overlay self-contained — POA-09/16:**
No `<script src="../shared/audience.js">` in file. No `Audience.init()` or `Audience.show()` calls anywhere. BBTC uses its own `showAudience()` function (line 598). Confirmed — shared audience.js contract not in use.

**Display name "Brunei Barista Team Championship" — POA-06/10:**
Present in 5 locations:
- Line 291 (audience overlay HTML): `<div class="aud-sub">Brunei</div>…`
- Line 557 (generatePDF footer string): `'Brunei Barista Team Championship'`
- Line 559 (generatePDF page content): `<div class="pdf-event-sub">Brunei</div>…` (×2 pages)
- Line 569 (generateCSV): `row(['Brunei Barista Team Championship',eventMeta])`
- Line 632 (rMain header): `<div class="hdr-s">Brunei</div><div class="hdr-t">Barista Team Championship</div>`

All confirmed present, untouched. POA-06/10 deferred.

### B2 migration — bbtc_v3 → seduh_bbtc_v3 shim

Shim placed immediately before `loadState()` (after line 357 in original). `STORE_KEY` updated from `'bbtc_v3'` to `'seduh_bbtc_v3'` at line 329. All four usages of the constant (saveState, loadState, reset handler) resolved automatically via the constant — no other string literals to update.

| Original line | What | Disposition |
|---|---|---|
| 329 | `const STORE_KEY='bbtc_v3'` | Updated → `'seduh_bbtc_v3'` |
| 341 | `localStorage.setItem(STORE_KEY,...)` | Unmodified — uses constant |
| 348 | `localStorage.getItem(STORE_KEY)` | Unmodified — uses constant |
| 763 | `localStorage.removeItem(STORE_KEY)` | Unmodified — uses constant |
| (new) | Migration shim IIFE | Placed before `loadState()` |

Syntax check: PASS.

### POA-05 follow-up — 73 hex replacements verified

Spot-checked all overlay and PDF contexts post-v4.1.4:
- Audience overlay CSS (lines 183–210): hardcoded hex throughout — warm palette values, zero `var()` calls. ✅
- PDF overlay CSS (lines 212–246): hardcoded hex throughout, zero `var()` calls. ✅
- `showAudience()` JS (lines 598–621): hardcoded hex in all inline styles. ✅
- `generatePDF()` JS `roundMeta` object (lines 543–547): hardcoded hex. ✅

**PASS** — no `var()` tokens in overlay/PDF contexts. v4.1.4 replacements correctly used warm hex literals in all overlay contexts.

### Fixes applied

- **B2 migration:** `STORE_KEY` updated to `'seduh_bbtc_v3'`. One-time shim IIFE placed before `loadState()`. Syntax: PASS.

### Still open / flagged as tech debt

**Deferred pattern violations:**
- P1 — `font-family:system-ui` in `.pdf-page` — POA-06 to decide print-compat vs token adoption
- P7 — Demo card hex `#F5F3FF` / `#C4B5FD` / `#6D28D9` — fix in QOL pass (use `var(--pu-bg/bd/pu)`)

**Dead code not removed (report only — safe to sweep later):**
D1 `RC[*].time` property, D2 `cfg` in rCreateForm(), D3 `S.nm.round` always preliminary

**Deferred items (confirmed present, not fixed):**
- `.hdr` → `.plat-hdr` migration — POA-06
- Audience overlay → shared audience.js contract — POA-09/16
- "Brunei" display name → "Barista Team Championship" — POA-06/10

## Liga Seduh — POA-20
*Audited 21 June 2026 — v4.2.2 → v4.2.3*

### Dead code

**D1 — `allVoters` variable in `rScoringBody()` (line 1195): declared, never read.**
`const allVoters = [...ids];` is declared and the isFinal branch pushes `'__ext_' + j`
onto it (lines 1196–1200), but the voter loop at line 1202 iterates `ids` directly, not
`allVoters`. The variable is never referenced after its declaration. Safe to remove in a
dead-code sweep.

### Pattern violations

None found beyond the Timer.init() placement issue (see below, fixed).

### Pattern checks — PASS

- **font-family:system-ui:** ✅ Not found anywhere in the local `<style>` block
  (lines 8–53). Liga has no PDF functionality, so the `.pdf-page` case (present in BBTC)
  does not apply. POA-06 font-family item is N/A for Liga.
- **Audience/PDF overlay hex:** ✅ `rAudienceLbHTML()` (lines 924–954) and
  `rAudienceHistHTML()` (lines 956–998) use hardcoded hex throughout. No `var()` calls
  in overlay context. Correct per CONVENTIONS exception.
- **`on()` guard:** ✅ Line 184 — `if (el)` present.
- **P7 demo card:** ✅ Not found. Liga has no demo card rendered in `rSetup()`. The demo
  button is in the header; `loadLigaDemo()` loads state directly. No inline purple hex
  in main-app render output.
- **Render/bind discipline:** ✅ No DOM manipulation outside render functions or bind().
  `exportJSON()` and `exportReportCSV()` use ephemeral `<a>` click for file download —
  conventional pattern, not state-affecting DOM manipulation.
- **Storage key:** ✅ `seduh_liga_v1` at line 115. Conforms to locked format
  `seduh_{module}_{vN}`. No migration shim needed.

### Deferred items confirmed

**Header structure — POA-06:**
Line 537 (`rMain()`): `'<div class="plat-hdr">'` — Liga uses `.plat-hdr`, **not** `.hdr`.
Already correct class name (contrast with BBTC which uses `.hdr`). POA-06 work for Liga
is minimal: `.plat-mark` brand markup integration only.

**font-family:system-ui — POA-06:**
Not present in Liga's local `<style>` block. This deferred v4.1 item does not apply to
Liga. POA-06 can skip the font-family check for this module.

### Timer.init() placement — FIXED

Was: line 1656, module level (outside any function) — known violation from CLAUDE.md /
POA-07.
Fix applied:
1. `Timer.init();` removed from module level.
2. `Timer.init();` added as first line inside `bind()` (now line 1421).
Syntax check: PASS.

### Fixes applied

- **Timer.init() placement:** Moved from module level to first line of `bind()`.
  Idempotent — Timer.init() uses an inited guard (no-ops after first call). Syntax: PASS.

### Still open / flagged as tech debt

**Dead code not removed (report only — safe to sweep later):**
D1 `allVoters` in `rScoringBody()` — declared but never read (line 1195)

**Deferred items (confirmed present, not fixed):**
- `.plat-mark` brand markup absent from header — POA-06 (minimal: class already
  `.plat-hdr`, only SVG markup missing)
- font-family:system-ui — N/A for Liga (not present, no PDF overlay)

## Shared components — POA-21
*Audited 21 June 2026 — v4.2.3 → v4.2.4*

### timer.js

**API conformance — PASS** ✅
All four documented methods exist and are exported: `init`, `open`, `close`, `set`.

Module calls:

| Module | `Timer.init()` | `Timer.open()` | `Timer.close()` | `Timer.set()` |
|---|---|---|---|---|
| throwdown | ✅ bind() line 1129 | ✅ line 1131 | not called | not called |
| bbtc | ✅ bind() line 767 | ✅ line 768 | not called | not called |
| liga | ✅ bind() line 1421 | ✅ line 1422 | not called | not called |
| timer/index.html | ✅ line 178 (top-level, intentional) | not called (intentional) | not called | ✅ line 181 |

`Timer.close()` — exported, never called by any module. Valid public API; no violation.

**Dead code — NONE** ✅
All internal symbols (`tick`, `setPreset`, `fmt`, `el`, `ovl`, `dsp`) are referenced within the module.

**inited guard — PASS** ✅
Lines 57–59: `if (inited) return;` — no-ops safely on repeated calls.
Liga's every-render `Timer.init()` pattern is safe because of this guard.

**D1 — Escape key to exit fullscreen — FIXED**
CHANGELOG v3.5.2 stated Escape-to-exit-fullscreen was "Added to shared/timer.js init()" but
the handler was absent from the file. `timer/index.html` had its own local handler (lines
190–192); BBTC covered it in `initTimer()`. Throwdown and Liga had no Escape exit path for
the timer overlay fullscreen.
Fix applied: `document.addEventListener('keydown', e => { if (e.key === 'Escape') ovl()?.classList.remove('fs'); })`
added inside `init()`, covered by the inited guard. Optional chaining on `ovl()` is a no-op on
the standalone timer page where `#tmr-overlay` is never a popup overlay.

### audience.js

**API conformance — PASS** ✅
Both documented methods exist and are exported: `init`, `show`.
`show()` signature: `{ title, moduleTag, lbHTML, histHTML }` — all four params present with defaults.

Module calls:

| Module | `Audience.init()` | `Audience.show()` | params passed |
|---|---|---|---|
| throwdown | ✅ bind() line 1130 | ✅ line 1117 | `title`, `moduleTag`, `histHTML` — `lbHTML` omitted intentionally (no standings panel in Throwdown) |
| bbtc | not called — self-contained | not called — self-contained | POA-09/16 deferred ✅ |
| liga | ✅ bind() line 1423 | ✅ line 1411 via `showAudience()` | all four params ✅ |

**aud-lb guard — PASS** ✅
Lines 28–29: `const lbEl = el('aud-lb'); if (lbEl) lbEl.innerHTML = ...` — silently skips if element absent.

**title param — PASS** ✅
Line 16: wired to `aud-ts`. Lines 19–22: wired to `aud-title-block` (guarded).

**S1 — aud-close listener accumulation — FLAG**
`Audience.init()` is called every `bind()` cycle. `#aud-close` is a static element that persists
across renders — each call stacks a new listener on the same button. After N renders, one click
fires N handlers. Unlike `timer.js` (which has an `inited` guard), `audience.js` has no equivalent.
Defer fix to POA-16 — add `audInited` guard or use event delegation.

**S2 — aud-hist and aud-ts have no null guard — FLAG**
`el('aud-ts').innerHTML` (line 16) and `el('aud-hist').innerHTML` (line 30) lack optional
chaining. Both throw if their elements are absent from overlay markup. `aud-lb` is guarded;
these two are not.

### storage.js

**Interface check — PASS** ✅
`save(obj)`, `load()`, `clear()` — all three methods present.
`load()` returns `null` (not `undefined`) on missing key; returns `null` on JSON parse failure
via catch. Contract met.

**Firebase adapter seam assessment:**
Interface shape is correct for a drop-in adapter. Factory pattern `Store(key) → object` maps
cleanly to a Firestore document path.

- `save()` — fire-and-forget (void). Firestore adapter can handle async internally without
  module changes. ✅ Compatible.
- `load()` — synchronous; returns a value directly. Every module calls
  `const d = STORE.load(); if (d) { ... }`. A Firestore adapter cannot fulfil this natively.
  Before v5.0, either: (a) modules updated to `await STORE.load()` in a single pass, or
  (b) adapter uses localStorage as a sync read cache with Firestore syncing in the background.
  This is the one seam that requires a design decision before v5.0.

**Modules bypassing Store() — Firebase pre-condition inventory:**

| Module | Uses Store()? | Direct localStorage calls |
|---|---|---|
| throwdown/index.html | ✅ | none |
| liga/index.html | ✅ | none |
| bbtc/index.html | ❌ | `setItem`/`getItem`/`removeItem` — lines 341, 348, 771 + migration shim lines 359–362 |
| index.html (dashboard) | ❌ | `getItem`/`setItem` — lines 149, 152 |

BBTC and the dashboard must be migrated to `Store()` before the Firebase adapter can work
universally. This is a v5.0 pre-condition, not in scope for the current audit phase.

### Fixes applied

- **D1 — timer.js Escape key**: `document.addEventListener('keydown', ...)` handler added to
  `init()`. Covers Throwdown and Liga timer overlay fullscreen exit. Guarded by `inited`;
  optional chaining on `ovl()` for standalone-page safety. Syntax: PASS.

### Notes for POA-16 audience rebuild

1. **Two-panel architecture is hardcoded** (`aud-lb` + `aud-hist`). Adding a podium panel
   (POA-11) requires a third slot in the `show()` signature and all module overlay markups.
2. **`aud-ts` and `aud-hist` are hard element requirements** with no null guards — rename or
   removal in the rebuild will throw at runtime. Add `?.` to both for safety.
3. **S1 — `aud-close` accumulation** must be resolved in the rebuild (add `audInited` guard,
   mirroring `timer.js`).
4. **Fallback hex `#9CA3AF`** (lines 29, 30) is below projector contrast. Replace with a
   higher-contrast value in POA-16.
5. **`ovl()` at line 31 has no null guard** — `#aud-overlay` must remain in overlay markup.
6. **BBTC is fully isolated** — POA-16 will need a separate retrofit pass for BBTC's
   self-contained audience (POA-09); extending the shared module alone is not enough.

## Dashboard + Timer — POA-22
*Audited 21 June 2026 — v4.2.4 → v4.2.5*

### Dead code

#### index.html (dashboard)

**None found.**
All functions, variables, and constants within the IIFE are reachable and referenced. `IC`, `ACCENTS`, `MODULES`, `TOOLS`, `DEFAULT_EVENT`, and `LS` are all consumed. Every helper function (`load`, `save`, `fmtDate`, `esc`, `applyAccent`, `logoSlot`, `metaRow`, `renderHero`, `renderModules`, `renderTools`, `renderSwatches`, `layoutMini`, `renderLayoutPick`, `bindLogo`, `fillForm`, `updateSubCount`, `field`, `openSheet`, `closeSheet`, `init`) is either called in the module body or wired as a listener. No orphaned comment blocks.

#### timer/index.html

**None found** (post-fix).
Before fix: the `keydown` Escape listener (lines 190–192) was made redundant by the timer.js fix applied in POA-21 — removed in this session (see Fixes applied). After removal, all remaining code is active: `ovl` is used by the `fsExit` click handler; `fsExit` is used directly. No other dead code.

### Pattern violations

#### index.html (dashboard)

**P1 — Direct localStorage bypassing Store() — FLAG for v5.0.**
The dashboard uses its own `load()`/`save()` wrapper functions that call `localStorage` directly:
- Line 149: `localStorage.getItem(LS)` inside `load()`
- Line 152: `localStorage.setItem(LS, ...)` inside `save()`

These are the **only two** direct localStorage calls in the file — no `removeItem`. No Store() usage anywhere. The `seduh_event_v1` key is isolated from module keys and the two calls are contained within helper functions (cleaner pattern than BBTC's scattered calls), but the bypass is the same pre-condition: dashboard must migrate to `Store('seduh_event_v1')` before the Firebase adapter can work universally. Flag for v5.0; do not fix here.

**font-family:system-ui — N/A.**
Dashboard has no local `<style>` block at all. Deferred v4.1 font-family item does not apply.

**Storage key — CONFIRMED: `seduh_event_v1` only.**
`var LS = "seduh_event_v1"` at line 145 — single constant, used in both `load()` and `save()`. No secondary keys anywhere in the file. Conforms to locked format `seduh_{scope}_{vN}`.

**Soft flag — Module identity hex in MODULES array.**
`MODULES[*].m`, `.bg`, `.bd` (lines 122–128) are hardcoded hex values passed as inline CSS custom properties (`--m`, `--m-bg`, `--m-bd`) on each module card. These are per-module branding identity values (amber/blue/green), not design tokens with CSS variable equivalents. Not the same violation as P7 (demo card), but worth noting: if a central module colour registry is formalised in v5.0, these are the values to lift.

#### timer/index.html

**font-family:system-ui at line 16 — FLAG (deferred v4.1 item, same as BBTC P1).**
`font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif` on `body`. Same deferred item as POA-06. The dark court-display context makes this slightly different from BBTC's PDF case — the full platform type system would apply here. POA-06 to resolve.

**Hardcoded dark-theme hex throughout local style block — intentional.**
All hex values (`#111827`, `#1F2937`, `#D97706`, `#6B7280`, `#9CA3AF`, `#374151`, `#4B5563`, `#F9FAFB`) are part of the page's dark court-display skin. This is a standalone projection page — the dark palette is intentional design, not a token-bypass violation. Not flagged as P7 (no main-app render with available CSS vars).

**Other pattern checks — PASS.**
No `bind()` cycle — listener accumulation N/A. No Store() usage — N/A. No audience or PDF overlay — N/A.

### Stale CLAUDE.md entries

**REMOVE — Throwdown POA-04 entry:**
> "Loads audience.js but bypasses Audience.init() and Audience.show() — fix in POA-04"

POA-04 is confirmed ✅ Done in PLAN_OF_ACTION.md. AUDIT.md POA-18 confirms Throwdown passes all audience overlay pattern checks. Entry is stale — remove in POA-24.

**REMOVE — Liga Timer.init() entry:**
> "Calls Timer.init() at module level instead of inside bind() — fix in POA-07"

Fixed in POA-20 / v4.2.3. AUDIT.md POA-20 confirms "Timer.init() placement — FIXED". Entry is stale — remove in POA-24.

**KEEP — BBTC: `.hdr` header class (POA-06)** — confirmed present, AUDIT.md POA-19.
**KEEP — BBTC: Audience overlay self-contained (POA-09/16)** — confirmed present, AUDIT.md POA-19.
**KEEP — BBTC: Display name "Brunei" (POA-06/10)** — confirmed present in 5 locations, AUDIT.md POA-19.

### Timer.init() top-level — intentional exception

**Confirmed.** `Timer.init()` is called at line 178, outside any function, immediately after the script tag loads. The standalone timer page has no render/bind cycle — there is no `bind()` function to place it in. The page is fully static after load; `Timer.init()` is called once and never again. This is a **correct and intentional** deviation from the `Timer.init() inside bind()` rule, which applies only to modules with a render/bind cycle. Document in CONVENTIONS.md during POA-24 as the rule's stated exception.

### Fixes applied

**Redundant Escape handler removed from timer/index.html.**
The local `document.addEventListener('keydown', ...)` Escape handler (original lines 190–192) was made redundant by the Escape fix applied to `shared/timer.js` in POA-21 (v4.2.4). Removed to prevent double-firing. Comment on lines 183–184 updated to reflect that Escape is now handled in `timer.js init()`. The `fs-exit` button click handler (`fsExit.addEventListener`) is a separate path and remains intact. Syntax: PASS.

### Still open

**Deferred items carried forward:**
- font-family:system-ui in timer/index.html body — POA-06
- Dashboard direct localStorage (`load()`/`save()` wrappers) — pre-v5.0

## Cross-module summary
*Compiled after POA-22 — five audit sessions complete*

### Patterns appearing in multiple modules

**P7 — Demo card hardcoded hex: Throwdown + BBTC.**
`rSetup()` in Throwdown (line 846) and BBTC (line 640) both render a demo mode card with `#F5F3FF`, `#C4B5FD`, `#6D28D9` inline — should be `var(--pu-bg)`, `var(--pu-bd)`, `var(--pu)`. Liga has no demo card in rSetup (demo is header-button only). Dashboard: no demo card. One QOL pass can fix both affected modules.

**font-family:system-ui across files:**
- BBTC: `.pdf-page` class in local style block (P1) — print compat TBD by POA-06
- timer/index.html: `body` rule in local style block — same deferred v4.1 item
- Throwdown, Liga: not found (clean)
- Dashboard: no local style block (N/A)
POA-06 owns all remaining system-ui replacements.

**bind() listener accumulation on static elements — systemic hygiene debt:**
- Throwdown P3: `render1v1ScoreModal()` and `renderRedemptionScoreModal()` attach listeners outside `bind()`. `sm-cancel` in `bind()` accumulates on every render cycle.
- audience.js S1: `Audience.init()` called every `bind()` cycle stacks a new listener on static `#aud-close` after each render. No `audInited` guard.
Root cause in both cases: static elements that persist across renders receiving re-registration on every render cycle. POA-16 resolves both (modal architecture pass + `audInited` guard in audience.js).

**Direct localStorage bypassing Store():**
- BBTC: `setItem`/`getItem`/`removeItem` — lines 341, 348, 771 (+ migration shim 359–362 in post-POA-19 state). `STORE_KEY` constant partially centralises, but calls are still direct.
- Dashboard: `getItem`/`setItem` — lines 149, 152. Contained in `load()`/`save()` helpers.
Both are v5.0 pre-conditions. Firebase adapter cannot work universally until both migrate to `Store()`.

### Decisions needing CONVENTIONS.md update (POA-24)

- **gates.js API (B3)** — gate pattern (shared/gates.js, render-time touch points, hidden not disabled, stub returns 'paid') agreed in POA-23 but not yet in CONVENTIONS.md. Add gates.js to shared component API section with Throwdown as reference implementation.
- **Storage key format (B2)** — `seduh_{module}_{vN}` format locked in POA-23, enforced via BBTC migration shim in POA-19, but not formally documented in CONVENTIONS.md. Update storage key table.
- **Revival draw label (B4)** — "Wild card" → "Revival draw" in display strings, JS identifiers intentionally left, documented in AUDIT.md but not in CONVENTIONS.md. Add a display-string naming note.
- **Firebase load() sync constraint** — `load()` is synchronous; Firestore cannot fulfil this natively. Design decision (localStorage cache + background sync OR module-level await migration) must be documented before v4.4 Firebase work starts. Add to Persistence section of CONVENTIONS.md.
- **Timer.init() standalone exception** — top-level call is correct for pages with no render/bind cycle. Document explicitly so the rule and its exception are both clear.

### Tech debt flagged across sessions

**Dead code (report-only — safe to sweep in a single pass):**
- D1 Throwdown: `getActiveRound()` — defined, never called (line 322)
- D2 Throwdown: `openScoring()` — defined, never called (line 604)
- D3 Throwdown: `S.bracket.mainPool`, `mergedPool`, `currentRound` — initialised, never used
- D4 Throwdown: `S.matches` — initialised to `[]`, never read or written
- D1 BBTC: `RC[*].time` property — defined on all RC entries, never read
- D2 BBTC: `cfg` variable in `rCreateForm()` — declared, never used
- D3 BBTC: `S.nm.round` — always `'preliminary'`, never mutated
- D1 Liga: `allVoters` in `rScoringBody()` — declared, never read

**Intentional tech debt (B4 scope exclusion):**
- Throwdown JS identifiers (`wildCard`, `b.wildCards`, `pendingWildCard`, etc.) intentionally left with old naming — display strings renamed to "Revival draw", identifiers kept for code clarity. Flagged in AUDIT.md.

**Deferred pattern violations:**
- P3 Throwdown: modal listeners outside `bind()` — defer to POA-16 modal architecture pass
- S1 audience.js: `#aud-close` listener accumulation — defer to POA-16 (`audInited` guard)
- S2 audience.js: `aud-hist` and `aud-ts` missing null guards — defer to POA-16
- P1 BBTC: `font-family:system-ui` in `.pdf-page` — POA-06 (print compat decision)
- P1 timer: `font-family:system-ui` in body — POA-06
- P7 Throwdown + BBTC: demo card hardcoded hex — QOL pass

**v5.0 pre-conditions:**
- BBTC direct localStorage — migrate to `Store()` before Firebase adapter
- Dashboard direct localStorage — migrate to `Store()` before Firebase adapter
- `Store().load()` sync constraint — design decision required before Firebase seam opens
