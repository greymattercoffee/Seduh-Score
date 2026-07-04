# Changelog — Seduh Score

---

## [5.3.2] — Deployment routing, About page, footer fix · July 2026

Fast-follow to v5.3.1, from `COMING-SOON-SPEC.md` Sections 14–17. Makes `coming-soon/index.html`
servable at the bare domain root via a Hosting rewrite, and fixes a dev-artifact footer link.

### coming-soon/index.html (modified)

- **fix:** all shared asset paths changed from relative (`../shared/...`) to root-relative
  (`/shared/...`) — required because the new `firebase.json` rewrite serves this file's
  content at `/`, and the browser resolves relative paths against the request URL, not
  the file's physical location. A relative path that resolved fine at `/coming-soon/`
  would 404 once served at root
- **fix:** header logo link changed from `../index.html` to `/index.html` for the same
  root-relative reasoning (link happened to still resolve correctly either way due to
  path normalization at root, but made explicit for consistency)
- **fix:** footer link was pointing at `../index.html` (would undermine the teaser by
  linking straight to the full platform) — changed to `/about/`, copy changed from
  "Learn more on the main site" to "Learn more about Seduh Score"

### about/index.html (new)

- **feat:** lightweight about page — fetches `/README.md` at runtime and renders it
  client-side via `marked.js` (cdnjs, matching the platform's existing external-script
  convention already used by `booth/`), styled with `shared/theme.css` tokens so headings,
  tables, links, and code blocks read as on-brand rather than a raw markdown dump
  - Falls back to a `<pre>` dump of the raw markdown if `marked` fails to load, and to
    an inline error message if the fetch itself fails — no unhandled blank page either way
- **feat:** simple header (Seduh mark + "About Seduh Score") with a back link to `/`
- **fix:** the README's Modules table overflowed horizontally at the 353px mobile floor
  (395px content vs 353px viewport) — added `display:block;overflow-x:auto` to
  `.about-content table` so wide tables scroll within their own bounds instead of
  pushing the whole page wider
- **note:** no auth, no Firestore — static fetch + render only, as scoped

### firebase.json (modified)

- **feat:** added Hosting rewrite `{ "source": "/", "destination": "/coming-soon/index.html" }`
  so the bare domain serves the teaser once deployed. `index.html` (the real front door)
  is untouched and stays reachable directly at `/index.html` for internal preview
- **note:** Code made this edit only — **deploy is Firdaus's step**, same convention as
  rules deploys. Per the spec's deploy-sequencing note, the rewrite should only go live
  after reviewing `coming-soon/index.html` and `about/index.html` directly (`/coming-soon/`,
  `/about/`) — once deployed, that's the moment the bare domain starts showing the teaser
  publicly

### Verified

- Root-relative asset paths resolve with zero failed network requests when the page is
  loaded directly at `/coming-soon/index.html` (confirms the fix works both there and,
  by the same mechanism, once the rewrite serves it at `/`)
- Real seeded event data (with a live Storage image) renders correctly through the fixed paths
- `/about/index.html` renders the README with full formatting, no raw markdown visible;
  back link navigates correctly
- No horizontal overflow at 353px on `/about/` after the table fix

### Deferred

- Confirming the page renders correctly once the Hosting rewrite is actually deployed and
  `/` is live — blocked on Firdaus running `firebase deploy --only hosting`

## [5.3.1] — Coming Soon teaser + Admin tab refactor · July 2026

Built from `COMING-SOON-SPEC.md`. Two pieces: a new public teaser page, and a structural
refactor of `admin/index.html` to make room for it (and future admin sections) via tabs.

### coming-soon/index.html (new)

- **feat:** self-contained teaser landing page — Seduh mark + "Coming Soon" header,
  `.plat-hdr` convention, tagline "Powering the Brunei coffee scene"
- **feat:** reads `upcoming_events` Firestore collection via `onSnapshot()`, sorted by
  `eventDate` ascending, public read (no auth)
- **feat:** carousel — 5s auto-rotate, opacity crossfade (fade-out/swap/fade-in, 300ms),
  visual timer bar (CSS `transition: width` restarted via forced reflow), manual prev/next
  (resets auto-rotate timer + timer bar), slide counter, left/right arrow key navigation
- **feat:** format badges colour-coded from existing tokens only — Throwdown `--am`,
  Liga `--gn`, Cup Taster `--bl` — no new CSS tokens introduced
- **feat:** offline fallback — successful reads cached to `localStorage` under
  `seduh_upcoming_events_cache`; on Firestore error (including permission-denied before
  rules are deployed), falls back to cache and shows an "Offline mode" indicator, flagged
  stale if the cache is over an hour old
- **verified:** carousel cycles all three format badges correctly on manual nav; no
  horizontal overflow at 353px (`scrollWidth === clientWidth`); offline-mode path
  exercised directly (Firestore rules for `upcoming_events` are not yet deployed — see
  admin section below — so the permission-denied → cache-fallback path is the one that
  actually ran in testing, confirming it works, not just the happy path)

### admin/index.html (modified — structural refactor)

- **refactor:** converted from one long vertically-stacked page into a tabbed layout —
  Organisations (Create Org + Org Management), Platform Switches, Front Door Content
  (Slideshow Manager), Upcoming Events (new). Default active tab on load: Organisations
- **refactor:** every pre-existing section moved as-is into a `.adm-tab-panel` wrapper —
  no internal logic touched, no element IDs/function names/event bindings changed.
  `loadSwitches()` and `loadSlides()` are unchanged functions, just called lazily now
  (on first tab activation) instead of eagerly on auth success — the only timing change
  in the pre-existing code paths
- **feat:** tab bar (`.adm-tabs` / `.adm-tab`) — horizontally scrollable, sticky-underline
  active state, styled to match the admin panel's existing dark palette (mirrors the
  `.mod-tabs`/`.mtab` interaction pattern used in module tab bars, not a new component)
- **feat: Upcoming Events Manager** — new tab content, modelled directly on the existing
  Slideshow Manager: Add Event form (name, date, venue, format select, description,
  optional photo), reuses the same Firebase Storage upload flow (no duplicate upload
  logic), event list sorted by `eventDate` ascending with Edit (prefills form) and
  Delete (confirm-before-delete, same pattern as Slideshow). No manual reordering —
  order is date-driven
- **note:** gated behind the same `super_admin` claim check already enforced on page
  load — no new auth logic added
- **note:** `firestore.rules` was **not** touched in this session — rules for
  `upcoming_events` (public read, `super_admin`-only write) are being handled separately
  by Firdaus per the spec's explicit instruction
- **verified:** tab switching confirmed client-side only (no reload), all pre-existing
  element IDs present and unchanged (checked programmatically against the shipped file),
  tab bar auto-scrolls the active tab into view on narrow viewports, Upcoming Events form
  and list render correctly with the Slideshow Manager's visual conventions preserved.
  Full end-to-end (create/edit/delete against live Firestore, super_admin login) not
  exercised in this session — requires real auth credentials and deployed rules, both
  outside Claude Code's local-files-only scope

### Deferred

- Full mobile check with real (non-placeholder) event images on the teaser page

## [5.3.1-rules] — Firestore + Storage rules for upcoming_events · July 2026

### firestore.rules

- **fix:** added `match /upcoming_events/{eventId}` block — `allow read: if true` (public,
  teaser page needs no auth), `allow write: if request.auth.token.super_admin == true`
  (admin panel is the sole write path). Matches Section 9 of `COMING-SOON-SPEC.md`.
  Deployed by Firdaus via `firebase deploy --only firestore:rules`.

### storage.rules (new) / firebase.json

- **fix:** `admin/index.html`'s Upcoming Events Manager image upload was failing with
  `storage/unauthorized` — Storage security rules existed only in the Firebase console
  (no `storage.rules` file in the repo, no `"storage"` block in `firebase.json`), and the
  console ruleset only had a match block for `slideshow/`, nothing for the new
  `upcoming_events/` path
- **fix:** created `storage.rules` mirroring the existing `slideshow/` pattern
  (`allow read: if request.auth != null`, write/delete restricted to `super_admin`),
  extended with a matching `upcoming_events/{fileName}` block. Public visibility of
  images on the teaser page is unaffected — `getDownloadURL()` URLs carry a bypass
  token, same mechanism that already lets Slideshow images render on the public front door
  despite the auth-gated read rule
- **feat:** wired `"storage": { "rules": "storage.rules" }` into `firebase.json`; added
  `storage.rules` to the Hosting `ignore` list (same treatment as `firestore.rules`) so it
  isn't served as a static file
- **note:** brings Storage rules out of console-only tribal knowledge and into the repo,
  same reconciliation the booth build already did for Firestore rules
- **deployed:** `firebase deploy --only storage` — confirmed working end-to-end,
  Upcoming Events image upload succeeds post-deploy
- **verified:** two events seeded via the admin Upcoming Events tab (with images) appeared
  correctly on `coming-soon/index.html` — confirms the full loop end-to-end: admin write
  → Firestore → `onSnapshot` → teaser carousel render, with the previously-missing
  Firestore + Storage rules now both live

## [5.3.1-booth] — Booth amendment · July 2026

### firestore.indexes.json (new) / firebase.json
- **fix:** the booth display pages' `where('sessionId','==',...) + orderBy('ts'|'timeMs')` listeners on `booth_guess` and `booth_grinder` were failing silently with `failed-precondition: The query requires an index` — no composite index existed for either collection, so `onSnapshot` never fired and nothing ever appeared, refresh or not. Not a code bug; reproduced directly against live Firestore to confirm. Added `firestore.indexes.json` with the two required composite indexes (`booth_guess`: sessionId+ts; `booth_grinder`: sessionId+timeMs) and wired it into `firebase.json`'s `"firestore"` block so it deploys alongside rules going forward
- **deployed:** ran `firebase deploy --only firestore:indexes` against the live `seduh-score` project so this is fixed immediately, not just on the next deploy. Verified end-to-end post-deploy: wrote a real `booth_guess` doc while `booth/display/guess/` was open and watched the bullseye dot, proximity list, and participant count update live via `onSnapshot` with zero page reload; test doc deleted after
- **note:** `firebase.json` was previously flagged off-limits in the original booth build handoff ("Firdaus will handle deploy config separately") — touched this time at explicit request

### booth/guess/index.html
- **investigated, no change required:** the reported "form fields not rendering" symptom did not reproduce against live Firestore data (tested against real `Test01`/`Test_9` session docs with rules deployed). The root cause this handoff describes matches a bug already fixed at the end of the v5.3.0-booth session — an unguarded `await getDoc()` in `boot()` that threw uncaught on a Firestore permission error and prevented `render()` from ever being called. That try/catch fix (`booth/guess/index.html` lines ~164-177) was already in place before this session started. Confirmed working end-to-end: form renders with a valid `?session=` param, submits to `booth_guess`, shows confirmation.
- **feat:** added Phone/WhatsApp and Instagram username fields to the submission form; at least one of the two is required to submit (name + guess validation unchanged); both written to `booth_guess` documents
- **fix:** the phone field was initially `type="tel"`, which renders at a fixed browser-default width instead of filling the container (confirmed via computed style — 217px vs 368px on sibling fields). Changed to `type="text" inputmode="tel"`, which keeps the numeric mobile keypad hint without the layout bug
- **fix:** failed validation used to wipe every field on re-render, since only error state was tracked, not entered values. Added `state.formValues`, populated from the live inputs on every submit attempt and echoed back into the re-rendered form via escaped `value=""` attributes, so a participant who forgets one field doesn't have to retype everything

