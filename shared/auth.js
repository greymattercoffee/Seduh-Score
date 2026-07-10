// shared/auth.js
import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const html = document.documentElement;
let expiryInterval = null;

function showBanner(id, bg, msg) {
  if (document.getElementById(id)) return;
  const b = document.createElement('div');
  b.id = id;
  b.style.cssText = `position:fixed;top:0;left:0;right:0;z-index:500;background:${bg};color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;gap:12px`;
  b.innerHTML = `<span>${msg}</span><button onclick="this.parentNode.remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0;line-height:1;flex-shrink:0">×</button>`;
  document.body.prepend(b);
}

function showLoginError(code) {
  const msgs = {
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/user-not-found':         'No account found with that email.',
    'auth/too-many-requests':      'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed': 'Connection problem. Check your internet and try again.'
  };
  const el = document.getElementById('login-error');
  if (el) el.textContent = msgs[code] || 'Sign in failed. Please try again.';
}

function clearLoginError() {
  const el = document.getElementById('login-error');
  if (el) el.textContent = '';
}

function setOrgChip(email) {
  ['org-chip-email', 'org-signed-in-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = email;
  });
}

function startExpiryMonitor() {
  if (expiryInterval) clearInterval(expiryInterval);
  expiryInterval = setInterval(() => {
    if (typeof Gates !== 'undefined' && Gates.isExpired && Gates.isExpired()) {
      showBanner('expiry-banner', 'var(--am)', 'Your access window has ended. You can finish your current session, but some features may become unavailable on next login.');
      clearInterval(expiryInterval);
      expiryInterval = null;
    }
  }, 60000);
}

const offlineTimeout = setTimeout(() => {
  showBanner('offline-banner', 'var(--rd)', 'You appear to be offline. If you were previously signed in, your session will restore when your connection returns.');
}, 5000);

onAuthStateChanged(auth, async user => {
  clearTimeout(offlineTimeout);
  const ob = document.getElementById('offline-banner');
  if (ob) ob.remove();
  if (user) {
    html.setAttribute('data-auth', 'in');
    setOrgChip(user.email);
    // REDIRECT HOOK — currently Option A (stay on front door)
    // To enable Option B later, replace this block with:
    // window.location.href = '/org/';
    // Current behaviour: stay on front door, UI updates in place via [data-auth]
    if (typeof Gates !== 'undefined' && Gates.init) {
      await Gates.init(user);
      window.dispatchEvent(new CustomEvent('seduh:gates-ready'));
      startExpiryMonitor();
      if (Gates.isNotYetStarted && Gates.isNotYetStarted()) {
        const startTime = Gates.getStartTime ? Gates.getStartTime() : null;
        const startStr = startTime
          ? new Date(startTime * 1000).toLocaleString('en-BN', { timeZone: 'Asia/Brunei' }) + ' BNT'
          : 'soon';
        showBanner('not-started-banner', 'var(--bl)', `Your access window starts ${startStr} — paid features unlock automatically, no need to check back.`);
      }
    }
  } else {
    html.setAttribute('data-auth', 'out');
    if (expiryInterval) { clearInterval(expiryInterval); expiryInterval = null; }
  }
});

onIdTokenChanged(auth, user => {
  if (user && typeof Gates !== 'undefined' && Gates.init) Gates.init(user).then(() => window.dispatchEvent(new CustomEvent('seduh:gates-ready')));
});

document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (!act) return;
  const a = act.getAttribute('data-act');
  if (a === 'signin') {
    e.preventDefault();
    const email = document.getElementById('org-email')?.value ?? '';
    const pass  = document.getElementById('org-pass')?.value ?? '';
    clearLoginError();
    signInWithEmailAndPassword(auth, email, pass).catch(err => showLoginError(err.code));
  } else if (a === 'signout') {
    signOut(auth);
  }
});
