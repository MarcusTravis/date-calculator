(function () {
  'use strict';
  var C = window.DateCore, U = window.UI, $ = U.$;
  var p = U.params();
  var LIMIT = 100000;
  $('date').value = C.toISODate(U.dateParam(p, 'date') || U.today());
  var op = p.get('op') === 'sub' ? 'sub' : 'add';
  $(op === 'sub' ? 'op-sub' : 'op-add').checked = true;
  ['years', 'months', 'weeks', 'days'].forEach(function (k) {
    var v = U.intParam(p, k, 0, LIMIT);
    $(k).value = v === null ? (k === 'days' && !p.toString() ? '30' : '0') : String(v);
  });

  function num(id) {
    var raw = $(id).value.trim();
    if (raw === '') return 0;
    if (!/^\d+$/.test(raw)) return NaN;
    var n = parseInt(raw, 10);
    return n > LIMIT ? NaN : n;
  }

  function run() {
    var date = C.parseISODate($('date').value);
    var sub = $('op-sub').checked;
    var y = num('years'), mo = num('months'), w = num('weeks'), d = num('days');
    U.writeParams({ date: $('date').value, op: sub ? 'sub' : '', years: y || '', months: mo || '', weeks: w || '', days: d || '' });
    if (!date) { $('result').hidden = true; U.setText('error', 'Enter a valid start date.'); return; }
    if ([y, mo, w, d].some(isNaN)) { $('result').hidden = true; U.setText('error', 'Amounts must be whole numbers from 0 to 100,000.'); return; }
    var s = sub ? -1 : 1;
    var afterMonths = C.addMonths(date, s * (y * 12 + mo));
    var dayNum = C.toDayNumber(afterMonths) + s * (w * 7 + d);
    var result = C.fromDayNumber(dayNum);
    if (result.y < 1 || result.y > 9999) { $('result').hidden = true; U.setText('error', 'The result is outside years 1 to 9999.'); return; }
    U.setText('error', '');
    U.setText('out', C.formatLong(result));
    U.setText('out-iso', C.toISODate(result));
    var clamped = (y || mo) && afterMonths.d !== date.d;
    U.setText('clamp', clamped ? 'The ' + C.formatShort(date) + ' day-of-month does not exist in ' +
      C.MONTH_NAMES[afterMonths.m - 1] + ' ' + afterMonths.y + ', so the month step lands on the last day of that month (' +
      C.formatShort(afterMonths) + ').' : '');
    var span = C.diffDays(date, result);
    U.setText('span', C.plural(Math.abs(span), 'calendar day') + (span < 0 ? ' earlier' : span > 0 ? ' later' : ''));
    $('result').hidden = false;
  }
  U.liveForm('form', run);
  $('use-result').addEventListener('click', function () {
    var r = $('out-iso').textContent;
    if (r) { $('date').value = r; run(); $('date').focus(); }
  });
  U.setupCopy('copy', 'copy-status');
  run();
})();
