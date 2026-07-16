// shared/pdf.js — Seduh Score shared PDF export module (POA-55, MUA-07)
// Public API: PdfExport.open({fallbackTitle, pages}), .close(), .print() —
// three methods only. Modules must never touch #pdf-overlay classList directly.
// Spec: CONVENTIONS.md "PDF export (shared/pdf.js)".

function _pdfReadHandoff() {
  try {
    const raw = sessionStorage.getItem('seduh_handoff');
    if (!raw) return {};
    const h = JSON.parse(raw);
    if (!h || (h.v !== 1 && h.v !== 2)) return {};
    return h;
  } catch (e) { return {}; }
}

function _pdfIdentityBlock(handoff, fallbackTitle, branded) {
  const eventName = handoff.eventName || fallbackTitle || '';
  const logoUrl       = branded ? handoff.logoUrl       : null;
  const eventSubtitle = branded ? handoff.eventSubtitle : null;
  const eventDate      = branded ? handoff.eventDate     : null;
  const eventVenue     = branded ? handoff.eventVenue    : null;
  const metaLine = [eventSubtitle, eventDate, eventVenue].filter(Boolean).join(' · ');

  return '<div class="pdf-id-block">'
    + (logoUrl ? '<img class="pdf-logo" src="' + logoUrl + '" alt="">' : '')
    + '<div>'
    + '<div class="pdf-event-sub">Seduh Score</div>'
    + '<div class="pdf-event-name">' + eventName + '</div>'
    + (metaLine ? '<div class="pdf-event-meta">' + metaLine + '</div>' : '')
    + '</div>'
    + '</div>';
}

const PdfExport = {};

PdfExport.open = function({ fallbackTitle = '', pages = [] } = {}) {
  const overlay = document.getElementById('pdf-overlay');
  const content = document.getElementById('pdf-content');
  if (!overlay || !content) return;

  const handoff = _pdfReadHandoff();
  const branded = typeof Gates !== 'undefined' && Gates.canAccess('pdf_branding').allowed;
  const idBlock = _pdfIdentityBlock(handoff, fallbackTitle, branded);

  const now = new Date();
  const exportDateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const exportTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  content.innerHTML = pages.map(function(page) {
    return '<div class="pdf-page">'
      + '<div class="pdf-logo-row">'
      + idBlock
      + '<div class="pdf-meta">' + (page.metaHtml || '') + '</div>'
      + '</div>'
      + (page.sectionTitle ? '<div class="pdf-section-title">' + page.sectionTitle + '</div>' : '')
      + (page.bodyHtml || '')
      + '<div class="pdf-footer"><span>Seduh Score</span><span>Exported ' + exportDateStr + ' at ' + exportTimeStr + '</span></div>'
      + '</div>';
  }).join('');

  overlay.classList.add('show');
};

PdfExport.close = function() {
  const overlay = document.getElementById('pdf-overlay');
  if (overlay) overlay.classList.remove('show');
};

PdfExport.print = function() {
  window.print();
};
