/* Shared page helpers: URL state, today's date, small DOM utilities. */
(function () {
  'use strict';
  var C = window.DateCore;

  function $(id) { return document.getElementById(id); }

  function today() {
    var n = new Date();
    return C.makeDate(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }

  function params() { return new URLSearchParams(window.location.search); }

  // Replace the query string with the given values (empty values are dropped).
  function writeParams(obj) {
    var p = new URLSearchParams();
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v === true ? '1' : String(v));
    });
    // '/' and ':' are legal in a query string; leaving them readable keeps shared links tidy.
    var qs = p.toString().replace(/%2F/gi, '/').replace(/%3A/gi, ':');
    var url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    try { window.history.replaceState(null, '', url); } catch (e) { /* file:// or sandboxed */ }
  }

  function dateParam(p, key) { return C.parseISODate(p.get(key) || ''); }

  function intParam(p, key, min, max) {
    var raw = p.get(key);
    if (raw === null || !/^-?\d+$/.test(raw.trim())) return null;
    var n = parseInt(raw, 10);
    return (n < min || n > max) ? null : n;
  }

  function boolParam(p, key, fallback) {
    var v = p.get(key);
    if (v === null) return fallback;
    return v === '1' || v === 'true' || v === 'yes';
  }

  function setText(id, text) { var e = $(id); if (e) e.textContent = text; }

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  // "Copy link" buttons copy the current URL (which always mirrors the inputs).
  function setupCopy(buttonId, statusId) {
    var b = $(buttonId);
    if (!b) return;
    b.addEventListener('click', function () {
      var url = window.location.href;
      function done(ok) {
        setText(statusId, ok ? 'Link copied.' : 'Copy this link from the address bar.');
        setTimeout(function () { setText(statusId, ''); }, 2500);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  }

  // Calls fn whenever any control inside the form changes; blocks real submits.
  function liveForm(formId, fn) {
    var f = $(formId);
    f.addEventListener('input', fn);
    f.addEventListener('change', fn);
    f.addEventListener('submit', function (e) { e.preventDefault(); fn(); });
  }

  function holidayLabel(h) {
    var s = h.name + ' (observed ' + C.formatLong(h.observed) + ')';
    return s;
  }

  window.UI = {
    $: $, today: today, params: params, writeParams: writeParams, dateParam: dateParam,
    intParam: intParam, boolParam: boolParam, setText: setText, fmt: fmt,
    setupCopy: setupCopy, liveForm: liveForm, holidayLabel: holidayLabel
  };
})();