### booth/setup/index.html
- **feat:** master reset replaced with three distinct danger zone actions — Export Data (JSON download, excludes `beanCount`), Reset Data (purge submissions, preserve session config), End Session (purge submissions + clear localStorage → return to create form)
- **feat:** per-game toggles on session create form — `grinderEnabled` and `guessEnabled` written to session document; success panel shows active games; Guess entry URL / QR and Grinder operator URL filtered by enabled games; missing fields on pre-amendment sessions treated as `true` (verified against real `Test01` doc, which predates this field)
- **note:** all generated URLs (display, guess, grinder) now consistently use a trailing slash (`/booth/guess/?session=...`) to match the directory-style routing the pages already expect
- **feat:** Export Data JSON now includes `phone` and `instagram` per guess entry, alongside `name`/`guess`/`ts`
- **fix:** "Grinder label is required" blocked session creation even with the Grinder Challenge toggle switched off — validation for `grinderLabel` and `beanCount` wasn't reading the toggle state at all. Now `grinderLabel` is only required when `grinderEnabled` is checked, and `beanCount` only when `guessEnabled` is checked; the disabled field's value is written as empty/`0` rather than validated. The corresponding field also hides live when its toggle is switched off, instead of sitting there looking mandatory
- **fix:** the create form reset every typed field and both toggles back to their defaults on any validation error (e.g. unchecking Grinder, then leaving Session ID blank, silently re-checked Grinder on re-render). Added `state.formValues` — same fix pattern as `booth/guess/index.html` — so text fields and toggle states now survive a failed validation pass

### booth/display/index.html
- **refactor:** converted from split-view display to game selector/redirect page; passes session param through to both display links

### booth/display/guess/index.html (new)
- **feat:** full-screen Guess the Bean display — bullseye canvas, ranked proximity list (top 8), live QR code with smooth fade-out on reveal, live participant count, reveal trigger (Spacebar / Enter / tap target), confetti + sound, localStorage fallback (`seduh_booth_guess_display_cache`), `guessEnabled` game-off check
- **fix:** layout corrected to match the original operator sketch — bullseye large on the left (flex 3:2 split), proximity list on the right, instead of the stacked top/bottom layout the amendment handoff's own ASCII sketch had specified. The written handoff and the operator's actual intent had diverged; rebuilt to match intent
- **feat:** added an eyebrow label above the proximity list — "Live guesses · not ranked by accuracy" pre-reveal, "Results" post-reveal — so it's visually obvious the pre-reveal order/labels are intentionally scrambled (sorted by submission time, bands randomly reassigned every update) and not a reflection of actual proximity
- **fix:** the proximity list never actually re-rendered when reveal fired — only the bullseye animation, QR, and participant count did. It would keep showing the scrambled pre-reveal state until some unrelated Firestore update forced a re-render. Added the missing `renderProxList()` call to the reveal-transition branch

### booth/display/grinder/index.html (new)
- **feat:** stub page — full build KIV

## [5.3.0-booth] — Booth mini-games · July 2026

### booth/ (new directory — all files new)
- **feat: booth/setup/index.html** — one-time session configuration; creates Firestore session document; generates QR code for guess entry URL; master reset (batch-deletes all session submissions, resets revealed flag); sessionId persisted to localStorage (`seduh_booth_session`)
- **feat: booth/display/index.html** — full-screen split display; Guess the Bean bullseye (canvas, pre-reveal scatter → post-reveal accurate radial animation); Grinder Challenge live leaderboard; grinder active full-screen override (mirrors operator timer via Firestore flag); reveal trigger (Spacebar / Enter / tap target bottom-right); confetti + sound on reveal; localStorage fallback cache (`seduh_booth_display_cache`)
- **feat: booth/guess/index.html** — mobile-first participant submission form; QR entry path; session state detection (active / revealed / not found); one-submission confirmation screen; onSnapshot to auto-switch to closed state if reveal happens while form is open
- **feat: booth/grinder/index.html** — operator timer; IDLE → RUNNING → PAUSED → RUNNING → STOPPED → SAVED state machine; Firestore flag writes on start/pause/resume/stop (drives display full-screen override); crash recovery from localStorage (`seduh_booth_grinder_recovery`)
- **feat: booth/assets/reveal.mp3** — silent placeholder; replace before deployment
- **feat: Firestore rules** — public read/write on `booth_sessions`, `booth_guess`, `booth_grinder` collections (sessionId-scoped, no sensitive data)
- **note: Firebase stress-test instrumentation** — three onSnapshot listeners on display page; write-per-submission model on guess page; flag-only writes on grinder page (no per-frame writes). Monitor Firebase console during deployment for read/write cost baseline ahead of v5.3.0 throwdown deployment.
- **note: `firestore.rules` did not exist in the repo prior to this session** — created fresh with only the booth rules above. Any rules for `platform/switches`, `slideshow`, or other collections referenced in CONVENTIONS.md's Firebase section are not present in this file and must be reconciled against whatever is actually deployed in the Firebase console before this file is deployed, or those collections will lose their rules.
- **note: header class deviation** — used the existing `.plat-hdr-name` token (real convention, seen in throwdown/liga/bbtc/cup-taster) instead of the handoff's `.plat-hdr-title`, which does not exist anywhere in `shared/theme.css` or any module.

## [docs] — Strategy reconciliation pass · July 2026

**Deviation from prepared brief:** The reconciliation brief was drafted assuming MUA-03 was still the active task and MUA-04 had not started. Reading this CHANGELOG (the mandated ground truth) showed MUA-03 (v5.2.1) and MUA-04 (v5.3.0) both already shipped, and MUA-04's own "Opens" note reserves **v5.4.0** for MUA-07 (not v5.3 as the brief assumed). All version numbers and "next active" pointers below were corrected to match actual shipped state rather than applied literally from the brief.

