(function () {
  'use strict';
  var C = window.DateCore, U = window.UI, $ = U.$;
  var p = U.params();
  var dob = U.dateParam(p, 'dob');
  if (dob) $('dob').value = C.toISODate(dob);
  $('on').value = C.toISODate(U.dateParam(p, 'on') || U.today());

  function run() {
    var b = C.parseISODate($('dob').value), on = C.parseISODate($('on').value);
    var isToday = on && C.compare(on, U.today()) === 0;
    U.writeParams({ dob: $('dob').value, on: isToday ? '' : $('on').value });
    if (!b) { $('result').hidden = true; U.setText('error', $('dob').value ? 'Enter a valid date of birth.' : ''); return; }
    if (!on) { $('result').hidden = true; U.setText('error', 'Enter a valid "age on" date.'); return; }
    var a = C.age(b, on);
    if (!a) { $('result').hidden = true; U.setText('error', 'The date of birth is after the "age on" date.'); return; }
    U.setText('error', '');
    U.setText('age', C.plural(a.years, 'year') + ', ' + C.plural(a.months, 'month') + ', ' + C.plural(a.days, 'day'));
    U.setText('age-sub', 'Born ' + C.formatLong(b) + '. Age ' + (isToday ? 'today' : 'on ' + C.formatLong(on)) + '.');
    U.setText('t-months', C.plural(a.totalMonths, 'month') + (a.days ? ' + ' + C.plural(a.days, 'day') : ''));
    U.setText('t-weeks', C.plural(a.totalWeeks, 'week') + (a.remainderDays ? ' + ' + C.plural(a.remainderDays, 'day') : ''));
    U.setText('t-days', C.plural(a.totalDays, 'day'));
    U.setText('t-hours', U.fmt(a.totalDays * 24) + ' hours (approx.)');
    if (a.isBirthday) {
      U.setText('next', a.years === 0 ? 'Born on this day.' : 'Happy birthday! Turns ' + a.years + ' on this day.');
    } else {
      U.setText('next', 'Next birthday: ' + C.formatLong(a.nextBirthday) + ' (turning ' + a.nextBirthdayAge + '), in ' +
        C.plural(a.daysUntilNextBirthday, 'day') + '.');
    }
    var leap = b.m === 2 && b.d === 29;
    U.setText('leap', leap ? 'Leap-day birthday: in common years this calculator counts the birthday on February 28. See the note below.' : '');
    $('result').hidden = false;
  }
  U.liveForm('form', run);
  U.setupCopy('copy', 'copy-status');
  run();
})();
