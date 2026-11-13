#!/usr/bin/env node
/* Dependency-free tests. Run with: node tests/run.js */
'use strict';
var path = require('path');
var fs = require('fs');
var C = require(path.join(__dirname, '..', 'js', 'datecore.js'));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
function eq(actual, expected, msg) {
  var a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + b + ', got ' + a);
}
var D = C.parseISODate;
var iso = C.toISODate;
function hol(year, key) { return C.federalHolidays(year).filter(function (h) { return h.key === key; })[0]; }

console.log('Calendar basics');
test('leap year rules', function () {
  eq([1900, 2000, 2023, 2024, 2100, 2400].map(C.isLeapYear), [false, true, false, true, false, true]);
});
test('days in February', function () {
  eq([C.daysInMonth(2024, 2), C.daysInMonth(2023, 2), C.daysInMonth(1900, 2), C.daysInMonth(2000, 2)], [29, 28, 28, 29]);
});
test('parse rejects invalid dates', function () {
  eq([D('2023-02-29'), D('2024-13-01'), D('2024-04-31'), D('abc'), D('0000-01-01')], [null, null, null, null, null]);
  eq(iso(D('2024-02-29')), '2024-02-29');
});
test('day number round-trips for every day 1600-2400', function () {
  var start = C.toDayNumber(C.makeDate(1600, 1, 1)), end = C.toDayNumber(C.makeDate(2400, 12, 31));
  for (var n = start; n <= end; n++) {
    if (C.toDayNumber(C.fromDayNumber(n)) !== n) throw new Error('mismatch at ' + n);
  }
});
test('day numbers agree with JavaScript Date.UTC', function () {
  ['1970-01-01', '2000-02-29', '1600-03-01', '2026-11-12', '9999-12-31', '0001-01-01'].forEach(function (s) {
    var d = D(s), dt = new Date(0); dt.setUTCFullYear(d.y, d.m - 1, d.d);
    eq(C.toDayNumber(d), Math.round(dt.getTime() / 86400000), s);
  });
});
test('weekdays', function () {
  eq(C.weekday(D('1970-01-01')), 4);
  eq(C.weekday(D('2026-07-04')), 6);
  eq(C.weekday(D('2028-01-01')), 6);
  eq(C.weekday(D('2000-02-29')), 2);
});

console.log('Days between');
test('across a leap day', function () {
  eq(C.diffDays(D('2024-02-28'), D('2024-03-01')), 2);
  eq(C.diffDays(D('2023-02-28'), D('2023-03-01')), 1);
});
test('whole years', function () {
  eq(C.diffDays(D('2024-01-01'), D('2025-01-01')), 366);
  eq(C.diffDays(D('2025-01-01'), D('2026-01-01')), 365);
});
test('negative when end is before start', function () { eq(C.diffDays(D('2026-03-10'), D('2026-03-01')), -9); });
test('DST weeks are still whole days (US and EU change dates)', function () {
  eq(C.diffDays(D('2026-03-07'), D('2026-03-09')), 2);
  eq(C.diffDays(D('2026-10-31'), D('2026-11-02')), 2);
  eq(C.diffDays(D('2026-03-28'), D('2026-03-30')), 2);
});
test('Y/M/D breakdown', function () {
  eq(C.diffYMD(D('2020-01-15'), D('2026-03-20')), { sign: 1, years: 6, months: 2, days: 5, totalMonths: 74 });
  eq(C.diffYMD(D('2026-01-31'), D('2026-03-01')), { sign: 1, years: 0, months: 1, days: 1, totalMonths: 1 });
  eq(C.diffYMD(D('2026-03-20'), D('2020-01-15')).sign, -1);
  eq(C.diffYMD(D('2026-05-05'), D('2026-05-05')), { sign: 1, years: 0, months: 0, days: 0, totalMonths: 0 });
});
test('Y/M/D breakdown is consistent with adding back', function () {
  for (var i = 0; i < 3000; i++) {
    var a = C.fromDayNumber(18000 + (i * 7919) % 4000), b = C.fromDayNumber(18000 + (i * 104729) % 4000);
    if (C.compare(a, b) > 0) { var t = a; a = b; b = t; }
    var r = C.diffYMD(a, b);
    eq(iso(C.addDays(C.addMonths(a, r.totalMonths), r.days)), iso(b), iso(a) + ' -> ' + iso(b));
    if (r.days < 0 || r.months > 11) throw new Error('out of range');
  }
});

