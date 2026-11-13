(function () {
  'use strict';
  var C = window.DateCore, U = window.UI, $ = U.$;
  var p = U.params();
  var y = U.intParam(p, 'year', C.HOLIDAY_MIN_YEAR, C.HOLIDAY_MAX_YEAR);
  $('year').value = String(y === null ? U.today().y : y);

  function cell(tr, text, html) {
    var td = document.createElement('td');
    td.textContent = text;
    if (html) td.appendChild(html);
    tr.appendChild(td);
    return td;
  }

  function run() {
    var raw = $('year').value.trim();
    var year = /^\d{4}$/.test(raw) ? parseInt(raw, 10) : NaN;
    var isCurrent = year === U.today().y;
    U.writeParams({ year: isCurrent ? '' : raw });
    var body = $('rows');
    body.textContent = '';
    if (!(year >= C.HOLIDAY_MIN_YEAR && year <= C.HOLIDAY_MAX_YEAR)) {
      $('result').hidden = true;
      U.setText('error', 'Enter a year from ' + C.HOLIDAY_MIN_YEAR + ' to ' + C.HOLIDAY_MAX_YEAR + '.');
      return;
    }
    U.setText('error', '');
    var list = C.federalHolidays(year);
    list.forEach(function (h) {
      var tr = document.createElement('tr');
      cell(tr, h.name);
      cell(tr, C.WEEKDAY_NAMES[C.weekday(h.date)].slice(0, 3) + ', ' + C.formatShort(h.date));
      var obs = cell(tr, C.WEEKDAY_NAMES[C.weekday(h.observed)].slice(0, 3) + ', ' + C.formatShort(h.observed));
      if (h.shifted) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = h.observed.y !== year ? 'shifted to ' + h.observed.y : 'shifted';
        obs.appendChild(tag);
      }
      cell(tr, h.rule);
      body.appendChild(tr);
    });
    U.setText('caption', 'U.S. federal holidays in ' + year + ' (' + list.length + ')');
    var notes = [];
    if (year < 2021) notes.push('Juneteenth became a federal holiday in 2021, so it is not listed for ' + year + '.');
    if (year < 1986) notes.push('Birthday of Martin Luther King, Jr. was first observed as a federal holiday in 1986.');
    if (year < 1978) notes.push('From 1971 through 1977, Veterans Day was the fourth Monday in October.');
    var next = C.federalHolidays(year + 1).filter(function (h) { return h.observed.y === year; });
    next.forEach(function (h) {
      notes.push(h.name + ' ' + (year + 1) + ' falls on a Saturday, so it is observed on ' + C.formatLong(h.observed) + ', in ' + year + '.');
    });
    U.setText('year-notes', notes.join(' '));
    $('result').hidden = false;
  }
  U.liveForm('form', run);
  $('prev').addEventListener('click', function () { var v = parseInt($('year').value, 10); if (v > C.HOLIDAY_MIN_YEAR) { $('year').value = v - 1; run(); } });
  $('next').addEventListener('click', function () { var v = parseInt($('year').value, 10); if (v < C.HOLIDAY_MAX_YEAR) { $('year').value = v + 1; run(); } });
  U.setupCopy('copy', 'copy-status');
  run();
})();