### ROADMAP.md
- **docs: current state updated to v5.3.0** — header, module table, shared component table all reconciled with CHANGELOG (corrected from brief's assumed v5.2.0)
- **docs: Phase 2 milestones updated** — v4.6 (domain/hosting) and v4.7 (Firebase/admin) marked ✅ complete; Firebase shipped as v4.8.x noted
- **docs: Seduh ID renumbered v6.x** — formerly v5.x; v5.x/v5.4 block consumed by MUA milestone series; Phase 3 content unchanged
- **docs: Master Version Timeline replaced** — all rows updated with accurate status; MUA-03/04 shown shipped (v5.2.1/v5.3.0); MUA-07 reserved at v5.4.0; booth games parallel track added (v5.3.0-booth)
- **docs: repository URL corrected** — GitHub Pages → seduhscore.com via Firebase Hosting
- **docs: Current State table historical notes removed** — audit phase, v4.3.x/v4.4.x completion notes moved to historical record (in CHANGELOG); not needed in current state view

### STRATEGY.md
- **docs: Platform Hierarchy heading updated** — "Pre-Firebase Skeleton" removed; Firebase live annotation added
- **docs: Girls Got Drip section updated** — future tense → past tense; event ran 19 June 2026 at &Coffee Bandar
- **docs: Pricing section updated** — active prices set: BND $18 Per-Event / BND $100 Annual; "too early to decide" language removed
- **docs: BNCC prerequisites note added** — all four gates cleared as of July 2026; conversation unblocked
- **docs: Booth Games section added** — strategic purpose, Firebase validation rationale, architecture decisions, timeline, roadmap placement
- **docs: Strategic Sequencing diagram updated** — reflects current completed and pending states
- **docs: internal Seduh ID version references reconciled to v6.x** — v5.0/v5.1 mentions in Layer descriptions and registration section updated for consistency with the Phase 3 renumbering

### PLAN_OF_ACTION.md
- **docs: POA-17B retired** — marked ✅ retired; scope absorbed into MUA-02 and MUA-03
- **docs: NEXT UP block updated** — MUA-07 (v5.4.0) as active task (not MUA-03 — already shipped); booth games parallel track noted; POA-36 blocked on booth data; POA-37 confirmed closed and moved out of NEXT UP into the done sequence

### PLAN_OF_ACTION_MUA.md
- **docs: version plan table updated** — all shipped phases marked ✅ including MUA-03 and MUA-04 (not previously reflected in the brief); MUA-07 marked as next active task at v5.4.0
- **docs: MUA-02/03/04 sections marked complete** — v5.2.0, v5.2.1, v5.3.0
- **docs: MUA-05 and MUA-06 sections marked complete** — design session and chrome build all shipped
- **docs: sequence block reconciled** — matches CHANGELOG ship order (chrome v5.1.x shipped before handoff/band v5.2.x, ahead of the original dependency-ordered plan); POA-17B retirement noted

### Not touched
No module files, shared files, CONVENTIONS.md, CLAUDE.md, or Firebase config were opened or modified in this session.

### ROADMAP.md — addendum
- **docs: codename table corrected** — Muara and Seria version assignments swapped so thematic fit matches actual content: Muara ("the port — opens outward") now maps to v6.0 (Seduh ID Layer 1 — public registry); Seria ("oil town — infrastructure") now maps to v5.x (MUA milestone series).

---

## [5.3.0] — MUA-04 — Audience view event identity propagation · June 2026

### shared/gates.js

- **feat: `audience_branding` key added to FEATURES registry** — `{ minTier: 'per_event' }`;
  covers Per-Event and Annual tiers. Called by `audience.js` inside `Audience.show()` to
  gate the event identity band. No other change to gates.js.

### shared/audience.js

- **feat: `.aud-event-band` injected in `Audience.show()`** — when handoff v2 is present
  with a non-empty `eventName` AND `Gates.canAccess('audience_branding').allowed`, a
  `.aud-event-band` div is created and inserted as the first child of `#aud-overlay`.
  The band shows the event logo (60px, `object-fit:contain`), event name (white, `--fs-h2`,
  `--fw-bold`), and optional subtitle (`rgba(255,255,255,0.75)`). `bgColor` from handoff
  applied as band background; fallback to `var(--surface-deep)`.
  - Band is removed when conditions are not met (community tier, no `eventName`, or no
    handoff v2). `.aud-event-band` is a new class — no existing `.aud-*` class affected.
- **feat: `_applyHandoff()` updated to accept v2** — previously rejected any handoff where
  `h.v !== 1`; now accepts v1 and v2. Accent and logoUrl extraction unchanged.
- **MUA-04 note:** Handoff is read independently inside `Audience.show()` (not passed by
  caller) — call signature of `Audience.show()` is unchanged.

### Verified

- [ ] `audience_branding` key present in gates.js FEATURES registry
- [ ] Community tier: audience overlay unchanged — no event band visible
- [ ] Per-Event/Annual tier + handoff v2 with eventName: event band visible
- [ ] Logo renders at 60px height in audience context
- [ ] Event name in white, large, high contrast
- [ ] Subtitle in `rgba(255,255,255,0.75)` — readable on projector
- [ ] Band hidden when no eventName (even on eligible tier)
- [ ] bgColor applied as band background when set; fallback to `--surface-deep`
- [ ] No existing `.aud-*` class renamed or removed
- [ ] `Audience.show()` call signature unchanged in all modules

### Opens

MUA-07 — PDF branding (v5.4.0). Confirmed 30 Aug deployment target for Throwdown module.

---

## [5.2.1] — MUA-03 — Event band populated across all modules · June 2026

### shared/eventconfig.js

- **feat: `applyToModule()` — event band DOM population** — extended to populate
  `#event-band` from internal state variables on every call. When `_eventName` is
  non-empty: builds and injects the full band structure, then removes `data-empty`
  to show the band. When `_eventName` is empty: clears innerHTML, restores
  `data-empty` to hide the band.
  - **`.eb-logo`** — `<img class="eb-logo">` injected as the first child when
    `_logoUrl` is non-null (the session-only blob URL from logo upload). Omitted
    when no logo is uploaded. `alt` is `"<eventName> logo"`. Sized by the
    `.eb-logo` CSS rule already in theme.css (46px–64px height, `cqw` units).
  - **`.eb-name`** — always present when `_eventName` is non-empty; escaped via
    `_esc()`.
  - **`.eb-sub`** — injected only when `_eventSubtitle` is non-empty.
  - **`.eb-meta`** — injected only when `eventDate` or `eventVenue` is present in
    `seduh_event_v1` (read via `_readDashboard()` at call time); fields joined by
    ` · ` and escaped via `_esc()`.

### Module files (throwdown, liga, bbtc, cup-taster)

- **No changes** — all four modules already had `EventConfig.mount()` in their boot
  sequence and `#event-band` in the DOM from MUA-06b/c. Logic lives entirely in
  `shared/eventconfig.js` as specified.

### Verified

- All four modules (Throwdown, Liga, BBTC, Cup Taster): event band populates
  correctly when `eventName` is set in the organiser dashboard
- `data-empty` removed on band show; restored on band hide — CSS `display:none`
  rule fires correctly
- **`.eb-logo` wired** — `<img class="eb-logo">` renders from `_logoUrl` when
  a logo is uploaded; absent when no logo is set. This is confirmed shipped in
  `applyToModule()` — not deferred to a later session.
- Name, subtitle, meta all present in DOM; meta fields joined with ` · `
- `--event-bg` applied to band background from `bgColor`
- No horizontal overflow at 353px (band fills full width, `overflow:hidden` clips
  long text to ellipsis)
- No JS errors across all four modules

### Opens

MUA-04 session — audience view identity propagation (v5.3.0).
Open only after this commit is verified on dev.

---

## [docs] — CONVENTIONS.md audit pass · June 2026

### CONVENTIONS.md
- **docs: directory tree updated** — added admin/, audience/, cup-taster/ modules; added gates.js, auth.js, eventconfig.js, firebase.js to shared/ listing
- **docs: B1 rule updated** — version horizon removed; approved post-B1 shared files listed
- **docs: storage key table completed** — Cup Taster (seduh_cup_taster_v1) and Audience config (seduh_aud_config_v1) added
- **docs: Audience BBTC row corrected** — ✅ reflecting POA-16 migration (v4.6.0); Cup Taster row added
- **docs: audInited debt note removed** — POA-16 shipped audInited guard in v4.6.0
- **docs: Audience.show() signature updated** — podium param and Audience.showPodium() documented
- **docs: stub-behaviour bullet removed from gates.js** — Firebase live since v4.8.0
- **docs: FEATURES registry corrected** — audience_links split into concluded/snapshot (v4.6.0); liga/cup_taster module-access keys removed (Option A, v4.4.3); audience_branding and pdf_branding added (pending MUA-04/07)
- **docs: eventconfig.js handoff v1 + v2 shapes documented** — v2 is MUA-02 target shape
- **docs: MUA chrome button classes documented** — .mod-toolbar / .tb-* / .ms-* classes added
- **docs: Git section updated** — GitHub Pages → Firebase Hosting; live URL corrected to seduhscore.com
- **docs: Firebase section rewritten** — live stack table, Cloud Functions, auth pattern, storage seam note
- **docs: font-family follow-up removed** — POA-06 resolved in v4.3.0
- **docs: footer last-updated line refreshed**

---

## [5.2.0] — MUA-02 — Handoff v2 + EventConfig extension · June 2026

### shared/eventconfig.js

- **feat: handoff bumped to v2** — `writeHandoff()` now writes all 8 fields:
  `v`, `accent`, `logoUrl`, `bgColor`, `eventName`, `eventSubtitle`, `eventDate`, `eventVenue`.
  `eventDate` and `eventVenue` sourced from `seduh_event_v1` (were omitted in v1).
- **feat: v1 → v2 migration in `mount()`** — if `seduh_handoff` in sessionStorage has `v:1`,
  it is upgraded in-place to v2 shape; missing fields filled with safe defaults
  (`bgColor: null`, `eventName: ''`, `eventSubtitle: ''`). Old `accent` and `logoUrl` survive.
  Upgraded v2 written back to sessionStorage immediately.
- **feat: `applyToModule()` — `--event-bg` CSS variable** — if `bgColor` is non-null, writes
  `--event-bg` to `:root`; if null, removes it. Consumed by `.event-band` via
  `var(--event-bg, transparent)` already in theme.css (MUA-06a).
- **feat: `applyToModule()` — `--event-logo-url` CSS variable** — writes logo URL to `:root`
  as `--event-logo-url` when logo is present; removes it when cleared. Available for
  `.event-band` consumption in MUA-03. Logo remains session-only (blob URL, not persisted).
- **feat: `_eventName` and `_eventSubtitle` internal state** — new module-level vars; restored
  from `seduh_event_v1` on `mount()`; synced back to `seduh_event_v1` on every change.
- **feat: `_bgColor` internal state** — new module-level var; restored from `seduh_event_v1`
  on `mount()`; synced back on every change.
- **feat: `_readDashboard()` + `_saveToDashboard()` helpers** — read/write `seduh_event_v1`
  from localStorage; `_saveToDashboard` merges partial updates (no destructive overwrites).
- **feat: component UI extended** — `_render()` now shows five sections in order:
  Competition name (text input), Subtitle (text input, placeholder `"Category | City Year"`),
  Accent colour (10-swatch palette, unchanged), Band background (10-swatch palette + null "–"
  option, independent of accent), Event logo (upload + preview, unchanged).
- **feat: accent persistence** — accent swatch click now also calls `_saveToDashboard({ accent })`
  so the chosen accent survives across browser sessions via `seduh_event_v1`.
- **refactor: `_esc()` helper** — new internal function for HTML attribute escaping used
  in `_render()` for text field values.
- **refactor: `_buildSwatches()` helper** — extracted swatch row builder; shared by accent and
  bgColor sections; `withNone` flag adds the null "–" button for bgColor only.

### index.html
- No changes — "Make it your own" drawer was removed at v4.5.0 when `index.html` became the
  platform front door. `eventconfig.js` mounted in each module's Setup tab is the functional
  equivalent; `eventName`, `eventSubtitle`, and `bgColor` UI is now managed there.

### Storage
- `seduh_event_v1` (localStorage) extended: `eventName`, `eventSubtitle`, `bgColor`, `accent`
  now written by the eventconfig component on every change. `eventDate` and `eventVenue` remain
  read-only from this session (written by the old dashboard; migrated fields — not yet re-exposed
  in UI; to be confirmed in MUA-03).
- `seduh_handoff` (sessionStorage) now v2: all 8 fields present. Old v1 handoffs upgrade
  gracefully on next `mount()` call.

### Verified
- All 8 handoff fields written correctly with expected types and defaults
- v1 handoff upgrades to v2: old `accent` and `logoUrl` survive; new fields default to safe values
- `--event-bg` CSS variable set/removed correctly on bgColor change
- `--event-logo-url` CSS variable set/removed correctly on logo upload/clear
- Component UI renders: eventName, eventSubtitle inputs; accent + bgColor swatches; logo upload
- `applyToModule()` called on every field change (name, subtitle, accent, bgColor, logo)

### Opens
MUA-03 session — event band populated in all modules (v5.2.1).
Open only after this commit is verified on dev.

---

## [5.1.2] — BBTC, Liga, Cup Taster chrome migrated to MUA toolbar · MUA-06c · June 2026

### bbtc/index.html
- **feat: `.mod-toolbar` replacing `.hdr-btns` action rail** — Timer and Audience as `.tb-pri` pill buttons; Export PDF, Export CSV as `.tb-sec` outline pills; Reset as `.tb-reset`; `fitToolbar()` overflow into `#more-sheet`
- **feat: `#event-band`** — empty slot with `data-empty`; ready for MUA-07 event wiring
- **feat: `.mod-tabs` sticky tab bar** — five tabs (Setup / Prelims / Bracket / History / Standings); `measure()` sets correct sticky offset; active tab scrolled into view
- **feat: `doReset()` extracted** — resets via `localStorage.removeItem(STORE_KEY)` (BBTC uses raw localStorage, not `Store()` wrapper)
- **refactor: `.app`** — added `container-type:inline-size`
- **removed: `.plat-hdr` flex-wrap override** — superseded by shared rule in theme.css v4.9.1; local `.hdr-s`/`.hdr-t` title classes retained (deferred rename to POA-06)
- **removed: `.hdr-btns` / `.hdr-btn` / `.btn-am` / `.btn-bl` / `.btn-gn` / `.btn-rd`** local CSS blocks

### liga/index.html
- **feat: `.mod-toolbar` replacing `.hdr-btns` action rail** — Timer/Audience as `.tb-pri`; Save/Load/Demo as `.tb-sec`; Podium as `.tb-sec-podium` (conditional on `Gates.canAccess('audience_enhanced')` + matches done); Reset as `.tb-reset`
- **feat: `#event-band`** — empty slot with `data-empty`
- **feat: `.mod-tabs` sticky tab bar** — five tabs (Setup / Schedule / Standings / Final / Report); active tab scrolled into view; long title "Liga Seduh Bawah Tanah" verified no overflow at 353px
- **feat: `doReset()` extracted** — resets via `STORE.clear()`
- **refactor: `.app`** — added `container-type:inline-size`
- **removed: `.hdr-btns` / `.hdr-btn` / `.btn-gn-lg` / `.btn-pu-lg`** local CSS blocks

### cup-taster/index.html
- **feat: `.mod-toolbar` replacing `.hdr-btns` action rail** — Timer/Audience as `.tb-pri`; Save/Load/Demo as `.tb-sec`; Reset as `.tb-reset`; `fitToolbar()` overflow into `#more-sheet`
- **feat: `#event-band`** — empty slot with `data-empty`
- **feat: `.mod-tabs` sticky tab bar** — dynamic tab set (3–5 tabs: Setup / Heats / Standings / [Semis] / [Finals] / Report); `measure()` scrolls active tab into view when tabs appear/disappear across competition flow
- **feat: `doReset()` extracted** — resets via `STORE.clear()`; restores `hid`/`cid` counters and clears heat timer interval
- **refactor: `.app`** — added `container-type:inline-size`
- **removed: `.hdr-btn` / `.hdr-btns`** local CSS

### Verified at (all three modules)
- Mobile (353px): Timer + Audience primary; secondary buttons overflow to More; correct count badge; sheet pre-populated with correct items
- Tablet (768px): full toolbar fits inline, no More button
- Desktop (1024px): full toolbar fits inline, no More button
- Cup Taster: active tab scrolled into view with 5-tab layout (demo loaded to semis stage)

### v5.1 complete
MUA-06 (Chrome build) fully shipped: CSS (MUA-06a) + Throwdown (MUA-06b) + BBTC/Liga/Cup Taster (MUA-06c).

---

## [5.1.1] — Throwdown chrome migrated to MUA toolbar · MUA-06b · June 2026

### throwdown/index.html
- **feat: `.mod-toolbar` replacing `.hdr-btns` action rail** — Timer and Audience as always-visible `.tb-pri` pill buttons; Save, Load as `.tb-sec` outline pills; Reset as `.tb-reset` (red, inline); Podium as `.tb-sec-podium` (green, conditional on `Gates.canAccess('audience_enhanced')` + bracket done)
- **feat: `fitToolbar()`** — measures available toolbar width on every bind/resize; hides overflow `.tb-sec` buttons and shows `⋯ More` badge with hidden-count; `chromeInited` guard prevents scroll/resize listener accumulation across re-renders
- **feat: `#more-sheet` bottom sheet** — overflow actions rendered into `.ms-list` by `buildSheet()`; opens/closes via `openSheet()`/`closeSheet()`; scrim tap closes sheet
- **feat: `#event-band`** — empty slot with `data-empty` (hidden); ready for MUA-07 event wiring
- **feat: `.mod-tabs` sticky tab bar** — three tabs (Setup/Bracket/History); `measure()` sets `top` to `plat-hdr.offsetHeight` for correct sticky offset; active tab scrolled into view; `.stuck` shadow on scroll past header
- **refactor: `doReset()`** — extracted from inline `onclick`; wired via `bind()`
- **refactor: `.app`** — added `container-type:inline-size` (C2 spec; enables `.eb-logo` `cqw` units when event band is populated)
- **removed: `.hdr-btns` / `.hdr-btn`** local CSS — superseded by shared `.mod-toolbar` rules; no visual regression

### Verified at
- Desktop (1024px): all toolbar items visible inline, Reset on right, no More button
- Mobile (353px): Timer + Audience as primary pills; Save/Load/Reset collapsed to `⋯ 3` More button; no horizontal overflow

---

## [5.1.0] — MUA Chrome Components · CSS only — modules wired in MUA-06b/c · MUA-06a · June 2026

### shared/theme.css
- **feat: MUA Chrome Components section added** — new clearly-labelled section placed after the audience overlay v4.6 block and before print rules. Contains five component blocks:
  - **`.event-band`** — top event identity strip; `.event-band[data-empty]` hides when no event is configured; `.eb-logo`, `.eb-text`, `.eb-name`, `.eb-sub`, `.eb-meta` sub-elements
  - **`.mod-toolbar`** — primary + secondary action row; `.tb-primary` / `.tb-pri` pill buttons with amber accent; `.tb-secondary` / `.tb-sec` outline pills; `.tb-sec-podium` green variant; `.tb-reset` red destructive; `.tb-more` overflow menu button (default `display:none` — JS-controlled via `fitToolbar()`)
  - **`.mod-tabs`** — sticky tab bar (`z-index:55`, scroll-shadow via `.stuck`); `.mtab` tab buttons with `.on` accent underline; `.mtab .cond` purple badge for conditional tabs
  - **`.sheet-scrim` / `.more-sheet`** — bottom-sheet overflow menu with grab handle, `.ms-grab`; `.ms-list` / `.ms-item` / `.ms-ic` / `.ms-cap`; `.ms-divider` section label; `.ms-reset` red variant; `.ms-podium` green variant
  - **C2 comment** — spec note that `container-type:inline-size` for `.eb-logo`'s `cqw` units is added per-module in MUA-06b/c
- **C1 implemented** — `@media (min-width:600px)` block shows `.tb-more .word` label on wider viewports
- No existing token, class, or overlay rule touched; regression guard confirmed (373/373 brace balance)

### Deferred to MUA-06b / MUA-06c
- `container-type:inline-size` on module outermost wrappers (per-module, reads actual markup)
- MUA chrome markup wired into module HTML files

---

## [4.9.1] — MUA-01b Mobile touch targets and overflow patches · June 2026

### shared/theme.css
- **fix: `flex-wrap:wrap` on `.plat-hdr`** — header wraps on narrow viewports instead of overflowing; Throwdown, Liga, and Cup Taster benefit; BBTC already had this locally (no conflict)
- **fix: `min-height:44px` on `.btn-p`** — primary button meets 44px minimum tap target; existing padding unchanged
- **fix: `min-height:44px` on `.btn-o`** — outline button meets 44px minimum tap target; existing padding unchanged
- **fix: `min-height:44px` on `.tbtn`** — tab buttons meet 44px minimum tap target
- **fix: `.p-rm` touch target** — new rule in theme.css: `display:inline-flex; align-items:center; justify-content:center; min-height:44px; min-width:44px`; local module rules retain visual appearance (no `display` set locally, no conflict); applies to Throwdown, Liga, and Cup Taster remove buttons

### throwdown/index.html
- **fix: event info grid responsive** — replaced inline `grid-template-columns:1fr 1fr 1fr` with `.ev-info-grid` class; at ≥480px: 3 columns; at <480px: 2 columns (name + date on row 1, venue below)

### liga/index.html
- **fix: scoring row responsive** — at <480px: `.sc-row` collapses from `140px 1fr 1fr` to `1fr 1fr`; `.sc-label` spans full width as a row above the two inputs (`grid-column:1/-1`); label remains visible, no markup change

### cup-taster/index.html
- **fix: `.sc-trio-btn` height** — `height:38px` → `height:44px`; width stays 42px (horizontal button, height is the tap dimension)

### bbtc/index.html
- **fix: `.btn-rd` touch target** — `min-height:44px` added to local override
- **fix: `.btn-sc` touch target** — `min-height:44px` added
- **fix: `.btn-ed` touch target** — `min-height:44px` added
- **fix: `.sb` score button** — `width:38px;height:34px` → `width:44px;height:44px`

### index.html
- **fix: `.mod-info-btn` tap area** — `width:22px;height:22px` → `width:44px;height:44px`; `display:grid;place-items:center` retains icon centring

---

## [4.9.0] — Customisation Engine Phase B · Module UI accent · June 2026

### shared/eventconfig.js
- **feat: EventConfig.applyToModule()** — new public method; overrides `--accent` and `--am` CSS variables on `:root` with organiser's chosen accent colour; reverts to theme defaults when accent is cleared
- **feat: live accent updates** — swatch click, logo upload, and logo clear each call `applyToModule()` then `writeHandoff()`; module UI updates instantly on every organiser change
- **feat: sessionStorage restore on mount** — `EventConfig.mount()` reads existing `seduh_handoff` from sessionStorage before rendering; restores `_accent` so accent branding survives page reload within the same browser session
- **deferred: org logo in module header** — logo slot implementation deferred to a dedicated Design session; `applyToModule()` logo block commented out; no logo markup in module headers

### throwdown/index.html · liga/index.html · cup-taster/index.html · bbtc/index.html
- No changes — logo slot markup was added then removed in this session; files unchanged from v4.8.1

---

## [4.8.1] — Front door slideshow · Slideshow Manager · Firebase Storage · June 2026

### shared/firebase.js
- **feat: Firebase Storage added** — `getStorage()` imported and initialised alongside existing auth and Firestore instances; Storage instance exported for use by admin panel Slideshow Manager

### admin/index.html
- **feat: Create Org section** — new section above Org Management; email + password inputs; "Create Account" button calls `createUserWithEmailAndPassword`; shows UID on success; clears form and pre-fills Find field; triggers `findOrg()` after 1000ms delay to allow Admin SDK propagation
- **feat: Slideshow Manager** — new section below platform switches; organiser can upload images to Firebase Storage, reorder slides via up/down controls, and delete slides; slide list reads from and writes to Firestore `slideshow` collection; changes reflected on front door on next load
- **fix: password input styling** — `input[type="password"]` added to the shared CSS selector group; now matches email and datetime-local field styling

### index.html
- **feat: front door slideshow** — full-bleed hero image carousel fed from Firestore `slideshow` collection; images served from Firebase Storage; auto-rotates every 5 seconds with CSS crossfade transition; graceful fallback (container hidden) on fetch error or empty collection
- **feat: secret admin link** — 5-click sequence on `.plat-hdr-logo` within 2 seconds navigates to `admin/index.html`; IIFE keeps click counter and timer out of global scope; no visual feedback on any click; `e.preventDefault()` suppresses default logo-link reload; works regardless of auth state
- **fix: org zone cards reflect actual tier** — `data-gate` attributes added to all four `fd-dmod` cards (`throwdown_redemption`, `btc`, `liga_unlimited`, `cup_taster_unlimited`); `.fd-dmod.locked` CSS added (opacity 0.4, lock indicator via `::before`); `seduh:gates-ready` listener calls `Gates.canAccess()` per card and toggles `locked` class; cards default to locked state before auth resolves
- **feat: org zone card navigation** — each `fd-dmod` card navigates to its respective module on click; BBTC card checks `Gates.canAccess('btc')` before navigating and shows an inline gate message if access is denied
- **fix: free tools panel hidden when logged in** — `[data-auth="in"] .fd-panel { display: none }` added to local style block; CSS-only
- **fix: header tagline spacing** — `.plat-hdr-sub { margin-left: 0.5rem }` added to local style block; breathing room between "Seduh Score" wordmark and "Coffee competition platform" tagline

### liga/index.html
- **fix: `seduh:gates-ready` listener added** — `firebase.js` and `auth.js` loaded before `</body>`; `window.addEventListener('seduh:gates-ready', () => render(), { once: true })` added after initial `render()` call; gated features now reflect auth state on fresh navigation without manual refresh

### cup-taster/index.html
- **fix: `seduh:gates-ready` listener added** — same pattern as Liga; listener added after `init()` call (which calls `render()` internally); `firebase.js` and `auth.js` loaded before `</body>`

### Known issues (still open)
- `cup_taster_module` platform switch — confirmed working correctly on live site after Firestore rules fix; no code change required. Closed.

---

## [4.8.0] — Firebase Auth + Admin Panel · June 2026

### shared/firebase.js (new file)
- **feat: Firebase app init** — Firebase JS SDK v10 modular; initialises app, auth, and Firestore instances
- **feat: IndexedDB persistence** — `enableIndexedDbPersistence()` enabled for offline competition-day reliability; graceful fallback on unsupported browsers or multiple tabs

### shared/auth.js (new file)
- **feat: onAuthStateChanged** — drives `[data-auth]` attribute on `<html>`; replaces simulated toggle; org chip populated with `user.email` on login
- **feat: Gates.init() call** — called after login and after every token refresh via `onIdTokenChanged`; dispatches `seduh:gates-ready` custom event on `window` after init resolves
- **feat: cold-start offline banner** — 5s timeout on page load; non-blocking, dismissible; cleared immediately when auth state resolves
- **feat: expiry soft warning** — 60s interval checks `Gates.isExpired()`; amber banner on expiry; session continues uninterrupted; clears interval after firing
- **feat: redirect hook** — Option A (stay on front door) active; hook comment planted for future Option B migration

### shared/gates.js
- **feat: Gates.init(user)** — new public method; reads `subscription_tier` and `subscription_expiry` from Firebase token claims; reads `platform/switches` from Firestore `platform/switches` document; caches both for session; called by `auth.js` only
- **feat: Gates.isExpired()** — new public method; returns true if `_expiry` is set and in the past; called by `auth.js` expiry monitor
- **feat: getTier()** — stub replaced; reads `_tier` from claims; returns `'community'` if expired
- **feat: isEnabled()** — stub replaced; reads `_switches` from Firestore cache; platform-switch-only features require explicit `true`; tier-gated features enabled unless explicitly `false`
- **fix: offline default** — `_tier` defaults to `'community'`, `_switches` to `{}`; unauthenticated users get Community access only; fail-open for cached sessions
- **canAccess() API unchanged** — zero module changes required

### index.html
- **feat: real Firebase auth** — Email/Password login wired to existing `[data-auth]` markup; login form live; sign out functional
- **feat: session persistence** — Firebase default `local` persistence; session survives tab close and browser restart; explicit sign-out only
- **feat: inline login errors** — five error states mapped to plain-language messages; no `alert()` calls; form fields retain values on error

### throwdown/index.html
- **feat: firebase.js + auth.js loaded** — module-scoped `<script type="module">` tags added before `</body>`
- **feat: seduh:gates-ready listener** — `{ once: true }` re-render listener added after module-init `render()` call; ensures gated features reflect auth state on fresh navigation without manual refresh
- **feat: throwdown_redemption gate** — `Gates.canAccess('throwdown_redemption')` added to `rSetup()` and `rBracket()`; redemption card and lucky loser bracket UI hidden for community tier
- **feat: throwdown_revival gate** — `Gates.canAccess('throwdown_revival')` added to `rSetup()` and `rBracket()`; revival draw card and bracket UI hidden for community tier

### admin/index.html (new file)
- **feat: super_admin access control** — `onAuthStateChanged` checks `super_admin` custom claim on load; redirects to front door if not super admin
- **feat: org management** — find org by email via `getOrgByEmail` Cloud Function; displays UID, current tier, expiry in BNT (UTC+8)
- **feat: set access window** — tier selector (Community / Per-Event / Annual) + date range inputs; writes via `setOrgClaims` Cloud Function
- **feat: revoke now** — sets `subscription_expiry` to current Unix timestamp minus one second
- **feat: platform switches** — reads `platform/switches` Firestore document; toggle buttons for `cup_taster_module` and `audience_links_live`; writes on toggle with inline "Saved." confirmation

### Firebase Cloud Functions (new — backend, us-central1 Gen 2)
- **feat: setOrgClaims** — HTTPS callable; verifies `super_admin` claim; sets `subscription_tier` + `subscription_expiry` custom claims via Admin SDK
- **feat: getOrgByEmail** — HTTPS callable; verifies `super_admin` claim; returns UID + current claims for a given email

### Firestore
- **feat: platform/switches document** — created with initial state `cup_taster_module: true`, `audience_links_live: false`
- **feat: security rules** — authenticated read on `platform/switches`; super_admin write only; all other collections denied

### Known issues (non-blocking for August — tracked for follow-up)
- `seduh:gates-ready` pattern not yet applied to `liga/index.html` or `cup-taster/index.html`
- `cup_taster_module` platform switch displaying inverted in admin panel
- Create org account not present in admin panel — use Firebase Console → Add user as workaround
- Free tools panel visible when org is logged in
- Org zone module cards do not reflect actual tier access
- Gated features may persist mid-session after token revoke (next cold start enforces correctly)
- Report tab not yet built in Throwdown

---

## [4.7.0] — Organiser customisation engine · POA-17 Phase A · June 2026

### shared/eventconfig.js (new file)
- **feat: EventConfig.mount()** — renders accent picker and logo upload into a module-provided `#event-config-slot` element. CSS injected once per session via `<style id="ec-styles">` injection guard.
- **feat: EventConfig.writeHandoff()** — writes `{ v:1, accent, logoUrl }` to sessionStorage key `seduh_handoff` at audience-show time. Silent; no return value.
- **feat: accent palette** — 10 accents: Seduh Amber (default), Espresso, Slate, Cobalt, Emerald, Ruby, Midnight, Copper, Matcha, Alien. Exact hex values locked in ACCENTS constant.
- **feat: logo upload** — FileReader base64 conversion, 350KB post-encoding size cap, inline error message, preview with clear button. Session-only — not persisted to localStorage.
- **feat: CSS injection guard** — styles injected once per session regardless of how many modules mount the component.

### shared/audience.js
- **feat: _applyHandoff()** — reads `seduh_handoff` from sessionStorage at `Audience.show()` call time. Applies accent and logoUrl to `_cfg`. Version-checked (`v:1`), try/catch guarded. Silent on missing or malformed handoff.
- **feat: event logo in overlay header** — `_cfg.logoUrl` rendered as `<img id="aud-logo">` in `.aud-hdr-right` when present (enhanced gate). Hidden when null. `#aud-logo` element confirmed present in all four module overlays.

### throwdown/index.html
- **feat: event config integration** — `eventconfig.js` loaded after `gates.js`; `#event-config-slot` mounted at end of Setup tab; `EventConfig.mount()` called in `bind()` after `Audience.init()`; `EventConfig.writeHandoff()` called as first line of `showAudience()`.

### liga/index.html
- **feat: event config integration** — `eventconfig.js` loaded after `gates.js`; `#event-config-slot` mounted at end of `rSetup()`; `EventConfig.mount()` called in `bind()` after `Audience.init()`; `EventConfig.writeHandoff()` called as first line of `showAudience()`.

### cup-taster/index.html
- **feat: event config integration** — `eventconfig.js` loaded after `gates.js`; `#event-config-slot` mounted at end of `rSetup()`; `EventConfig.mount()` called in `bind()` after `Audience.init()`; `EventConfig.writeHandoff()` called as first line of `showAudience()`.

### bbtc/index.html
- **feat: event config integration** — `eventconfig.js` loaded after `gates.js`; `#event-config-slot` mounted at end of `rSetup()`; `EventConfig.mount()` called in `bind()` after `Audience.init()`; `EventConfig.writeHandoff()` called as first line of `showAudience()`.

### CONVENTIONS.md
- **docs: eventconfig.js documented** — approved second post-B1 shared file; API, handoff contract, and mount pattern documented in Shared component APIs section.

---

## [4.6.1] — Dashboard module info modal · June 2026

### index.html
- **feat: module info modal** — ℹ button added to each module card (Throwdown, Barista Team Championship, Liga Seduh, Cup Taster) in both the free quick-launch panel and the org platform grid. Clicking opens a modal panel showing organiser-facing module information.
- **feat: README-driven content** — modal fetches `README.md` on first open (one request, cached). Extracts the anchored `<!-- MODULE:key --> … <!-- /MODULE:key -->` block for the clicked module and renders it as HTML. No external parser.
- **feat: minimal markdown renderer** — inline renderer handles `##` → `<h3>`, `###` → `<h4>`, `**bold**` → `<strong>`, blank lines → paragraph breaks. HTML comment lines stripped.
- **feat: offline fallback** — fetch failure or missing anchor shows fallback link to `greymattercoffee.github.io/Seduh-Score`.
- **feat: modal close** — × button, backdrop click, and Escape key all dismiss the modal.
- **fix: version line** — footer version tag updated from `v4.5` to `v4.6.1`.

---

## [4.6.0] — Audience view rebuild · POA-16 · June 2026

### shared/audience.js (full rebuild)
- **feat: `audInited` guard** — `Audience.init()` is now idempotent; safe to call on every render cycle. Mirrors `Timer.init()` pattern.
- **feat: dark/light theme toggle** — `_toggleTheme()` toggles `.aud-dark`/`.aud-light` on `#aud-overlay`. Choice persisted to `seduh_aud_config_v1` localStorage key; restored on next session.
- **feat: `projectionMode` + `accentColour` persistence** — `_saveConfig()`/`_loadConfig()` write/read `{ projectionMode, accentColour }` to `seduh_aud_config_v1`. `logoUrl` intentionally excluded (blob URLs are ephemeral).
- **feat: podium mode** — `Audience.showPodium()` triggers full-screen podium takeover (dark locked). Champion centred, 1st Runner Up left, 2nd Runner Up right. `#aud-podium-back` returns to `_lastState`. Enhanced tier only.
- **feat: `moduleTag` param** — `Audience.show()` accepts `moduleTag` string for round/stage badge in overlay header.
- **feat: `podium` param** — `Audience.show()` accepts podium data array; stored as `_podiumData` for `showPodium()`. Does not auto-trigger podium mode.
- **feat: dual/single panel logic** — `lbHTML` present → dual panel (42/58 split); absent/null/empty → single panel (results fills full width).
- **feat: overlay state tracking** — `_currentState` tracks one of `hidden`, `lite`, `enh-dark`, `enh-light`, `enh-single-dark`, `enh-single-light`, `podium`.
- **feat: `Audience.setEventConfig()`** — merges partial config into `_cfg`; persists `projectionMode` + `accentColour`.

### shared/theme.css
- **feat: `--aud-accent` token** — added to `:root`. Default `var(--accent)`; overridden per-event via inline style on `#aud-overlay`.
- **feat: `.aud-round-pre/qf/sf/fin` classes** — round-colour badge classes for audience history rows.
- **feat: v4.6 audience overlay CSS** — full layout block: `.aud-hdr`, `.aud-content`, `.aud-lb-panel`, `.aud-hist-panel`, `.aud-toggle-btn`, `.aud-close-btn`, `#aud-podium-panel`, `.aud-podium-tile`, `.aud-podium-rank-1/2/3`. Dark/light theming via `.aud-dark`/`.aud-light` on `#aud-overlay`. Dual/single panel via `.aud-dual`/`.aud-single`. Responsive: ≤640px collapses to single column, results above standings.

### shared/gates.js
- **feat: audience link gate split** — `audience_links` key replaced by `audience_links_concluded` (`minTier: 'community'`) and `audience_links_snapshot` (`minTier: 'per_event'`). `audience_links_live` (`minTier: null`) retained as platform switch.

### throwdown/index.html (migration)
- **feat: new overlay markup** — replaced old banner/body structure with v4.6 markup (`aud-hdr`, `aud-content`, `aud-hist-panel`, `aud-podium-panel`).
- **feat: podium data** — `showAudience()` builds podium array from final/SF results when bracket is complete; passes to `Audience.show()`.
- **feat: podium button** — "🏆 Podium" button added to header when `audience_enhanced` gate passes and bracket is done; calls `Audience.showPodium()`.

### liga/index.html (migration)
- **feat: new overlay markup** — replaced old banner/body structure with v4.6 markup (dual panel: `aud-lb-panel` + `aud-hist-panel`, plus `aud-podium-panel`).
- **feat: podium data** — `showAudience()` builds podium from Liga Final result when available, falls back to live standings.
- **feat: podium button** — "🏆 Podium" button added when `audience_enhanced` gate passes and at least one match is done; calls `Audience.showPodium()`.

### bbtc/index.html (migration — POA-09)
- **feat: migrate to shared audience.js** — removed self-contained `#aud-overlay` HTML block, local audience CSS, and local audience JS. Now loads `shared/audience.js` and calls `Audience.init()` / `Audience.show()`.
- **feat: `rAudienceLbHTML()`** — preliminary standings rendered as lbHTML string (inline hex per CONVENTIONS.md exception).
- **feat: `rAudienceHistHTML()`** — match history with `.aud-round-*` round-colour classes.
- **note: BTC podium deferred** — `Audience.showPodium()` not wired in this build. Podium data model documented in AUDIENCE-SPEC.md §5.3b.

### cup-taster/index.html (migration)
- **fix: overlay markup** — replaced old banner/body structure (`aud-banner`, `aud-title-block`, `aud-module-tag`) with v4.6 markup (`aud-hdr`, `aud-content`, `aud-podium-panel`).
- **fix: remove dead `aud-lb-panel` visibility code** — `bind()` no longer manually toggles the LB panel by ID; `Audience.show()` owns panel visibility.

### audience/index.html (new file)
- **feat: remote viewer stub** — new `audience/` page with four URL states: `?state=pre` (holding page), `?state=live` (event in progress), `?state=concluded` (final results), `?state=none` (no event). Default: `pre`. Firebase TODO hooks planted at all three integration points. `#aud-remote-updated` present in DOM; always hidden pre-Firebase. Light/paper base, mobile-first, single-panel layout.

---

## [4.5.1] — Changelog cleanup · June 2026

### CHANGELOG.md
- **fix(changelog): Firebase milestone `v4.6` → `v4.7` in v4.3.2 stub-behaviour line; v4.5.0 entry completed** — missing `feat(theme)`, `fix(gates)`, and Firebase milestone items added.

---

## [4.5.0] — Platform front door · Jerudong · June 2026

### index.html (replaced — dashboard launcher → platform front door)
- **feat: platform front door** — `index.html` replaces the old dashboard launcher with the new public-facing platform front door. Single-file, no build step (CONVENTIONS B1). Loads `shared/theme.css` + `shared/gates.js` only.
- **feat: four free tools** — Throwdown Basic, Liga Basic, Cup Taster Basic, Timer. All four links in the free quick-launch panel; no account required.
- **feat: org platform zone** — warm dark section (`--surface-deep`) with module cards (Throwdown full, BBTC Annual, Liga Seduh full, Cup Taster full) and embedded login UI. Firebase v4.7 will wire up real auth.
- **feat: featured event ribbon** — full-bleed upcoming event showcase (architectural slot — update copy per event).
- **feat: auth state simulation** — `[data-auth]` visitor/org toggle on `<html>`. Default state: visitor (`data-auth="out"`). Clicking Sign in sets `data-auth="in"` — org chip appears, login form replaced by signed-in confirmation. Sign out returns to visitor state. No persistence pre-Firebase (by design).

### CONVENTIONS.md
- **fix(conventions): Firebase Auth milestone corrected to v4.7** — Gates section comment previously said "v4.6"; corrected to "v4.7". v4.6 = custom domain + Firebase Hosting (still static); v4.7 = Firebase Auth + admin panel. Comment text only — no logic changed.

### shared/theme.css
- **feat(theme): `--surface-deep` token suite** — warm near-black palette addition for the org platform zone.

### shared/gates.js
- **fix(gates): remove `liga` + `cup_taster` module-access keys** — Option A free tier; module entry free for all tiers, only in-module premium features gated.
- **fix: Firebase Auth milestone corrected to v4.7** — stub-behaviour comment in `gates.js` updated (`v4.6` → `v4.7`); also in CONVENTIONS.md and CHANGELOG v4.3.2 entry.

---

## [4.4.4] — Module entry gate removal · June 2026

### liga/index.html
- **Remove module entry gate** — `Gates.canAccess('liga')` call was already absent (never added to this file). Liga Basic is free to enter for all users. Premium feature gates (`liga_unlimited`, `liga_device_tracking`, `liga_csv_export`) remain intact inside the module.

### cup-taster/index.html
- **Remove module entry gate** — removed `Gates.canAccess('cup_taster_module')` check from `init()` that rendered a "coming soon" placeholder and blocked render. Cup Taster Basic is now free to enter for all users. Internal feature gates (`cup_taster_unlimited`, `cup_taster_report`, `cup_taster_analytics`) remain intact.

---

## [4.4.3] — gates.js cleanup · June 2026

### shared/gates.js
- **Remove `liga` + `cup_taster` module-access keys** — Option A free tier decision: module entry is free for all tiers; only premium features within each module are gated. Removing these keys means `Gates.canAccess('liga')` and `Gates.canAccess('cup_taster')` now return `{ allowed: false, reason: 'disabled' }` (unknown key). Expected and temporary — Session 3 removes those calls from the module files before this merges to main.
- **Fix Firebase milestone comments: v4.6 → v4.7** — v4.6 = custom domain + Firebase Hosting (still static); v4.7 = Firebase Auth + admin panel (when the stub is actually replaced). Three comment occurrences updated; no logic changed.

---

## [4.4.2] — Deep surface token suite · June 2026

### shared/theme.css
- **`--surface-deep` token suite** — nine additive tokens for warm near-black palette: `--surface-deep`, `--deep-card`, `--deep-bd`, `--deep-bd2`, `--deep-ink`, `--deep-ink2`, `--deep-sub`, `--deep-ink3`, `--deep-ink4`. Warm near-black palette addition for org zone and future audience view. No existing token renamed or removed.

---

## [4.4.1] — Cup Taster analytics additions · June 2026

### cup-taster/index.html
- **Score distribution panel** — new card in Report tab (inside `cup_taster_analytics` gate),
  above per-contestant breakdown. Shows frequency and share % for each correct-count score,
  derived from prelims heats only (full-field view). Hidden if no prelims heats are confirmed.
- **Avg time/set** — per-contestant breakdown table now shows `~Xs/set` as a second line
  within each stage cell. Computed as `Math.round(elapsedSecs / trioCount)`. Blank for
  contestants who maxed out (timer expired).
- **Hardest trio callout** — a `.hint` paragraph below each per-trio difficulty table
  identifies the trio with the lowest identification rate. Ties named explicitly:
  "Hardest sets: Trio 2, Trio 5 — both at 33%".
- **CSV export additions** — standings section gains `Avg/set(s)` column (`max` for timed-out
  contestants); a `Score Distribution (Prelims — full field)` section appended after standings,
  before trio difficulty. Trio difficulty section unchanged.
- **`rankStandings()` bug fix** — `prev._pos` was read from the unmapped input array (always
  undefined beyond the first tied row). Fixed by tracking `lastPos` in a closure; all
  contestants in a tie now correctly inherit the shared position.

---

## [4.4.0] — Cup Taster module · June 2026

### cup-taster/index.html (new module)
- **Cup Taster** — blind trio sensory identification competition. Contestants taste
  three cups (2 identical, 1 different origin or lot) per trio and identify the odd cup.
- **Gate check** — `Gates.canAccess('cup_taster_module')` called before any UI renders;
  "coming soon" placeholder shown if `allowed: false`. Module-level IIFE, render never
  called unless gate passes.
- **State:** `DEFAULT_STATE()` factory; storage key `seduh_cup_taster_v1`;
  `_module:'cup_taster'` guard on JSON import.
- **Heat partition algorithm** — `partitionField(N)`: `Math.ceil(N/4)` heats, distributed
  as evenly as possible (4+4=8, 4+3=7, 3+3=6, etc.). Verified against the spec table.
- **Local heat timer surface** — full-width master countdown + per-contestant stop buttons.
  Shared `Timer.open()` NOT used for heat timing. `heatTimerInterval` survives re-renders;
  restarted in `bind()` if active heat is still in timing mode. Timeout auto-maxes all
  untapped contestants. Warning colour activates at ≤60 s remaining.
- **Scoring entry** — trio toggle buttons (✓/✗, cycling true/false) per contestant.
  Confirm active when every contestant has at least one trio entered. Edit link re-opens
  confirmed heat for correction (times preserved, `done` cleared).
- **`resolveHeat(heat)`** — pure function, single source of truth for all standings,
  analytics, report, and audience views. Never stores derived data.
- **`calcStandings(stage)`** — sorts by correct desc → time asc. `rankStandings()` assigns
  shared positions to tied rows.
- **Stage tabs** — dynamic: `Setup · Heats · Standings · [Semis] · [Finals] · Report`.
  Semis and Finals tabs unlock progressively as heats are generated for those stages.
- **Advancement** — `computeAdvancement()` includes all tied rows at the cutoff position.
  Tied cutoff flagged with amber ⚠ badge. Confirmation generates next-stage heats and
  switches to the new stage tab.
- **Audience view** — `Audience.show()` with dual-panel (enhanced gate) or single-panel
  (community). Inline hex throughout both `rAudienceLbHTML()` and `rAudienceHeatHTML()`.
- **Gates checked:** `cup_taster_module` (module visibility), `cup_taster_analytics`
  (per-contestant + per-trio breakdown), `cup_taster_report` (report tab),
  `cup_taster_unlimited` (8-contestant cap), `audience_enhanced` (dual-panel audience).
- **Report tab** — champion banner, event summary (identification rate, stages run),
  per-contestant breakdown (Analytics A), per-trio difficulty ordered easy→hard (Analytics B),
  CSV export (standings + difficulty). Gated behind `cup_taster_report`.
- **Demo mode** — `buildCupTasterDemo()` / `loadCupTasterDemo()`. 7 contestants (Amir,
  Bella, Cyrus, Dana, Elena, Faris, Greta). Prelims: 2 heats, all confirmed; Cyrus maxed
  on time; Faris + Greta tie. All 7 advance to semis (N < cutoff). Semis Heat 1 confirmed;
  Semis Heat 2 active in scoring entry mode with partial trio results.
- **Conventions:** `Timer.init()` first line of `bind()`; `Audience.init()` in `bind()`;
  no hardcoded hex in module CSS (audience overlay excepted); gate pattern hidden not
  disabled; sentence case copy throughout.

### index.html (dashboard)
- Cup Taster card added: `live: false`, `href: 'cup-taster/index.html'`. Set to
  `live: true` when `cup_taster_module` platform switch is confirmed on.

---

## [4.3.2] — shared/gates.js stub · canAccess() API · feature registry · June 2026

### shared/gates.js (new file)
- **`Gates.canAccess(featureKey)` API created** — the sole method modules ever call.
  Returns `{ allowed: true }` or `{ allowed: false, reason: 'tier' | 'disabled' }`.
- **FEATURES registry** — documents all known feature keys and their `minTier` values:
  module access keys (`btc`, `liga`, `cup_taster`), Throwdown gated features,
  Liga Seduh gated features, Cup Taster gated features, Audience features,
  and platform-switch-only keys (`cup_taster_module`, `audience_links_live`)
  with `minTier: null`.
- **Internal stubs** — `getTier()` returns `'annual'`, `isEnabled()` returns `true`,
  `tierRank()` maps tier strings to rank integers. None exported — gates.js internal use only.
- **Stub behaviour** — all `canAccess()` calls return `{ allowed: true }` through v4.5.
  Replaced by Firebase custom claims + Firestore platform-switch reads in v4.7.
- No user-facing changes.

### All modules (index.html, throwdown, liga, bbtc)
- **`<script src="[../]shared/gates.js"></script>` added** — script tag inserted after
  `storage.js` in Throwdown and Liga; after `timer.js` in BBTC (no `storage.js` in BBTC);
  as the sole external shared script in the dashboard. Gates is loaded but not yet called —
  Throwdown is the reference implementation for first gate touch points.

---

## [4.3.1] — Timer overlay structural consistency · POA-07 · June 2026

### throwdown/index.html
- **Footer button classes added** — `#tmr-close` and `#tmr-fs` now carry
  `class="tmr-close"` and `class="tmr-fs-btn"` respectively, matching the
  BBTC reference pattern. Previously these buttons had `id` attributes only.

### timer/index.html
- **`.tmr-extras` wrappers added** — presets and custom time input now live
  inside a first `<div class="tmr-extras">`; controls and footer inside a
  second. Matches the two-wrapper structure used by BBTC, Throwdown, and Liga.
  No change to fullscreen behaviour (driven by `#tmr-overlay.fs`, not the
  wrapper divs).

---

## [4.3.0] — v4.1 completion pass: favicons · .plat-mark · fonts · BBTC rename · POA-06 · June 2026

### All modules (index.html, bbtc, throwdown, liga, timer)
- **Favicon block added** — all five files now link `favicon.svg`, `favicon-32.png`,
  `favicon-16.png`, and `apple-touch-icon.png` from `shared/assets/`. No favicon
  links existed in any file before this session.
- **`.plat-mark` brand mark integrated** — the Seduh brew-waves SVG is now inlined
  in every module header, replacing the plain amber rail (`plat-hdr-ac`, `hdr-ac`,
  `liga-ac`, `timer-hdr-ac` elements). SVG recolours via `currentColor`; styled by
  `.plat-mark` and `.plat-mark svg` rules already in `theme.css`.

### bbtc/index.html
- **`.hdr` → `.plat-hdr`** — CSS class renamed to match platform convention;
  `.hdr-ac` CSS rule removed (element replaced by `.plat-mark`).
- **`font-family:system-ui,sans-serif` → `var(--font-body)`** in `.pdf-page` class.
  CSS variables are supported in modern print contexts — print compat confirmed.
- **BBTC rename: "Brunei" removed from all display strings (5 locations):**
  - `rMain()` header eyebrow: `hdr-s` → "Seduh Score"
  - Audience overlay `aud-sub`: "Brunei" → "Seduh Score"
  - PDF footer: "Brunei Barista Team Championship" → "Barista Team Championship"
  - PDF page eyebrow (both pages): "Brunei" → "Seduh Score · Grey Matter Coffee Werks"
    (platform credit added — POA-06 CHECK 8)
  - CSV header row: "Brunei Barista Team Championship" → "Barista Team Championship"
  - JS identifiers (`BBTC`, `bbtc`), storage key (`seduh_bbtc_v3`), and file paths
    unchanged.

### timer/index.html
- **`font-family:system-ui,...` → `var(--font-body)`** on `body` rule in local
  style block. Dark court-display context confirmed compatible with CSS variable.

---

## [4.2.5] — Dashboard + Timer: POA-22 audit · June 2026

### timer/index.html
- **Redundant local Escape handler removed** — the `document.addEventListener('keydown', ...)`
  Escape handler (former lines 190–192) was made redundant by the Escape fix added to
  `shared/timer.js init()` in v4.2.4. Removed to prevent double-firing on the standalone
  timer page. The `fs-exit` button click handler remains (separate exit path). Comment
  updated to note that Escape is now handled in `timer.js init()`.

### AUDIT.md
- Dashboard + Timer section populated (POA-22). Dashboard findings: no dead code; direct
  localStorage at lines 149/152 in `load()`/`save()` helpers (only two calls, flagged pre-v5.0);
  `seduh_event_v1` confirmed as sole storage key; no local `<style>` block (font-family N/A).
  Timer findings: no dead code; `font-family:system-ui` on `body` flagged for POA-06;
  dark-theme hex intentional (projection context); `Timer.init()` top-level confirmed as
  intentional exception to bind() rule.
- Stale CLAUDE.md entries identified for POA-24 removal: Throwdown POA-04 audience entry
  (resolved in v3.x, confirmed clean POA-18) and Liga Timer.init() entry (fixed POA-20).
- Cross-module summary populated — five audit sessions complete. Summary covers: P7 demo hex
  (Throwdown + BBTC), system-ui font-family (BBTC + timer), bind() accumulation debt
  (Throwdown modal + audience.js aud-close), direct localStorage (BBTC + dashboard);
  four CONVENTIONS.md updates queued for POA-24; full tech-debt register compiled.

---

## [4.2.4] — Shared components: POA-21 audit — Escape key fix · June 2026

### shared/timer.js
- **Escape key to exit timer overlay fullscreen** — CHANGELOG v3.5.2 documented
  this as "Added to shared/timer.js init()" but the handler was absent from the
  file. `timer/index.html` had its own local Escape handler; BBTC covered it in
  `initTimer()`. Throwdown and Liga had no keyboard exit path for timer overlay
  fullscreen. Fixed by adding `document.addEventListener('keydown', e => { if
  (e.key === 'Escape') ovl()?.classList.remove('fs'); })` inside `init()`,
  covered by the `inited` guard. Optional chaining on `ovl()` is a no-op on the
  standalone timer page.

### AUDIT.md
- Shared components section populated (POA-21). Findings: D1 Escape key absent
  from timer.js (fixed); S1 audience.js aud-close listener accumulation (deferred
  to POA-16); S2 null guard gaps on aud-hist and aud-ts (deferred to POA-16).
  storage.js interface confirmed clean — load() sync is the one design decision
  for v5.0 Firebase seam; BBTC and dashboard bypass Store() directly and must
  migrate before Firebase adapter ships.

---

## [4.2.3] — Liga Seduh: POA-20 audit — Timer.init() fix · June 2026

### liga/index.html
- **Timer.init() placement fix** — `Timer.init()` was called at module
  level (outside any function), violating CONVENTIONS.md which requires
  it inside `bind()`. Moved to first line of `bind()`. Timer.init() is
  idempotent (inited guard no-ops after first call) so this is safe.
  Closes the known POA-07/CLAUDE.md quirk for Liga Seduh.

### AUDIT.md
- Liga section populated (POA-20). Findings: 1 dead-code item (D1
  allVoters unused in rScoringBody), 0 pattern violations beyond
  Timer.init(). Header already uses .plat-hdr (correct — unlike BBTC).
  No font-family:system-ui found. No demo-card hex (P7) found.
  Storage key seduh_liga_v1 confirmed. on() guard confirmed.
  Audience overlay hex confirmed hardcoded (correct).

---

## [4.2.2] — BBTC: POA-19 audit — B2 storage key migration · June 2026

### bbtc/index.html
- **B2 storage key migration: `bbtc_v3` → `seduh_bbtc_v3`** —
  `STORE_KEY` constant updated. One-time load-path shim IIFE placed
  immediately before `loadState()`: reads `bbtc_v3` from localStorage,
  copies to `seduh_bbtc_v3`, removes old key. Silent on all subsequent
  loads. Aligns BBTC with the locked key format (`seduh_{module}_{vN}`)
  from POA-23.

### AUDIT.md
- BBTC section populated (POA-19). Findings: 3 dead-code items
  (D1 RC.time unused, D2 cfg unused in rCreateForm, D3 nm.round always
  preliminary), 2 pattern violations (P1 system-ui in pdf-page, P7
  demo card hex). All deferred items from POA-06/09/10 confirmed
  present. POA-05 follow-up: all 73 hex replacements verified correct —
  no var() tokens in overlay/PDF contexts.

---

## [4.2.1] — Throwdown: POA-18 audit — B4 rename · June 2026

### throwdown/index.html
- **B4 rename: "Wild card" → "Revival draw" in all display strings** —
  Setup card header, checkbox label, hint text, bracket pending
  banner, pending button, reveal banner, and adjacent code comments
  updated. 8 strings changed total. JS identifiers (`wildCard`,
  `b.wildCards`, `pendingWildCard`, `skipWildCard`, etc.) left
  unchanged — flagged as tech debt in AUDIT.md.

### AUDIT.md
- Throwdown section populated (POA-18). Findings: 4 dead-code items
  (D1–D4), 2 pattern violations (P3 modal listeners, P7 demo hex),
  all deferred items from POA-12 and POA-15 confirmed present and
  correct, storage key `seduh_throwdown_v1` confirmed.

---

## [4.2.0] — Throwdown: redemption round rework · June 2026

### throwdown/index.html
- **Redemption round: 1v1v1 group model** — redemption
  matches now support N brewers per group (organiser-set,
  default 3, max 4). Match structure changed from
  { t1, t2, votes1, votes2 } pairs to
  { brewers[], votes{}, tiebreaker, winner } groups.
- **New Setup field: Brewers per group** — number input
  (2–4, default 3), visible when redemption is enabled.
  Stored as S.redemptionGroupSize.
- **New scoring modal: group vote** — N vote buttons per
  match, one per brewer. Running tally visible. Confirm
  active when all judges have voted.
- **Tiebreaker panel** — fires inline when no brewer
  holds a strict majority. Shows only tied brewers.
  Single tiebreaker judge tap resolves. Sets
  match.tiebreaker and match.winner.
- **Lucky loser source updated** — non-winners now
  sourced from match.brewers excluding match.winner
  across all redemption groups. UI unchanged.
- **Demo data updated** — Redemption Round 1 match
  objects converted to new { brewers[], votes{},
  tiebreaker, winner } structure.
- **Unchanged:** main bracket rounds (1v1), wild card
  revival, 3rd place match, cap logic,
  phase: 'redemption' identifier.

---

## [4.1.4] — BBTC: palette alignment · June 2026

### bbtc/index.html
- **Local `:root` override removed** — BBTC now inherits all design tokens from
  `shared/theme.css`. Removed overrides: `--am`, `--am-h`, `--am-bg`, `--am-bd`,
  `--bl`, `--bl-bg`, `--bl-bd`, `--gn`, `--gn-bg`, `--gn-bd`, `--rd`, `--rd-bg`,
  `--rd-bd`, `--bg`, `--surface`, `--border`, `--border2`, `--txt`, `--txt2`,
  `--txt3`, `--rad`, `--rad-s` (22 properties + `font-family` declaration).
- **Hardcoded hex values replaced** — 73 instances of cool-grey hex values replaced
  with warm platform values across module CSS, audience overlay CSS, PDF overlay CSS,
  and JavaScript inline styles. Key substitutions:
  `#6B7280`/`#9CA3AF` → `#8a7f73` (--txt3),
  `#E5E7EB` → `#efe9de` (--border2),
  `#F3F4F6`/`#F9FAFB` → `#f3efe8`/`#faf7f1` (--bg / --surface2),
  `#065F46` → `#0b7a52` (--gn),
  `#6EE7B7` → `#8fd9b8` (--gn-bd),
  `#ECFDF5`/`#D1FAE5` → `#e6f6ee` (--gn-bg),
  `#D97706` → `#b45309` (--am, accent contexts),
  `#111827` → `#211a14` (--txt),
  `#374151` → `#4d443c` (--txt2).
  Module CSS rank circles updated to `var(--rank-1/2/3)`.
- **Visual result** — BBTC now uses the warm coffee palette consistent with
  Throwdown, Liga Seduh, and the Dashboard. Cool-grey divergence (POA-05) resolved.

---

## [4.1.3] — Throwdown: manual bracket duplicate prevention · June 2026

### throwdown/index.html
- **Fix: Duplicate names possible in manual bracket slots** —
  dropdowns now disable already-used names in other slots
  immediately on selection, without re-rendering the grid
  (preserves focus). `refreshManualSelects()` loops all
  `.ms-sel` elements and toggles `option.disabled` based
  on current selections.
- **Fix: No duplicate validation on Start** —
  `startManualBracket()` now checks for duplicate name
  assignments before any state mutations. Alerts with the
  conflicting names and returns without starting if
  duplicates are found.

---

## [4.1.2] — Throwdown: audience view improvements · June 2026

### throwdown/index.html

- **Audience view: round section dividers** — match results are now grouped
  by round label. Each group has a centred round badge flanked by two thin
  coloured rule lines, with white space between groups. Improves readability
  at projection size — rounds are immediately scannable without reading every
  row.
- **Audience view: colour saturation boosted** — `audCol()` hex values
  increased across all round types for projector output. Winner score now
  takes the round's saturated colour (grey/blue/amber/green/purple) rather
  than flat amber; loser score renders in light grey. Winner name changed
  to near-black `#1C1917` for maximum contrast on projected screens. Round
  badge removed from individual match rows — appears once per group as the
  section header only.

---

## [4.1.1] — Throwdown: manual bracket assignment · June 2026

### throwdown/index.html

- **New feature: Manual bracket assignment** — new "Bracket mode" toggle in
  Setup. When enabled, organiser sets a slot count independently of participant
  count and assigns names to slots via dropdowns before starting the bracket.
  Designed for draw-a-number formats where seeding is physical.
  - `generateManualBracket()` creates Round 1 with empty pairs and sets
    `b.phase = 'manual-setup'`
  - Bracket tab shows slot assignment grid: each pair has two dropdowns
    pulling from `S.participants`. Already-selected names are disabled in
    other slots to reduce duplicate assignment.
  - `startManualBracket()` resolves nulls on Start: one name + empty → bye;
    t2-only slots swap to t1 first; fully empty pairs are dropped. Guards
    against starting with zero valid pairs.
  - All downstream bracket logic (advancement, redemption, wild card, 3rd
    place) is unchanged — manual mode only affects Round 1 seeding.
- **Known limitation at release (fixed in v4.1.3):** Dropdowns did not
  re-render on change — duplicate assignments were possible and
  `startManualBracket` did not validate for duplicates. Both fixed in v4.1.3.

---

## [4.1.0] — Throwdown: 3rd place, lucky loser, wild card fixes · June 2026

### throwdown/index.html

**New features**
- **3rd place match** — new Setup toggle. When enabled, the two semi-final losers
  play a 3rd place match immediately before the Final. Winner/loser shown in the
  champion banner as 🥈/🥉. Bracket render uses blue 🥉 badge and `roundColour`
  handles the `third` phase.
- **Lucky loser draw** — when a redemption cap is set and the redemption round
  yields fewer winners than the cap (e.g. odd-pool bye), the bracket pauses for a
  manual draw from the remaining redemption losers. `drawLuckyLoser()` picks one
  at random per tap; `continueAfterLuckyLoser()` merges the full revived pool and
  advances. Draw and continue UI panels rendered inline in the bracket view.

**Bug fixes**
- **Fix: 3rd place silently dropped on wild card skip** — `skipWildCard()` did not
  contain the 3rd place injection logic that exists in `advanceBracket()`. When
  wild card fired at the semi-final stage and the organiser skipped it, the Final
  was pushed directly with no 3rd place match even if the toggle was on. Fixed by
  adding the equivalent `thirdPlace` guard block to `skipWildCard()`.
- **Fix: Wild card reveal banner replaced bracket** — wild card drawn banner used
  `out = … + out` which wiped completed bracket rounds. Changed to `out +=`.
- **Fix: `isCurrent` was index-based** — active slot highlight used
  `ri === b.rounds.length - 1` which broke when 3rd Place and Final are pushed
  together (both need to be scoreable). Changed to `!isRoundComplete(round)` so
  any incomplete round in any position renders as active.

---

## [4.0.2] — CSS Audit & theme.css cleanup · June 2026

### shared/theme.css
- Three separate `:root` blocks consolidated into one canonical block —
  section comments preserved for readability
- Version comment added: `/* Seduh Score — theme.css v4.1 — audited June 2026 */`
- **Dead token removed:** `--rad-xs` — confirmed unused across all modules
- **9 orphan classes removed:** `.plat-hdr-module`, `.chip-num`, `.chip-rm`,
  `.inf-v`, `.inf-l`, `.badge-am`, `.badge-bl`, `.badge-rd`, `.badge-gn` —
  confirmed unused across all modules
- `border-radius:99px` literal replaced with `var(--rad-pill)` across 9
  selectors within theme.css — no module files touched
- All `.tmr-*` / `.aud-*` / `#pdf-overlay` overlay classes and print rules
  confirmed intact — 80/80 verification pass
- Net: 95 tokens in single `:root` block; 1 token removed, 9 classes removed

---

## [4.0.1] — Timer fixes · June 2026

### Shared
- **Fix: Timer horn inaudible** — time's-up horn was synthesised at 100–150 Hz,
  below the range most laptop and phone speakers reproduce. Raised to 330 Hz
  (square) / 247 Hz (sawtooth) so it carries on any device.
- **Fix: Last-10-seconds flash not showing on standalone timer page** —
  `theme.css` sets `#tmr-overlay { display:none; position:fixed }` for the
  popup overlay pattern used by BBTC and Throwdown. The standalone
  `timer/index.html` never overrode this, so the timer element was hidden
  entirely. Added CSS overrides in `timer/index.html` to keep the timer
  always-visible and in page flow (`position:static`), switching to full-screen
  fixed only when the `.fs` class is applied.
- **Timer warning state hardened** — `running` class is removed during the
  warning window so the red flash can never be overridden by the amber running
  colour.

### Liga Seduh
- **Fix: Timer audio missing** — `liga/index.html` was loading `timer.js` but
  not `sound.js`. Beep (last 10 s) and horn (time's up) now fire correctly.

---

## [4.0.0] — Liga Seduh · June 2026

### liga/index.html (new module)
- **Liga Seduh Bawah Tanah** — full round-robin league module
- Setup: event info, brewer roster (add/remove), rounds with ceiling validation
  (`floor((N−1)/2)`), device list management
- Schedule generator: randomised greedy with retry (up to 5000 attempts),
  no-repeat pair constraint, duo fairness rotation; N mod 3 determines
  triads/duos per round
- Scoring: `resolveMatch()` pure function handles all cases — 2-1-0 clean,
  3-0-0 sweep (revote for 2nd/3rd), 1-1-1 deadlock (tiebreaker judge + revote),
  duo 2-0/1-1, solo walkover; amber ⚖ TB badge on judge-broken matches
- Standings: live league table sorted Pts → W → Votes; `--rank-1/-2/-3` medal
  tokens for top 3
- Final tab: locked until all regular matches are done; auto-selects top 3;
  cutoff-tie detection triggers RPS picker with checkboxes; 5-vote pool
  (3 brewer + 2 external judge); Final result does not alter league table
- Report tab: champion result, frozen league table, device usage summary
  (matches/wins per device, per-brewer device history), per-brewer season
  summary, CSV export
- Audience view: `Audience.show()` with live standings and current-round
  matchups; inline hex throughout (no CSS var cascade into overlay)
- Demo mode: 8-brewer mid-season state (2 of 3 rounds done) including a sweep,
  a deadlock, and a duo
- JSON save/load with `_module:'liga'` guard; storage key `seduh_liga_v1`

### index.html (dashboard)
- Liga Seduh card set to `live:true`, `href:'liga/index.html'`
- Module count updates to 3 live

---

## [3.6.0] — Design System v4.1 (partial) · June 2026

### shared/theme.css
- Formalised token system — additive only, all v4.0 contract tokens unchanged
- New named foundations: type scale (`--fs-*`), weights (`--fw-*`), tracking/leading
  (`--ls-*`/`--lh-*`), spacing (`--space-1`→`--space-10`), layout (`--container`,
  `--container-narrow`, `--focus-ring`), border widths (`--bw-*`)
- New semantic tokens: `--rank-1/-2/-3` (leaderboard medals), `--gmcw-teal/-ink/-grey`
  (Grey Matter Coffee Werks parent palette), `--text-*` aliases over `--ink*`
- New surface/border tokens: `--ink2/3/4`, `--surface2/3`, `--border/2/3`, `--am-soft`
- Brown-tinted shadow tokens (`--shadow-sm/-md/-lg`) formalised — warm paper, never
  cold grey
- `.plat-mark` class added — header lockup slot for inline Seduh brew-waves SVG mark;
  `.plat-hdr-ac` rail retained for back-compat
- Typography helper classes added: `.eyebrow`, `.mono`, `.label`, `.hint`, `.empty`
- All `.tmr-*` / `.aud-*` / `#pdf-overlay` overlay classes preserved verbatim

### shared/assets/ (new folder)
- `seduh-mark.svg` — Seduh brew-waves brand mark (single colour, `currentColor`)
- `favicon.svg`, `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png` — favicon set

### CONVENTIONS.md
- Design System v4.1 section added: new token tables, brand mark usage rules,
  voice/copy conventions, updated regression guard, known follow-ups

### Deferred to v4.1 completion (post Liga Seduh)
- `.plat-mark` header markup integration across all module files
- Module inner `font-family:system-ui` → platform type system

---

## [3.5.3] — Jun 2025

### Standalone Timer
- **Custom timer input** — type any duration in minutes and press Set (or Enter) to load it. Preset buttons remain for quick access; custom value clears them. Hides in fullscreen mode.

---

## [3.5.2] — Jun 2025

### BBTC
- **Fix: Timer listener accumulation** — all static timer element listeners (close, fullscreen, presets, start/pause/reset, display-tap) moved out of `bind()` into a new one-time `initTimer()` call. Previously, switching tabs re-ran `bind()`, which re-registered the `tmr-fs` toggle listener — after any tab switch the toggle fired twice per click and cancelled itself, making fullscreen impossible to enter or exit.
- **Fix: Timer Escape key** — Escape now exits the BBTC timer overlay fullscreen mode (handled in `initTimer()`).

### Shared
- **Fix: Timer Escape key** — Escape exits fullscreen in Throwdown and the standalone timer page. Added to `shared/timer.js` `init()` — no-op on standalone (overlay element absent, optional chaining guards).
- **Fix: timer.js null guard** — `tmr-fs` click now uses optional chaining (`ovl()?.classList.toggle`) to prevent a silent TypeError on the standalone timer page where `#tmr-overlay` does not exist.

---

## [3.5.1] — Jun 2025

### Shared
- **Fix: Timer fullscreen display-tap** — tapping the large timer display exits fullscreen mode. Works on all devices including mobile (no keyboard required). `cursor:pointer` added to `.fs` display rule in `theme.css`. Listener added in `shared/timer.js` (covers Throwdown); `bbtc/index.html` has its own equivalent handler in `initTimer()`.
- **Standalone Timer page** — `timer/index.html` added. Loads `shared/timer.js` and `shared/theme.css`. Default 7 min preset. Fullscreen court display with Escape key and `fs-exit` button. Grey Matter Coffee Werks credit in header. Passive entry point to Seduh Score platform via footer link.

---

## [3.5.0] — Jun 2025

### BBTC
- **JSON Save/Load** — `⬇ Save` and `⬆ Load` header buttons. Exports full state as a timestamped `.json` file; imports with `_module:'bbtc'` guard to prevent cross-module contamination. `mid` and `jid` counters included in export. `DEFAULT_STATE`-style merge on import for safe state restoration.

### Shared
- **audience.js** — `aud-lb` guard added (prevents duplicate leaderboard panel).

### Platform
- **Dashboard redesigned** — permanent Grey Matter Coffee Werks / Firdaus Omar lockup in header and footer. "Make it your own" slide-over: competition name, subtitle, date, venue, accent colour (6 coffee tones, amber default), logo upload, 3 cover layouts (Band / Editorial / Ticket). Persists to `seduh_event_v1`.
- **Theme refreshed (v4.0 design system)** — strict superset of previous theme. Token names preserved (`--txt*`, `--am*`, `--bl*`, `--gn*`, `--rd*`, `--pu*`, all `.tmr-*` and `.aud-*` classes). Values warmed up. New tokens added for dashboard (`--ink*`, `--surface2/3`, `--border3`, `--am-soft`, `--accent*`, `--rad-xs`, font vars). Modules inherit new look with zero markup changes.

---

## [3.1.1] — Jun 2025

### BBTC
- **Home button** — added ← Home to the header. Navigates back to the dashboard, matching Throwdown behaviour.
- **Fix: Finalise handler invalid tab** — `fin` handler had three consecutive `S.tab=` assignments from iterative edits; the first set tab to `'matches'`, a key that does not exist in BBTC. Collapsed to a single expression: bracket match → `'bracket'`, prelim → `'prelims'`, fallback → `'prelims'`.

---

## [3.1.0] — Jun 2025

### BBTC
- **Fix: Judge selection broken on create match form** — stray semicolon in `rCreateForm()` cut off judge pill buttons from the DOM silently. Fixed.
- **Fix: Demo button non-functional** — `load-demo` handler was never registered in `bind()`. Fixed.
- **Fix: Demo card on wrong tab** — demo card was injected into Bracket tab instead of Setup. Fixed.
- **PDF round grouping** — match results table now has a coloured section header per round (Preliminary = grey, QF = blue, SF = amber, Finals = green).
- **Audience view label** — corrected from "Standings" to "Preliminary Standings".
- **Audience view match colour coding** — result rows tinted and tagged by round.
- **Edit button on completed bracket matches** — consistent with preliminary match card behaviour.
- **Demo mode** — Setup tab. 8 teams, 3 judges, 12 prelim matches, QF in progress. Confirms before overwriting live data.

### Throwdown
- **7 min timer preset** — added for Girls Got Drip format.
- **Redemption cap** — max number revived from redemption pool. `0` = no limit.
- **Wild card revival** — optional per-round toggle. Randomly revives one loser after each completed main round. Skip available. Disabled from QF and above.
- **Demo mode** — Girls Got Drip Vol. 0 format: 12 participants, redemption R1 cap 4, Round 3 in progress.

### Platform
- Git remote URL corrected to `mfosa7222/Seduh-Score`.
- README URLs corrected throughout.

---

## [3.0.0] — Platform Launch

- Project renamed from BBTC-Score to **Seduh Score**.
- Multi-module architecture: dashboard `index.html` + `bbtc/` + `throwdown/` + `shared/`.
- Shared components extracted: `theme.css`, `timer.js`, `audience.js`, `storage.js`.
- **Throwdown 1v1** module added: randomized bracket, bye handling, redemption round, judge vote scoring, auto-advancement, audience view, standings, history, timer, persistence, reset.
- **Dashboard** module selector added.

---

## [2.0.0] — Bracket Engine & Design Overhaul (BBTC)

- Colour system redesigned for WCAG AA contrast.
- Standings tab — preliminary round only. Bracket seeding from preliminary points exclusively.
- Tabs reorganised: Setup · Prelims · Bracket · History · Standings.
- localStorage key updated to `bbtc_v3`.
- Bracket engine: full QF / SF / Final + 3rd Place. Flexible for 2–8+ advancing teams.
- Timer overlay: 5/10/15 min presets, fullscreen court display.

---

## [1.6.0]
- Audience view — light theme for projector display.
- CSV export: leaderboard, match summary, cup-by-cup scores (UTF-8 BOM).

## [1.5.0]
- Round winner bonus (+5) auto-awarded.
- Event date and venue fields added to PDF export.

## [1.4.0]
- A4 PDF export. localStorage persistence. Reset with confirmation.

## [1.3.0]
- 0/1/2/3 token scoring with shared 3-token constraint per cup.
- Token usage counter. Finish time fields.

## [1.2.0]
- Full-screen audience overlay. QF leaderboard contrast fix.

## [1.1.0]
- Manual match creation with judge pool selection. History tab. QF cutline on leaderboard.

## [1.0.0] — Initial Release (BBTC)
- Setup: teams, judges. Manual matches. Cup-by-cup scoring. Bonus points.