console.log('Adding and subtracting');
test('month-end clamping', function () {
  eq(iso(C.addMonths(D('2026-01-31'), 1)), '2026-02-28');
  eq(iso(C.addMonths(D('2024-01-31'), 1)), '2024-02-29');
  eq(iso(C.addMonths(D('2026-03-31'), -1)), '2026-02-28');
  eq(iso(C.addMonths(D('2026-05-31'), 1)), '2026-06-30');
  eq(iso(C.addMonths(D('2026-08-31'), 6)), '2027-02-28');
});
test('leap day plus years', function () {
  eq(iso(C.addYears(D('2024-02-29'), 1)), '2025-02-28');
  eq(iso(C.addYears(D('2024-02-29'), 4)), '2028-02-29');
  eq(iso(C.addYears(D('2000-02-29'), 100)), '2100-02-28');
});
test('crossing year boundaries', function () {
  eq(iso(C.addMonths(D('2026-11-15'), 3)), '2027-02-15');
  eq(iso(C.addMonths(D('2026-02-15'), -14)), '2024-12-15');
  eq(iso(C.addDays(D('2026-12-31'), 1)), '2027-01-01');
  eq(iso(C.addDays(D('2024-03-01'), -1)), '2024-02-29');
});

console.log('Age');
test('basic age', function () {
  var a = C.age(D('1990-06-15'), D('2026-11-12'));
  eq([a.years, a.months, a.days], [36, 4, 28]);
  eq(iso(a.nextBirthday), '2027-06-15');
  eq(a.nextBirthdayAge, 37);
  eq(a.daysUntilNextBirthday, C.diffDays(D('2026-11-12'), D('2027-06-15')));
});
test('birthday today', function () {
  var a = C.age(D('2000-11-12'), D('2026-11-12'));
  eq([a.years, a.months, a.days, a.isBirthday, a.daysUntilNextBirthday], [26, 0, 0, true, 0]);
});
test('leap-day birthday uses Feb 28 in common years', function () {
  var a = C.age(D('2000-02-29'), D('2026-02-28'));
  eq([a.years, a.months, a.days, a.isBirthday], [26, 0, 0, true]);
  var b = C.age(D('2000-02-29'), D('2026-02-27'));
  eq([b.years, iso(b.nextBirthday), b.daysUntilNextBirthday], [25, '2026-02-28', 1]);
  var c = C.age(D('2000-02-29'), D('2028-02-29'));
  eq([c.years, c.isBirthday], [28, true]);
  var d = C.age(D('2000-02-29'), D('2028-02-28'));
  eq([d.years, iso(d.nextBirthday)], [27, '2028-02-29']);
});
test('totals', function () {
  var a = C.age(D('2026-01-01'), D('2026-03-01'));
  eq([a.totalMonths, a.totalDays, a.totalWeeks, a.remainderDays], [2, 59, 8, 3]);
  eq(C.age(D('2027-01-01'), D('2026-01-01')), null);
});

