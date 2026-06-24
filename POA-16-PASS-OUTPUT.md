# POA-16 — Design session output → spec session

Two visual-spec files, both bound to `shared/theme.css` only (no framework, no DS
bundle), so Claude Code can rebuild them in the static multi-file app.

- `aud-overlay-design.html` — projector overlay, 7 states (Enhanced dark/light dual,
  podium, Lite single, Throwdown single, BTC compat, phone). Working light/dark toggle.
  Ends with the design-token handoff table.
- `aud-remote-design.html` — remote viewer page, 4 URL states (pre-event, live,
  concluded, no-event), phone + desktop. Opens with the Pass 1 token table pasted as a
  binding comment.

---

## The one new token to add to `theme.css`

```css
--aud-accent: var(--accent);   /* set on #aud-overlay, inherited. Placeholder in designs: #d97706 */
```

**No other token added; none renamed.** Dark mode reuses the existing `--surface-deep`
suite; light mode reuses `--bg / --surface / --txt*`. Regression guard intact.

---

## Binding design decisions (do not reopen in Code)

- Dual-panel split **42 / 58** (standings / results). Single-panel = results fills full width.
- Latest result is the **largest element** everywhere (recency hierarchy). Mobile/remote
  stack **results above standings**.
- Header: Seduh mark + event name + module tag left; live · logo · toggle · close right.
- Logo slot: **48px tall, max 150px wide, `object-fit:contain`, `--rad-s`**; container
  always present in Enhanced, absent in Lite + phone header.
- Toggle: sun/moon 38px, header-right, absent in Lite. `projectionMode` sets the default;
  the toggle overrides for the session.
- Podium = full-screen takeover, centred champion, runners below (2nd left / 3rd right).
- Remote page = light/paper base (justified deviation, **no token changes**); live
  indicator is an ambient pulse + "updated 3s ago", never a spinner, only in the live state.

---

## Decisions the spec session must still make

1. Full `Audience.setEventConfig({ accentColour, logoUrl, projectionMode })` signature + when called.
2. The `audInited` guard pattern (fix the stacking `#aud-close` listener).
3. Null-guard requirements for `aud-ts` and `aud-hist`.
4. Retire the `#9CA3AF` fallback → named tokens (already retired in the design).
5. BTC migration path (self-contained today, doesn't use `audience.js`) — round-colour
   history rows + "Preliminary standings" label must survive.
6. Cup Taster migration pass.
7. Storage key for any persisted event config (and whether the live theme override persists).
8. Which states are tier-gated (`audience_enhanced` / `audience_links` / `audience_links_live`).

---

## Pass 1 → Pass 2 token handoff (verbatim, binding)

```
Dark mode:   bg --surface-deep #1c1510 · card --deep-card #26201a
             text --deep-ink #faf7f1 · 2nd --deep-ink2 #c8b6a4 · border --deep-bd #3a2c20
Light mode:  bg --bg #f3efe8 · card --surface #ffffff
             text --txt #211a14 · 2nd --txt2 #4d443c · border --border #e5ddd0
Accent (placeholder): #d97706 — property --aud-accent (defaults to var(--accent))
Type:  event name --fs-h2/-display·800 · latest result --fs-display·800
       standings row --fs-lead·700 · module tag --fs-label mono .14em · podium champion --fs-hero·800
Radius: panels/cards --rad 14px · inner --rad-s 9px · badges --rad-pill 99px
Toggle: sun/moon 38px icon, header-right, absent in Lite
Header: left = Seduh mark + event name + module tag · right = live · logo · toggle · close
Logo:  48px tall, max 150px wide, object-fit:contain, --rad-s tile
```

---

*No CHANGELOG entry yet (no code shipped). These two files are the visual reference Code
builds from, alongside `AUDIENCE-SPEC.md`.*
