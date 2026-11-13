(function () {
  'use strict';
  var C = window.DateCore, U = window.UI, $ = U.$;
  var p = U.params();
  var t = U.today();
  var start = U.dateParam(p, 'start') || t;
  var end = U.dateParam(p, 'end') || C.addMonths(t, 1);
  $('start').value = C.toISODate(start);
  $('end').value = C.toISODate(end);
  $('inclusive').checked = U.boolParam(p, 'inclusive', false);

  function run() {
    var a = C.parseISODate($('start').value), b = C.parseISODate($('end').value);
    var inclusive = $('inclusive').checked;
    U.writeParams({ start: $('start').value, end: $('end').value, inclusive: inclusive });
    if (!a || !b) { $('result').hidden = true; U.setText('error', 'Enter two valid dates.'); return; }
    U.setText('error', '');
    var diff = C.diffDays(a, b);
    var sign = diff < 0 ? -1 : 1;
    var total = Math.abs(diff) + (inclusive ? 1 : 0);
    var endForYmd = inclusive ? C.addDays(sign < 0 ? a : b, 1) : (sign < 0 ? a : b);
    var ymd = C.diffYMD(sign < 0 ? b : a, endForYmd);
    U.setText('total', C.plural(total, 'day'));
    U.setText('direction', diff === 0 && !inclusive ? 'The two dates are the same.' :
      (sign < 0 ? 'The end date is before the start date (counted backward).' :
        'From ' + C.formatLong(a) + ' to ' + C.formatLong(b) + (inclusive ? ', counting both dates.' : '.')));
    U.setText('weeks', C.plural(Math.floor(total / 7), 'week') + ', ' + C.plural(total % 7, 'day'));
    U.setText('ymd', [C.plural(ymd.years, 'year'), C.plural(ymd.months, 'month'), C.plural(ymd.days, 'day')].join(', '));
    U.setText('months', C.plural(ymd.totalMonths, 'month') + (ymd.days ? ' + ' + C.plural(ymd.days, 'day') : ''));
    U.setText('hours', U.fmt(total * 24) + ' hours');
    $('result').hidden = false;
  }
  U.liveForm('form', run);
  $('swap').addEventListener('click', function () {
    var s = $('start').value; $('start').value = $('end').value; $('end').value = s; run();
  });
  U.setupCopy('copy', 'copy-status');
  run();
})();
