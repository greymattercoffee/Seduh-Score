# Seduh Score — Audience View Rebuild (POA-16)
## Design Session Handoff — Two Passes

---

## Before anything else

Read in this order — no exceptions:
1. `CHANGELOG.md` — confirm current version (v4.5.1)
2. `CONVENTIONS.md` — read in full; paste the entire file into context
3. Confirm the regression guard before touching any CSS:
   - Never rename or remove: `--txt/--txt2/--txt3`, `--am*`, `--bl*`, `--gn*`,
     `--rd*`, `--pu*`, `--accent*`, `--bg`, `--surface*`, `--border*`, `--ink*`
   - Never rename or remove: all `.tmr-*`, all `.aud-*`, `#tmr-overlay`,
     `#aud-overlay`, `#pdf-overlay`, `.pdf-*` print rules
   - Semantic colour meanings are locked: blue = rounds, green = completion/winners,
     purple = redemption, red = destructive/ties
4. `shared/theme.css` — read in full; this is the token source of truth

---

## What this session is

A design session in two passes. No module logic is changed. No JavaScript is
written. The output of each pass is a standalone HTML file demonstrating the
designed states. Claude Code builds from these files — they are the visual
specification.

**Pass 1** produces the audience overlay visual system and all its states.
**Pass 2** produces the remote viewer page and URL access states.

Pass 2 opens with the Pass 1 output file as its first input — design decisions
made in Pass 1 are binding in Pass 2. No drift.

---

## Context — what exists today

`shared/audience.js` provides a fullscreen overlay triggered by `Audience.show()`.
It has two panels: `aud-lb` (standings) and `aud-hist` (results/history).
It is built for a single landscape projector viewport. It has no responsive
behaviour, no theming modes, no branding slots, and no multi-state awareness.

Current call signature:
```javascript
Audience.show({
  title: 'Throwdown 1v1',
  moduleTag: 'Round 3',   // optional badge
  lbHTML: '...',          // standings panel HTML
  histHTML: '...',        // results panel HTML
})
```

Current known debt (all fixed in the rebuild):
- `#aud-close` listener stacks on every `Audience.show()` call — no `audInited` guard
- `aud-ts` and `aud-hist` have no null guards
- Fallback hex `#9CA3AF` is below projector contrast
- BBTC audience is self-contained and does not use `audience.js` at all

---

## Decisions locked in strategy session

These are not open for reconsideration in the design session:

| Decision | Detail |
|---|---|
| **Frame** | Directed narrative presentation — drama and stakes, not a data mirror |
| **Lite tier** | Single panel, light theme default, no branding, no podium |
| **Enhanced tier** | Dual panel, dark theme default (`--surface-deep`), branding slots, live toggle, podium mode |
| **Podium** | Full-screen mode change — not a third panel. Organiser-triggered. Enhanced only. |
| **Dark/light** | Config sets the default; live toggle overrides for the session. Both modes fully designed. |
| **Branding** | `Audience.setEventConfig({ accentColour, logoUrl, projectionMode })` called once. Slots exist in overlay whether populated or not. |
| **Responsiveness** | Three rendering contexts: projector/large display, organiser device, remote phone. One overlay, responsive CSS. |
| **BTC migration** | BTC will migrate to the new contract. Design must not exclude BTC's display needs: round-coloured history rows, preliminary standings label, match-type distinctions. |
| **URL access** | Post-Firebase. Hooks planted now. Four URL states: pre-event, live, concluded, no event configured. |

---

## The new `Audience.show()` signature (for design reference)

The designer does not implement this — Claude Code does. But the design must
account for every parameter having a visual home.

```javascript
// Called once on module init or when event settings change
Audience.setEventConfig({
  accentColour: '#d97706',    // defaults to var(--accent)
  logoUrl: null,              // blob URL or null
  projectionMode: 'dark',     // 'dark' | 'light' — sets starting state
})

// Called on every state change that should update the audience view
Audience.show({
  title: 'Girls Got Drip Vol. 0',   // event name — always required
  moduleTag: 'Quarterfinals',        // optional round/stage badge
  lbHTML: '...',                     // standings panel — omit for single-panel
  histHTML: '...',                   // results panel — always required
  podium: [                          // optional — Enhanced only, triggers podium mode
    { rank: 1, name: 'Hana M.' },
    { rank: 2, name: 'Riza A.' },
    { rank: 3, name: 'Dana F.' },
  ],
})
```

