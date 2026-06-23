// shared/gates.js — feature gate stub (v4.3+)
// Stub: all canAccess() calls return { allowed: true } until Firebase auth lands in v4.6.
// Modules call ONLY Gates.canAccess() — never getTier(), isEnabled(), or tierRank() directly.

const FEATURES = {
  // Module access — routing layer
  'btc':                  { minTier: 'annual' },
  'liga':                 { minTier: 'per_event' },
  'cup_taster':           { minTier: 'per_event' },

  // Throwdown
  'throwdown_redemption': { minTier: 'per_event' },
  'throwdown_revival':    { minTier: 'per_event' },
  'throwdown_report':     { minTier: 'per_event' },
  'throwdown_unlimited':  { minTier: 'per_event' }, // >16 participants

  // Liga Seduh
  'liga_device_tracking': { minTier: 'per_event' },
  'liga_csv_export':      { minTier: 'per_event' },
  'liga_unlimited':       { minTier: 'per_event' }, // >8 brewers

  // Cup Taster
  'cup_taster_analytics': { minTier: 'per_event' },
  'cup_taster_report':    { minTier: 'per_event' },
  'cup_taster_unlimited': { minTier: 'per_event' }, // >8 contestants or >3 sets

  // Audience
  'audience_enhanced':    { minTier: 'per_event' },
  'audience_links':       { minTier: 'per_event' },

  // Platform switches — minTier: null means tier-independent (super admin only)
  // Feature hidden for ALL orgs regardless of tier until super admin enables it
  'cup_taster_module':    { minTier: null },
  'audience_links_live':  { minTier: null },
};

// STUB: returns 'annual' — replaced by Firebase custom claims read in v4.6
// Never call from modules.
function getTier() {
  return 'annual';
}

// STUB: returns true for all keys — replaced by Firestore platform-switch document read in v4.6
// Never call from modules.
function isEnabled(featureKey) {
  return true;
}

// Helper for tier comparison
function tierRank(tier) {
  return tier === 'annual' ? 2 : tier === 'per_event' ? 1 : 0;
}

function canAccess(featureKey) {
  const feature = FEATURES[featureKey];
  if (!feature) return { allowed: false, reason: 'disabled' };
  if (feature.minTier === null) {
    return isEnabled(featureKey) ? { allowed: true } : { allowed: false, reason: 'disabled' };
  }
  if (!isEnabled(featureKey)) return { allowed: false, reason: 'disabled' };
  if (tierRank(getTier()) < tierRank(feature.minTier)) return { allowed: false, reason: 'tier' };
  return { allowed: true };
}

const Gates = { canAccess };
