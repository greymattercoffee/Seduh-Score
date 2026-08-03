---
name: gates-pattern
description: Full FEATURES registry and gate pattern (B3) detail for shared/gates.js. Load when adding or checking a gated feature, a module-access routing gate, or a platform switch.
---

# Gates (`shared/gates.js`) — v4.3+

## Primary module-facing call

```javascript
const access = Gates.canAccess('feature_key');
// returns: { allowed: true }
// or:      { allowed: false, reason: 'tier' }
// or:      { allowed: false, reason: 'disabled' }
// or:      { allowed: false, reason: 'not_started' }
```

## Module usage pattern

```javascript
const access = Gates.canAccess('cup_taster_analytics');
if (!access.allowed) {
  // reason: 'tier'        → render upgrade prompt
  // reason: 'disabled'    → render nothing (feature not yet live)
  // reason: 'not_started' → org's access window hasn't begun yet (v5.10.0)
  return '';
}
```

## Internal methods — gates.js use only, never called from modules

```javascript
Gates.getTier()              // 'community' | 'per_event' | 'annual'
Gates.isEnabled('feature_key') // true | false — checks platform switch
Gates.isExpired()             // true once past subscription_expiry
Gates.isNotYetStarted()       // v5.10.0 — true before subscription_start
Gates.getStartTime()          // v5.10.2 — raw subscription_start Unix seconds, or null
```

## Gate pattern (B3 — updated)

- Gate logic lives in `shared/gates.js` only — never inline tier or switch checks in module files
- Modules call only `Gates.canAccess('feature_key')` — never `getTier()` or `isEnabled()` directly
- Gated elements are **hidden, not disabled** — use `display:none` or conditional render
- `canAccess()` checks both axes: org tier AND platform switch. Both must pass for `allowed: true`
- `reason: 'tier'` → org's subscription doesn't cover this feature → show upgrade prompt
- `reason: 'disabled'` → super admin has this feature switched off platform-wide → show nothing
- `reason: 'not_started'` → org's `subscription_start` claim is still in the future → treat like
  not-yet-active (v5.10.0). No module currently reads `reason` to differentiate messaging — this
  value costs nothing to add and is available if that changes
- **Throwdown is the reference implementation** for gate touch points
- **BTC gate is routing-layer only** — no gate touch points inside `bbtc/index.html`; access controlled by whether the org account can reach the module URL

## Org access window (`subscription_start` / `subscription_expiry`) — v5.10.0

Both are Auth custom claims set by `activateOrg`, in Unix seconds. `subscription_expiry` gates
the end of access (was already live); `subscription_start` (v5.10.0) gates the beginning — an org
is only ever treated as its real tier when `subscription_start <= now <= subscription_expiry`.
Both checks re-evaluate `Date.now()` live on every `canAccess()`/`getTier()` call — no scheduled
job, no deferred claim-set. Omitting `start` on a fresh activation defaults it to "now" server-side
(immediate access, the pre-v5.10.0 default behaviour); omitting it on an already-active org's tier
update preserves whatever start was set before, so a tier tweak can never silently reset a
deliberately-scheduled org to "now" and grant early access.

## Feature key registry (documented inside gates.js)

```javascript
const FEATURES = {
  // Module access — routing layer (community = free entry; btc = annual only)
  'btc':                         { minTier: 'annual' },
  // liga, cup_taster, throwdown: free entry — no routing-layer gate

  // Throwdown
  'throwdown_redemption':        { minTier: 'per_event' },
  'throwdown_revival':           { minTier: 'per_event' },
  'throwdown_report':            { minTier: 'per_event' },
  'throwdown_unlimited':         { minTier: 'per_event' }, // >16 participants

  // Liga Seduh
  'liga_device_tracking':        { minTier: 'per_event' },
  'liga_csv_export':             { minTier: 'per_event' },
  'liga_unlimited':              { minTier: 'per_event' }, // >8 brewers

  // Cup Taster
  'cup_taster_analytics':        { minTier: 'per_event' },
  'cup_taster_report':           { minTier: 'per_event' },
  'cup_taster_unlimited':        { minTier: 'per_event' }, // >8 contestants or >3 sets

  // Audience
  'audience_enhanced':           { minTier: 'per_event' },
  'audience_branding':           { minTier: 'per_event' }, // MUA-04: event identity in overlay
  'audience_links_concluded':    { minTier: 'community' }, // concluded-event link
  'audience_links_snapshot':     { minTier: 'per_event' }, // live snapshot URL

  // PDF / report identity
  'pdf_branding':                { minTier: 'per_event' }, // MUA-07: event identity in PDFs

  // Platform switches — minTier: null means tier-independent
  // Feature hidden for ALL orgs regardless of tier until super admin enables it
  'cup_taster_module':           { minTier: null },
  'audience_links_live':         { minTier: null },
}
```

`minTier: null` = platform switch only. No tier entitles an org to this feature until the switch is on.
