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
### Dead code
### Pattern violations
### Deferred items confirmed
### Timer.init() placement — confirmed / fixed
### Fixes applied
### Still open / flagged as tech debt

## Shared components — POA-21
### timer.js
### audience.js
### storage.js
### Fixes applied
### Notes for POA-16 audience rebuild

## Dashboard + Timer — POA-22
### Dead code
### Pattern violations
### Fixes applied
### Still open

## Cross-module summary
*Populated after POA-22*
### Patterns appearing in multiple modules
### Decisions needing CONVENTIONS.md update
### Tech debt flagged across sessions