---

## Pass 1 — The audience overlay

### What to produce

A single HTML file: `aud-overlay-design.html`

It must demonstrate every state the overlay can be in, navigable via tab or
button within the file. No JavaScript framework. Inline CSS only — no external
dependencies except `shared/theme.css` (reference its tokens, do not rewrite them).

### The seven states to design

**State 1 — Enhanced / Dark / Dual panel / Active competition**
The primary working state for a paid organiser. Standings left, latest result
right. Dark `--surface-deep` base. Event name prominent. `moduleTag` badge
visible. Organiser logo slot visible (populated with a placeholder). Accent
colour applied to key elements. Live toggle accessible (light/dark). Close
control present. This is the state the audience sees for most of the event.

**State 2 — Enhanced / Light / Dual panel / Active competition**
Same as State 1, flipped to light theme via the live toggle. Identical
information hierarchy. Same branding slots. Confirms both modes are fully
designed — not an afterthought.

**State 3 — Enhanced / Dark / Podium mode**
Full-screen takeover. Champion panel dominant. Runner-up and second runner-up
below. Event name retained. Module tag absent. This is a moment, not a data
display — design it as such. Dismissible by organiser.

**State 4 — Lite / Light / Single panel / Active competition**
Community tier. Single panel — results/history only. No branding slots (logo
area absent, not just hidden). Standard platform palette, no custom accent.
No toggle. No podium. The Seduh mark and event name are present. Clean and
functional — not degraded, just simpler.

**State 5 — Enhanced / Dark / Single panel / Active competition (Throwdown)**
Throwdown has no standings panel — it passes only `histHTML`. This state
confirms the dual-panel grid degrades cleanly to single-panel when `lbHTML`
is absent. Same branding, same header, just the results panel fills the space.

**State 6 — BTC compatibility check**
A representative view of BTC data rendered inside the new overlay structure.
BTC history rows have round-colour coding (Preliminary = grey, QF = blue,
SF = amber, Finals = green). The standings panel shows "Preliminary standings"
label. The design must confirm that BTC's display logic fits cleanly in the
new container without losing its round distinctions. This is a design proof,
not a full BTC implementation.

**State 7 — Responsive: phone viewport**
State 1 (Enhanced / Dark / Dual panel) rerendered at 390px width. Confirm
the layout does not break. Panel stacking strategy: define which panel comes
first in vertical stack (results/history above standings, or standings above
results — justify the choice). Header remains readable. Toggle remains
accessible. This is the same overlay seen on a remote viewer's phone when
Firebase is live — design for it now.

### Design requirements for Pass 1

**Typography:**
- Use `--fs-*` tokens from the v4.1 system throughout
- Latest result / most recent action must be the largest text element in the
  active competition states — hierarchy communicates recency and stakes
- Module tag badge uses `--fs-eyebrow` or `--fs-label` with uppercase tracking
- Rank numbers in standings use `--rank-1/-2/-3` medal tokens where applicable

**Colour:**
- Dark mode base: `--surface-deep`, `--deep-card`, `--deep-ink`, `--deep-ink2`
  — these tokens exist in `theme.css` already
- Light mode base: `--bg`, `--surface`, `--txt`, `--txt2`
- Accent: `var(--aud-accent)` — a new CSS custom property that defaults to
  `var(--accent)`. Set on `#aud-overlay` so it cascades. All accent-coloured
  elements reference this variable, not `--accent` directly.
- Fallback hex `#9CA3AF` is retired — any grey values must use named tokens
- BTC round colours must remain: blue = QF, amber = SF, green = Finals,
  grey = Preliminary. These are locked semantic meanings.

**Layout:**
- Dual panel: left panel (standings) and right panel (results). Define the
  split ratio — justify whether it is 50/50 or weighted (e.g. 40/60).
- Single panel: full width. No empty left column — the panel expands.
- Podium: full screen, no panels. Champion is the vertical and horizontal
  centrepiece. Runner-up and second runner-up flanking or below — define
  the layout and justify it.
- Header: event name left, logo slot right (or logo left, event name
  centre — define and justify). Module tag badge sub-header. Toggle and
  close controls always reachable.

**Branding slots:**
- Logo: `<img>` element inside a `.aud-logo` container. Shown when `logoUrl`
  is set. Container always present in Enhanced tier — empty state must not
  break layout.
