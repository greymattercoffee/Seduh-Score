// shared/gates.js — feature gate v4.8.0
// Public API: Gates.canAccess(featureKey) — signature and return shape unchanged.
// Gates.init(user), Gates.isExpired(), Gates.isNotYetStarted(), and
// Gates.getStartTime() are called by auth.js only, never by modules.

const FEATURES = {
  // Module access — routing layer
  'btc':                  { minTier: 'annual' },

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
  'audience_enhanced':          { minTier: 'per_event' },
  'audience_branding':          { minTier: 'per_event' }, // MUA-04: event identity band in overlay
  'audience_links_concluded':   { minTier: 'community' },
  'audience_links_snapshot':    { minTier: 'per_event' },

  // PDF export (shared/pdf.js, MUA-07 / POA-55)
  'pdf_branding':                { minTier: 'per_event' }, // logo/subtitle/date/venue in PDF header

  // Platform switches — minTier: null = tier-independent, super admin enables only
  'cup_taster_module':   { minTier: null },
  'audience_links_live': { minTier: null },
};

let _tier     = 'community'; // 'community' | 'per_event' | 'annual'
let _expiry   = null;        // Unix timestamp (seconds) or null
let _start    = null;        // Unix timestamp (seconds) or null — access not valid before this
let _switches = {};          // { featureKey: boolean }

function getTier() {
  if (!_tier || _tier === 'community') return 'community';
  if (Gates.isExpired()) return 'community'; // expired = community access
  return _tier;
}

function isEnabled(featureKey) {
  const feature = FEATURES[featureKey];
  if (!feature) return false;
  if (feature.minTier === null) {
    // Platform-switch-only — must be explicitly true in switches doc
    return _switches[featureKey] === true;
  }
  // Tier-gated features: enabled unless explicitly false; absence means enabled
  return _switches[featureKey] !== false;
}

function tierRank(tier) {
  return { community: 0, per_event: 1, annual: 2 }[tier] ?? -1;
}

const Gates = {
  canAccess: function(featureKey) {
    const feature = FEATURES[featureKey];
    if (!feature) return { allowed: false, reason: 'disabled' };
    if (!isEnabled(featureKey)) return { allowed: false, reason: 'disabled' };
    if (feature.minTier === null) return { allowed: true }; // passed isEnabled
    if (Gates.isNotYetStarted()) return { allowed: false, reason: 'not_started' };
    const rank = tierRank(getTier());
    const required = tierRank(feature.minTier);
    if (rank < required) return { allowed: false, reason: 'tier' };
    return { allowed: true };
  },

  init: async function(user) {
    const result = await user.getIdTokenResult();
    _tier   = result.claims.subscription_tier   || 'community';
    _expiry = result.claims.subscription_expiry || null;
    _start  = result.claims.subscription_start  || null;

    try {
      const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const snap = await getDoc(doc(window._sdDb, 'platform', 'switches'));
      _switches = snap.exists() ? snap.data() : {};
    } catch (e) {
      // Firestore unreachable — _switches stays {}
      // Platform-switch-only features stay hidden (safe default)
      console.warn('Platform switches unavailable:', e);
    }
  },

  isExpired: function() {
    return _expiry !== null && (Date.now() / 1000) > _expiry;
  },

  isNotYetStarted: function() {
    return _start !== null && (Date.now() / 1000) < _start;
  },

  getStartTime: function() {
    return _start;
  }
};
