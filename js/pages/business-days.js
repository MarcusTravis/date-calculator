(function () {
  'use strict';
  var C = window.DateCore, U = window.UI, $ = U.$;
  var p = U.params();
  var t = U.today();
  var mode = p.get('mode') === 'add' ? 'add' : 'count';
  $(mode === 'add' ? 'mode-add' : 'mode-count').checked = true;
  $('start').value = C.toISODate(U.dateParam(p, 'start') || t);
  $('end').value = C.toISODate(U.dateParam(p, 'end') || C.addDays(t, 30));
  var n = U.intParam(p, 'n', -100000, 100000);
  $('n').value = String(n === null ? 10 : n);
  $('holidays').checked = U.boolParam(p, 'holidays', true);
  $('incstart').checked = U.boolParam(p, 'incstart', false);

  function renderHolidays(list, useHolidays) {
    var ul = $('skipped');
    ul.textContent = '';
    if (!useHolidays) { U.setText('skipped-head', 'Federal holidays are not being skipped.'); return; }
    U.setText('skipped-head', list.length ? 'Federal holidays skipped (' + list.length + '):' :
      'No weekday federal holidays fell in this range.');
    list.forEach(function (h) {
      var li = document.createElement('li');
      li.textContent = C.formatLong(h.observed) + ' — ' + h.name +
        (h.shifted ? ' (falls on ' + C.WEEKDAY_NAMES[C.weekday(h.date)] + ' ' + C.formatShort(h.date) + ')' : '');
      ul.appendChild(li);
    });
  }

  function show() {
    var add = $('mode-add').checked;
    $('count-fields').hidden = add;
    $('add-fields').hidden = !add;
    $('incstart-row').hidden = add;
    return add;
  }

  function fail(msg) { $('result').hidden = true; U.setText('error', msg); }

  function run() {
    var add = show();
    var start = C.parseISODate($('start').value);
    var useHolidays = $('holidays').checked;
    var nRaw = $('n').value.trim();
    U.writeParams({
      mode: add ? 'add' : '', start: $('start').value,
      end: add ? '' : $('end').value, incstart: add ? '' : $('incstart').checked,
      n: add ? nRaw : '', holidays: useHolidays ? '' : '0'
    });
    if (!start) return fail('Enter a valid start date.');
    try {
      if (add) {
        if (!/^-?\d+$/.test(nRaw) || Math.abs(parseInt(nRaw, 10)) > 100000) return fail('Enter a whole number of business days (up to 100,000; negative to go back).');
        var k = parseInt(nRaw, 10);
        var r = C.addBusinessDays(start, k, { holidays: useHolidays });
        if (r.date.y < C.HOLIDAY_MIN_YEAR || r.date.y > 9999) return fail('The result is outside the supported years (' + C.HOLIDAY_MIN_YEAR + ' to 9999).');
        U.setText('error', '');
        U.setText('big', C.formatLong(r.date));
        U.setText('sub', C.plural(Math.abs(k), 'business day') + (k < 0 ? ' before ' : ' after ') + C.formatLong(start) +
          '. Skipped ' + C.plural(r.weekendDays, 'weekend day') + (useHolidays ? ' and ' + C.plural(r.holidays.length, 'holiday') : '') +
          '; ' + C.plural(Math.abs(C.diffDays(start, r.date)), 'calendar day') + ' in total.');
        renderHolidays(r.holidays, useHolidays);
      } else {
        var end = C.parseISODate($('end').value);
        if (!end) return fail('Enter a valid end date.');
        var c = C.countBusinessDays(start, end, { holidays: useHolidays, includeStart: $('incstart').checked });
        U.setText('error', '');
        U.setText('big', C.plural(c.days, 'business day'));
        var cal = Math.abs(C.diffDays(start, end));
        U.setText('sub', (c.sign < 0 ? 'Counted backward from ' : 'From ') + C.formatLong(start) + ' to ' + C.formatLong(end) +
          ' (' + ($('incstart').checked ? 'both dates counted' : 'start date not counted, end date counted') + '). ' +
          C.plural(c.weekendDays, 'weekend day') + (useHolidays ? ' and ' + C.plural(c.holidays.length, 'holiday') : '') +
          ' excluded out of ' + C.plural(cal + ($('incstart').checked ? 1 : 0), 'calendar day') + '.');
        renderHolidays(c.holidays, useHolidays);
      }
      $('result').hidden = false;
    } catch (e) {
      fail('That range is too large. Try a span under 400 years.');
    }
  }
  U.liveForm('form', run);
  U.setupCopy('copy', 'copy-status');
  run();
})();