- Accent: applied to at least the header rule/rail, active position indicators
  in standings, and the podium champion highlight. Not applied to everything —
  use with restraint.

**The live toggle:**
- A single control accessible from the overlay header at all times (Enhanced).
- Must not be a large UI element — subtle, reachable, not distracting during
  the competition. Label: "Light" / "Dark" or a sun/moon icon — define and
  justify.
- Absent in Lite tier.

**Copy conventions (from CONVENTIONS.md):**
- Sentence case everywhere. Mono eyebrows/labels are the only UPPERCASE.
- Warm, plain, confident — never corporate, never hype.
- Emoji as functional glyphs only: 🏆 for podium, 📺 for audience, ⚡ for
  live status. Never in body copy.

**Placeholder content to use throughout:**
```
Event name:    Girls Got Drip Vol. 0
Module tag:    Quarterfinals
Standings:     Hana M. (1st), Riza A. (2nd), Dana F. (3rd), Siti B. (4th)
Latest result: Hana M. def. Riza A. — QF1 — 2/1 judges
BTC round:     BTC history rows with QF / SF / Finals colour coding
Podium:        🏆 Hana M. · Runner-up: Riza A. · 2nd runner-up: Dana F.
```

### Pass 1 output

One file: `aud-overlay-design.html`

Must include a clearly labelled state switcher at the top of the page (not
part of the overlay itself — a design review nav). Something like:

```
[State 1: Enhanced Dark] [State 2: Enhanced Light] [State 3: Podium]
[State 4: Lite] [State 5: Throwdown] [State 6: BTC] [State 7: Mobile]
```

Each state renders the full overlay — the state switcher is outside and above.

Before closing Pass 1: produce a **design token summary** — a short table
of every new CSS custom property introduced in this design file. This table
is the handoff artefact that links Pass 1 to Pass 2.

---

## Pass 2 — The remote viewer page

### Opening instruction — mandatory before any design work

**Read `aud-overlay-design.html` from Pass 1 in full before beginning.**

Extract and explicitly state:
- The exact hex values used for dark mode background, card, and text
- The exact hex values used for light mode background, card, and text
- The accent colour used in placeholder states
- The font size scale applied (which `--fs-*` tokens at which roles)
- The border radius values used on cards and panels
- The toggle control design and position
- The header layout structure (what is left / centre / right)
- The Pass 1 design token summary table

These are **binding** for Pass 2. No value may deviate without explicit
justification written as a comment in the Pass 2 file.

### What to produce

A single HTML file: `aud-remote-design.html`

This is the page a remote viewer reaches via URL (e.g.
`seduhscore.com/live/ggd-vol-0`). It is not the projector overlay — it is
a standalone responsive page for phone and desktop browsers. It shares the
visual language of the overlay but is a different layout suited to scrolling
and reading, not projecting.

### The four URL states to design

**State A — Pre-event**
The competition has not started. The organiser has not gone live. A visitor
reaching this URL before the event should see:
- Event name and date/venue (if set)
- Platform identity (Seduh mark + "Seduh Score")
- Friendly message: results will appear here when the event begins
- No 404, no blank page, no technical error message
- Optional: a countdown if the event date is known
- Warm, confident — feels like a holding page worth sharing, not an error

**State B — Live**
The competition is running and the organiser has gone live. A remote viewer
sees:
- Current standings (if applicable to the module — not all modules have
  persistent standings at all times)
