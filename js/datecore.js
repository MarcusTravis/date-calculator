/*
 * datecore.js — calendar math for the date calculator.
 * Every calculation works on plain {y, m, d} calendar dates (proleptic
 * Gregorian, m is 1-12) converted to an integer day number, so there is no
 * clock time and nothing can drift across a daylight-saving change.
 * Works in the browser (window.DateCore) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  var MS_PER_DAY = 86400000;
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(y, m) {
    if (m === 2) return isLeapYear(y) ? 29 : 28;
    return (m === 4 || m === 6 || m === 9 || m === 11) ? 30 : 31;
  }

  function floorDiv(a, b) { return Math.floor(a / b); }

  // Day number: 0 = 1970-01-01. Uses 400-year Gregorian cycles shifted so the
  // year starts in March, which puts the leap day at the end of the year.
  function toDayNumber(date) {
    var y = date.y, m = date.m, d = date.d;
    if (m <= 2) y -= 1;
    var era = floorDiv(y, 400);
    var yoe = y - era * 400;                       // 0..399
    var mp = (m + 9) % 12;                         // March = 0 ... February = 11
    var doy = floorDiv(153 * mp + 2, 5) + d - 1;   // 0..365
    var doe = yoe * 365 + floorDiv(yoe, 4) - floorDiv(yoe, 100) + doy;
    return era * 146097 + doe - 719468;
  }

  function fromDayNumber(n) {
    var z = n + 719468;
    var era = floorDiv(z, 146097);
    var doe = z - era * 146097;
    var yoe = floorDiv(doe - floorDiv(doe, 1460) + floorDiv(doe, 36524) - floorDiv(doe, 146096), 365);
    var y = yoe + era * 400;
    var doy = doe - (365 * yoe + floorDiv(yoe, 4) - floorDiv(yoe, 100));
    var mp = floorDiv(5 * doy + 2, 153);
    var d = doy - floorDiv(153 * mp + 2, 5) + 1;
    var m = mp < 10 ? mp + 3 : mp - 9;
    if (m <= 2) y += 1;
    return { y: y, m: m, d: d };
  }

  function makeDate(y, m, d) { return { y: y, m: m, d: d }; }

  function isValidDate(date) {
    return !!date && Number.isInteger(date.y) && Number.isInteger(date.m) && Number.isInteger(date.d) &&
      date.m >= 1 && date.m <= 12 && date.d >= 1 && date.d <= daysInMonth(date.y, date.m);
  }

  // Accepts YYYY-MM-DD (years 0001-9999). Returns null for anything invalid.
  function parseISODate(str) {
    if (typeof str !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
    if (!m) return null;
    var date = makeDate(+m[1], +m[2], +m[3]);
    if (date.y < 1) return null;
    return isValidDate(date) ? date : null;
  }

  function pad(n, len) {
    var s = String(Math.abs(n));
    while (s.length < len) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
  }

  function toISODate(date) {
    return pad(date.y, 4) + '-' + pad(date.m, 2) + '-' + pad(date.d, 2);
  }

  function compare(a, b) { return toDayNumber(a) - toDayNumber(b); }

  function weekday(date) {           // 0 = Sunday ... 6 = Saturday
    return ((toDayNumber(date) + 4) % 7 + 7) % 7; // 1970-01-01 was a Thursday
  }

  function addDays(date, n) { return fromDayNumber(toDayNumber(date) + n); }

  function diffDays(a, b) { return toDayNumber(b) - toDayNumber(a); }

  // Adds whole months; if the day does not exist in the target month it is
  // clamped to that month's last day (Jan 31 + 1 month = Feb 28 or 29).
  function addMonths(date, n) {
    var total = date.y * 12 + (date.m - 1) + n;
    var y = floorDiv(total, 12);
    var m = total - y * 12 + 1;
    return makeDate(y, m, Math.min(date.d, daysInMonth(y, m)));
  }

  function addYears(date, n) { return addMonths(date, n * 12); }

  // Years, months, and days from a to b, defined so that
  // addDays(addMonths(a, years*12 + months), days) === b (for a <= b).
  // The month count is the largest whole number of (clamped) months that does
  // not pass b. If b is before a, the result describes b -> a with sign -1.
  function diffYMD(a, b) {
    var sign = 1;
    if (compare(a, b) > 0) { var t = a; a = b; b = t; sign = -1; }
    var months = (b.y - a.y) * 12 + (b.m - a.m);
    if (months > 0 && compare(addMonths(a, months), b) > 0) months -= 1;
    if (months < 0) months = 0;
    var anchor = addMonths(a, months);
    return {
      sign: sign,
      years: floorDiv(months, 12),
      months: months % 12,
      days: diffDays(anchor, b),
      totalMonths: months
    };
  }

  // Age on a given date. Leap-day birthdays: in common years the birthday is
  // treated as February 28 (the same month-end clamping used everywhere else).
  function age(birth, onDate) {
    if (compare(birth, onDate) > 0) return null;
    var ymd = diffYMD(birth, onDate);
    var totalDays = diffDays(birth, onDate);
    var years = ymd.years;
    var next = addYears(birth, years);
    if (compare(next, onDate) < 0) next = addYears(birth, years + 1);
    // next is the next birthday on or after onDate
    var nextIsToday = compare(next, onDate) === 0;
    return {
      years: ymd.years,
      months: ymd.months,
      days: ymd.days,
      totalMonths: ymd.totalMonths,
      totalWeeks: Math.floor(totalDays / 7),
      remainderDays: totalDays % 7,
      totalDays: totalDays,
      isBirthday: nextIsToday,
      nextBirthday: next,
      nextBirthdayAge: nextIsToday ? years : years + 1,
      daysUntilNextBirthday: diffDays(onDate, next)
    };
  }

  function nthWeekdayOfMonth(y, m, wd, n) {     // n = 1..5
    var first = weekday(makeDate(y, m, 1));
    var d = 1 + ((wd - first + 7) % 7) + (n - 1) * 7;
    return makeDate(y, m, d);
  }

  function lastWeekdayOfMonth(y, m, wd) {
    var last = makeDate(y, m, daysInMonth(y, m));
    var back = (weekday(last) - wd + 7) % 7;
    return addDays(last, -back);
  }

  // Saturday -> preceding Friday, Sunday -> following Monday.
  function observedDate(date) {
    var wd = weekday(date);
    if (wd === 6) return addDays(date, -1);
    if (wd === 0) return addDays(date, 1);
    return date;
  }

  var HOLIDAY_MIN_YEAR = 1971;   // Uniform Monday Holiday Act took effect in 1971
  var HOLIDAY_MAX_YEAR = 9998;

  // U.S. federal holidays under 5 U.S.C. 6103 for a calendar year, in date order.
  // Each entry: { key, name, rule, date (actual), observed, shifted }.
  // Note: an observed date can fall in the previous year (Jan 1 on a Saturday).
  function federalHolidays(year) {
    if (!Number.isInteger(year) || year < HOLIDAY_MIN_YEAR || year > HOLIDAY_MAX_YEAR) return [];
    var list = [];
    function add(key, name, rule, date) {
      var obs = observedDate(date);
      list.push({ key: key, name: name, rule: rule, date: date, observed: obs, shifted: compare(obs, date) !== 0 });
    }
    add('new-years', "New Year's Day", 'January 1', makeDate(year, 1, 1));
    if (year >= 1986) {
      add('mlk', 'Birthday of Martin Luther King, Jr.', 'Third Monday in January', nthWeekdayOfMonth(year, 1, 1, 3));
    }
    add('washington', "Washington's Birthday", 'Third Monday in February', nthWeekdayOfMonth(year, 2, 1, 3));
    add('memorial', 'Memorial Day', 'Last Monday in May', lastWeekdayOfMonth(year, 5, 1));
    if (year >= 2021) {
      add('juneteenth', 'Juneteenth National Independence Day', 'June 19', makeDate(year, 6, 19));
    }
    add('independence', 'Independence Day', 'July 4', makeDate(year, 7, 4));
    add('labor', 'Labor Day', 'First Monday in September', nthWeekdayOfMonth(year, 9, 1, 1));
    add('columbus', 'Columbus Day', 'Second Monday in October', nthWeekdayOfMonth(year, 10, 1, 2));
    if (year >= 1978) {
      add('veterans', 'Veterans Day', 'November 11', makeDate(year, 11, 11));
    } else {
      add('veterans', 'Veterans Day', 'Fourth Monday in October (1971-1977)', nthWeekdayOfMonth(year, 10, 1, 4));
    }
    add('thanksgiving', 'Thanksgiving Day', 'Fourth Thursday in November', nthWeekdayOfMonth(year, 11, 4, 4));
    add('christmas', 'Christmas Day', 'December 25', makeDate(year, 12, 25));
    list.sort(function (a, b) { return compare(a.date, b.date); });
    return list;
  }

  // Map of day number -> holiday entry for every observed holiday whose
  // observed date falls between from and to (inclusive).
  function observedHolidayMap(from, to) {
    var map = {};
    var lo = toDayNumber(from), hi = toDayNumber(to);
    for (var y = from.y - 1; y <= to.y + 1; y++) {
      federalHolidays(y).forEach(function (h) {
        var n = toDayNumber(h.observed);
        if (n >= lo && n <= hi) map[n] = h;
      });
    }
    return map;
  }

  function isWeekend(date) { var w = weekday(date); return w === 0 || w === 6; }

  var MAX_RANGE_DAYS = 400 * 366;

  // Counts business days between start and end. By default the start date is
  // excluded and the end date is included (like counting "days after start").
  // Returns { days, weekendDays, holidays: [entries skipped], sign }.
  function countBusinessDays(start, end, opts) {
    opts = opts || {};
    var useHolidays = opts.holidays !== false;
    var includeStart = !!opts.includeStart;
    var includeEnd = opts.includeEnd !== false;
    var sign = 1;
    if (compare(start, end) > 0) { var t = start; start = end; end = t; sign = -1; }
    var lo = toDayNumber(start), hi = toDayNumber(end);
    if (hi - lo > MAX_RANGE_DAYS) throw new RangeError('Range too large');
    if (!includeStart) lo += 1;
    if (!includeEnd) hi -= 1;
    var result = { days: 0, weekendDays: 0, holidays: [], sign: sign };
    if (hi < lo) return result;
    var hmap = useHolidays ? observedHolidayMap(fromDayNumber(lo), fromDayNumber(hi)) : {};
    for (var n = lo; n <= hi; n++) {
      var wd = ((n + 4) % 7 + 7) % 7;
      if (wd === 0 || wd === 6) { result.weekendDays++; continue; }
      if (hmap[n]) { result.holidays.push(hmap[n]); continue; }
      result.days++;
    }
    return result;
  }

  function isBusinessDay(date, useHolidays) {
    if (isWeekend(date)) return false;
    if (!useHolidays) return true;
    return !observedHolidayMap(date, date)[toDayNumber(date)];
  }

  // Moves n business days from start (negative n goes backward). The start
  // date itself is never counted. Returns { date, holidays: [skipped], weekendDays }.
  function addBusinessDays(start, n, opts) {
    opts = opts || {};
    var useHolidays = opts.holidays !== false;
    if (Math.abs(n) > 100000) throw new RangeError('Too many business days');
    var step = n < 0 ? -1 : 1;
    var remaining = Math.abs(n);
    var cur = toDayNumber(start);
    var skipped = [], weekendDays = 0;
    var cacheYear = null, hmap = {};
    while (remaining > 0) {
      cur += step;
      var date = fromDayNumber(cur);
      var wd = ((cur + 4) % 7 + 7) % 7;
      if (wd === 0 || wd === 6) { weekendDays++; continue; }
      if (useHolidays) {
        if (cacheYear !== date.y) {
          cacheYear = date.y;
          hmap = observedHolidayMap(makeDate(date.y, 1, 1), makeDate(date.y, 12, 31));
        }
        if (hmap[cur]) { skipped.push(hmap[cur]); continue; }
      }
      remaining--;
    }
    return { date: fromDayNumber(cur), holidays: skipped, weekendDays: weekendDays };
  }

  /* ---------- Time zones (for the countdown) ---------- */

  var dtfCache = {};
  function getFormatter(tz) {
    if (!dtfCache[tz]) {
      dtfCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', era: 'short'
      });
    }
    return dtfCache[tz];
  }

  function isValidTimeZone(tz) {
    if (typeof tz !== 'string' || !tz) return false;
    try { getFormatter(tz); return true; } catch (e) { return false; }
  }

  // Wall-clock fields of an instant (ms since epoch) in a time zone.
  function zonedFields(ms, tz) {
    var parts = getFormatter(tz).formatToParts(new Date(ms));
    var f = {};
    parts.forEach(function (p) { f[p.type] = p.value; });
    var y = +f.year;
    if (f.era && /^B/i.test(f.era)) y = 1 - y;
    return { y: y, m: +f.month, d: +f.day, h: +f.hour % 24, mi: +f.minute, s: +f.second };
  }

  // Offset of the time zone from UTC at an instant, in milliseconds.
  function tzOffsetMs(ms, tz) {
    var f = zonedFields(ms, tz);
    var asUTC = toDayNumber(f) * MS_PER_DAY + ((f.h * 60 + f.mi) * 60 + f.s) * 1000;
    var whole = Math.floor(ms / 1000) * 1000;
    return asUTC - whole;
  }

  // Converts a wall-clock time in a time zone to an instant (ms since epoch).
  // Ambiguous times (clocks fall back) resolve to the earlier instant; times
  // that do not exist (clocks spring forward) move forward by the gap, the way
  // a clock that skipped ahead would read.
  function zonedTimeToUtc(date, h, mi, s, tz) {
    var local = toDayNumber(date) * MS_PER_DAY + ((h * 60 + mi) * 60 + (s || 0)) * 1000;
    var o1 = tzOffsetMs(local - 86400000 / 2, tz);   // offsets around the local time
    var o2 = tzOffsetMs(local + 86400000 / 2, tz);
    var candidates = [];
    [o1, o2].forEach(function (o) {
      var u = local - o;
      if (tzOffsetMs(u, tz) === o && candidates.indexOf(u) === -1) candidates.push(u);
    });
    if (candidates.length) return Math.min.apply(null, candidates);
    // Non-existent local time (in a DST gap): use the offset from before the gap.
    return local - Math.min(o1, o2);
  }

  function breakdownMs(ms) {
    var sign = ms < 0 ? -1 : 1;
    var total = Math.floor(Math.abs(ms) / 1000);
    return {
      sign: sign,
      days: Math.floor(total / 86400),
      hours: Math.floor(total % 86400 / 3600),
      minutes: Math.floor(total % 3600 / 60),
      seconds: total % 60,
      totalSeconds: total
    };
  }

  /* ---------- Formatting helpers ---------- */

  function formatLong(date) {
    return WEEKDAY_NAMES[weekday(date)] + ', ' + MONTH_NAMES[date.m - 1] + ' ' + date.d + ', ' + date.y;
  }

  function formatShort(date) {
    return MONTH_NAMES[date.m - 1].slice(0, 3) + ' ' + date.d + ', ' + date.y;
  }

  function plural(n, word) {
    return n.toLocaleString('en-US') + ' ' + word + (Math.abs(n) === 1 ? '' : 's');
  }

  var api = {
    MONTH_NAMES: MONTH_NAMES, WEEKDAY_NAMES: WEEKDAY_NAMES,
    HOLIDAY_MIN_YEAR: HOLIDAY_MIN_YEAR, HOLIDAY_MAX_YEAR: HOLIDAY_MAX_YEAR,
    isLeapYear: isLeapYear, daysInMonth: daysInMonth, makeDate: makeDate, isValidDate: isValidDate,
    parseISODate: parseISODate, toISODate: toISODate, toDayNumber: toDayNumber, fromDayNumber: fromDayNumber,
    compare: compare, weekday: weekday, addDays: addDays, diffDays: diffDays, addMonths: addMonths,
    addYears: addYears, diffYMD: diffYMD, age: age, nthWeekdayOfMonth: nthWeekdayOfMonth,
    lastWeekdayOfMonth: lastWeekdayOfMonth, observedDate: observedDate, federalHolidays: federalHolidays,
    observedHolidayMap: observedHolidayMap, isWeekend: isWeekend, isBusinessDay: isBusinessDay,
    countBusinessDays: countBusinessDays, addBusinessDays: addBusinessDays,
    isValidTimeZone: isValidTimeZone, zonedFields: zonedFields, tzOffsetMs: tzOffsetMs,
    zonedTimeToUtc: zonedTimeToUtc, breakdownMs: breakdownMs,
    formatLong: formatLong, formatShort: formatShort, plural: plural
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DateCore = api;
})(typeof self !== 'undefined' ? self : this);