console.log('Federal holidays');
test('July 4, 2026 is a Saturday, observed Friday July 3', function () {
  var h = hol(2026, 'independence');
  eq([iso(h.date), iso(h.observed), h.shifted], ['2026-07-04', '2026-07-03', true]);
});
test('Jan 1, 2028 is a Saturday, observed Friday Dec 31, 2027', function () {
  var h = hol(2028, 'new-years');
  eq([iso(h.date), iso(h.observed)], ['2028-01-01', '2027-12-31']);
  var map = C.observedHolidayMap(D('2027-12-01'), D('2027-12-31'));
  eq(!!map[C.toDayNumber(D('2027-12-31'))], true);
  eq(C.isBusinessDay(D('2027-12-31'), true), false);
  eq(C.isBusinessDay(D('2027-12-31'), false), true);
});
test('Sunday holidays move to Monday', function () {
  var h = hol(2027, 'independence');     // July 4, 2027 is a Sunday
  eq(iso(h.observed), '2027-07-05');
  eq(iso(hol(2022, 'christmas').observed), '2022-12-26');
  eq(iso(hol(2023, 'new-years').observed), '2023-01-02');
});
test('Juneteenth starts in 2021', function () {
  eq(hol(2020, 'juneteenth'), undefined);
  eq(iso(hol(2021, 'juneteenth').observed), '2021-06-18');   // Saturday -> Friday
  eq(iso(hol(2022, 'juneteenth').observed), '2022-06-20');   // Sunday -> Monday
  eq(iso(hol(2026, 'juneteenth').observed), '2026-06-19');
  eq(C.federalHolidays(2020).length, 10);
  eq(C.federalHolidays(2021).length, 11);
});
test('2026 holiday dates', function () {
  eq(C.federalHolidays(2026).map(function (h) { return iso(h.observed); }), [
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-10-12', '2026-11-11', '2026-11-26', '2026-12-25']);
});
test('2025 floating holidays', function () {
  eq(iso(hol(2025, 'mlk').date), '2025-01-20');
  eq(iso(hol(2025, 'washington').date), '2025-02-17');
  eq(iso(hol(2025, 'memorial').date), '2025-05-26');
  eq(iso(hol(2025, 'labor').date), '2025-09-01');
  eq(iso(hol(2025, 'columbus').date), '2025-10-13');
  eq(iso(hol(2025, 'thanksgiving').date), '2025-11-27');
});
test('historical rules: MLK from 1986, Veterans Day in October 1971-1977', function () {
  eq(hol(1985, 'mlk'), undefined);
  eq(iso(hol(1986, 'mlk').date), '1986-01-20');
  eq(iso(hol(1975, 'veterans').date), '1975-10-27');
  eq(iso(hol(1978, 'veterans').date), '1978-11-11');
});

console.log('Business days');
test('one plain work week', function () {
  eq(C.countBusinessDays(D('2026-11-06'), D('2026-11-13'), { holidays: false }).days, 5);
});
test('count skips observed July 3, 2026', function () {
  var r = C.countBusinessDays(D('2026-06-29'), D('2026-07-10'), { includeStart: true });
  eq(r.days, 9);
  eq(r.holidays.map(function (h) { return iso(h.observed); }), ['2026-07-03']);
  eq(C.countBusinessDays(D('2026-06-29'), D('2026-07-10'), { includeStart: true, holidays: false }).days, 10);
});
test('count across New Year 2027/2028 skips Dec 31, 2027', function () {
  var r = C.countBusinessDays(D('2027-12-27'), D('2028-01-07'), { includeStart: true });
  eq(r.days, 9);
  eq(r.holidays.map(function (h) { return h.key; }), ['new-years']);
});
test('reversed count is signed', function () {
  var r = C.countBusinessDays(D('2026-11-13'), D('2026-11-06'), { holidays: false });
  eq([r.days, r.sign], [5, -1]);
});
test('add business days over a weekend and holiday', function () {
  var r = C.addBusinessDays(D('2026-07-02'), 1);               // Thu -> skip Fri Jul 3 (observed), weekend
  eq(iso(r.date), '2026-07-06');
  eq(r.holidays.length, 1);
  eq(iso(C.addBusinessDays(D('2026-07-02'), 1, { holidays: false }).date), '2026-07-03');
  eq(iso(C.addBusinessDays(D('2026-11-25'), 2).date), '2026-11-30');    // skips Thanksgiving
  eq(iso(C.addBusinessDays(D('2026-07-06'), -1).date), '2026-07-02');
  eq(iso(C.addBusinessDays(D('2026-11-13'), 10, { holidays: false }).date), '2026-11-27');
  eq(iso(C.addBusinessDays(D('2026-11-14'), 0).date), '2026-11-14');
});
test('add then count agree', function () {
  for (var i = 0; i < 200; i++) {
    var s = C.fromDayNumber(20000 + i * 13), n = (i % 40) + 1;
    var e = C.addBusinessDays(s, n).date;
    eq(C.countBusinessDays(s, e).days, n, iso(s) + ' +' + n);
  }
});

console.log('Time zones and DST');
test('offsets in New York around DST', function () {
  eq(C.tzOffsetMs(Date.UTC(2026, 0, 15, 12), 'America/New_York') / 3600000, -5);
  eq(C.tzOffsetMs(Date.UTC(2026, 6, 15, 12), 'America/New_York') / 3600000, -4);
});
test('wall time to UTC', function () {
  eq(new Date(C.zonedTimeToUtc(D('2026-12-25'), 0, 0, 0, 'America/Chicago')).toISOString(), '2026-12-25T06:00:00.000Z');
  eq(new Date(C.zonedTimeToUtc(D('2026-07-04'), 12, 0, 0, 'Europe/London')).toISOString(), '2026-07-04T11:00:00.000Z');
  eq(new Date(C.zonedTimeToUtc(D('2027-01-01'), 0, 0, 0, 'Asia/Kolkata')).toISOString(), '2026-12-31T18:30:00.000Z');
  eq(new Date(C.zonedTimeToUtc(D('2027-01-01'), 0, 0, 0, 'UTC')).toISOString(), '2027-01-01T00:00:00.000Z');
});
test('spring forward: noon to noon across the change is 23 hours', function () {
  var a = C.zonedTimeToUtc(D('2026-03-07'), 12, 0, 0, 'America/New_York');
  var b = C.zonedTimeToUtc(D('2026-03-08'), 12, 0, 0, 'America/New_York');
  eq((b - a) / 3600000, 23);
});
test('fall back: noon to noon across the change is 25 hours', function () {
  var a = C.zonedTimeToUtc(D('2026-10-31'), 12, 0, 0, 'America/New_York');
  var b = C.zonedTimeToUtc(D('2026-11-01'), 12, 0, 0, 'America/New_York');
  eq((b - a) / 3600000, 25);
  var e = C.zonedTimeToUtc(D('2026-10-24'), 12, 0, 0, 'Europe/Berlin');
  var f = C.zonedTimeToUtc(D('2026-10-25'), 12, 0, 0, 'Europe/Berlin');
  eq((f - e) / 3600000, 25);
});
test('ambiguous 1:30 AM on fall-back day uses the first (EDT) occurrence', function () {
  eq(new Date(C.zonedTimeToUtc(D('2026-11-01'), 1, 30, 0, 'America/New_York')).toISOString(), '2026-11-01T05:30:00.000Z');
});
test('non-existent 2:30 AM on spring-forward day moves to 3:30 AM EDT', function () {
  eq(new Date(C.zonedTimeToUtc(D('2026-03-08'), 2, 30, 0, 'America/New_York')).toISOString(), '2026-03-08T07:30:00.000Z');
});
test('southern hemisphere DST (Sydney)', function () {
  eq(C.tzOffsetMs(Date.UTC(2026, 0, 15), 'Australia/Sydney') / 3600000, 11);
  eq(C.tzOffsetMs(Date.UTC(2026, 6, 15), 'Australia/Sydney') / 3600000, 10);
});
test('time zone validation', function () {
  eq([C.isValidTimeZone('America/Chicago'), C.isValidTimeZone('Not/AZone'), C.isValidTimeZone('')], [true, false, false]);
});
test('countdown breakdown', function () {
  eq(C.breakdownMs((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000 + 999), { sign: 1, days: 2, hours: 3, minutes: 4, seconds: 5, totalSeconds: 183845 });
  eq(C.breakdownMs(-61000).sign, -1);
});

console.log('Site checks');
var root = path.join(__dirname, '..');
var FOOTER = 'Free and ad-free. If this site helped you, <a href="https://ko-fi.com/marcustravis"';
function htmlFiles(dir) {
  var out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name.charAt(0) === '.' || e.name === 'node_modules' || e.name === 'tests') return;
    var p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(htmlFiles(p));
    else if (/\.html$/.test(e.name)) out.push(p);
  });
  return out;
}
test('every page has the footer, a title, a description, and the analytics beacon', function () {
  var files = htmlFiles(root);
  if (files.length < 9) throw new Error('expected at least 9 pages, found ' + files.length);
  files.forEach(function (f) {
    var html = fs.readFileSync(f, 'utf8'), rel = path.relative(root, f);
    if (html.indexOf(FOOTER) === -1 || html.indexOf('buy me a coffee →</a>') === -1) throw new Error('footer missing in ' + rel);
    if (!/<title>[^<]{10,}<\/title>/.test(html)) throw new Error('title missing in ' + rel);
    if (!/<meta name="description" content="[^"]{50,}">/.test(html)) throw new Error('description missing in ' + rel);
    if (html.indexOf('static.cloudflareinsights.com/beacon.min.js') === -1) throw new Error('beacon missing in ' + rel);
  });
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