- Latest result — prominent, same recency hierarchy as the overlay
- Event name, module tag (current stage), live indicator
- Auto-refreshes when Firebase pushes updates (hook only — visual indicator
  of "live" status required, actual refresh is Firebase's job)
- Responsive: same information at 390px and 1080px — different layout, same
  hierarchy

**State C — Concluded**
The competition has ended. The page becomes a results record rather than a
live feed:
- Final standings — full, not truncated
- Champion banner — same podium hierarchy as the overlay's podium mode, but
  adapted for a scrollable page (not fullscreen takeover)
- Event summary: event name, date, venue, module
- Results feel permanent and worth sharing — this URL becomes a record

**State D — No event configured**
The URL exists but no event has been associated with it, or the event config
is incomplete. Not a 404. A clear, friendly explanation that this page will
show results when an event is configured here. Platform branding present.
Directs to the platform front door if they want to learn more.

### Design requirements for Pass 2

**Visual language consistency (binding from Pass 1):**
- All values from the Pass 1 token summary are used as-is
- No new accent colours, no new radius values, no new font sizes beyond the
  Pass 1 system
- New layout patterns are permitted (scrollable page vs overlay) but all
  visual atoms are inherited

**Responsive behaviour:**
- Design at two explicit widths: 390px (phone) and 1080px (desktop)
- Show both for each state, or clearly state which states are mobile-first
  and which are desktop-first with the other inferred
- The live indicator, event name, and latest result must be readable at both

**The live indicator:**
- A visual signal that the page is receiving live updates (Enhanced / Annual
  tier post-Firebase)
- Not a spinner — something ambient and non-distracting. A subtle pulse on
  a dot, a "LIVE" badge in the accent colour, a timestamp "updated 3s ago"
  — define and justify
- Absent in pre-event and concluded states

**Copy for placeholder content:**
```
URL example:    seduhscore.com/live/ggd-vol-0
Pre-event:      "Girls Got Drip Vol. 0 results will appear here
                 when the competition begins."
Live:           Same standings and result data as Pass 1 placeholder
Concluded:      "Girls Got Drip Vol. 0 · Final standings"
                Champion: Hana M. · Runner-up: Riza A. · 2nd: Dana F.
No event:       "No event is configured at this address yet."
```

**State D fallback page must feel like a platform page, not a dead end.**
It should carry the Seduh mark, a short explanation, and a link to
`index.html` (the front door).

### Pass 2 output

One file: `aud-remote-design.html`

Must include a state switcher at the top of the page (outside the page
content):
```
[State A: Pre-event] [State B: Live] [State C: Concluded] [State D: No event]
```

Each state renders the full page at the design's natural width.

---

## Linking Pass 1 to Pass 2 — the consistency contract

At the end of Pass 1, before handing to Pass 2, produce this table and paste
it into the Pass 2 opening prompt verbatim:

```
--- PASS 1 DESIGN TOKEN HANDOFF ---

Dark mode:
  Background:         [hex]
  Card surface:       [hex]
  Primary text:       [hex]
  Secondary text:     [hex]
  Border:             [hex]

Light mode:
  Background:         [hex]
  Card surface:       [hex]
  Primary text:       [hex]
  Secondary text:     [hex]
  Border:             [hex]

Accent (placeholder):  [hex]
Accent property:       --aud-accent (set on #aud-overlay, inherited)

Type scale applied:
  Event name:          [--fs-* token] / [weight]
  Latest result:       [--fs-* token] / [weight]
  Standings row:       [--fs-* token] / [weight]
  Module tag badge:    [--fs-* token] / [weight] / uppercase tracking
  Podium champion:     [--fs-* token] / [weight]

Radius:
  Overlay panels:      [value]
  Cards within panels: [value]
  Badges:              [value]

Toggle control:
  Position:           [describe]
  Design:             [describe]
  Absent in Lite:     confirmed

Header layout:
  Left:               [describe]
  Centre:             [describe]
  Right:              [describe]

New CSS custom properties introduced in Pass 1:
  --aud-accent:       [default value]
  [any others]:       [default value]

--- END PASS 1 HANDOFF ---
```

**Pass 2 must open with this table pasted in full. Any deviation from these
values requires an explicit written justification as an inline CSS comment.**

---

## What these files feed into

The two design files are the input to the spec session, which produces
`AUDIENCE-SPEC.md`. The spec session will:
- Confirm every state has a corresponding JavaScript trigger
- Define the `Audience.setEventConfig()` signature in full
- Define the `audInited` guard pattern
- Write the null-guard requirements for `aud-ts` and `aud-hist`
- Define the BTC migration path from its self-contained overlay to the new contract
- Define the Cup Taster migration pass
- Set the storage key for any persisted event config

Claude Code builds from `AUDIENCE-SPEC.md`, with both design files as visual
references.

---

## What this session does not produce

- No JavaScript
- No changes to any existing module files
- No changes to `shared/theme.css` beyond documenting new custom properties
  that will be added in the build session
- No `CHANGELOG.md` entry (no code shipped)
- No handoff prompt for Claude Code — that comes from the spec session

---

*POA-16 Design Session · Seduh Score v4.5.1 · June 2026*
*Strategy decisions locked: June 2026*
*Next: spec session → AUDIENCE-SPEC.md → Claude Code build*
