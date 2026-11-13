(function () {
  'use strict';
  var C = window.DateCore, U = window.UI, $ = U.$;
  var p = U.params();
  var FALLBACK_ZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
    'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
    'America/Mexico_City', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'Europe/London', 'Europe/Dublin',
    'Europe/Lisbon', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam',
    'Europe/Stockholm', 'Europe/Warsaw', 'Europe/Athens', 'Europe/Istanbul', 'Europe/Moscow', 'Africa/Cairo',
    'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Nairobi', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata',
    'Asia/Kathmandu', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Shanghai',
    'Asia/Hong_Kong', 'Asia/Manila', 'Asia/Seoul', 'Asia/Tokyo', 'Australia/Perth', 'Australia/Adelaide',
    'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Auckland'];

  function zoneList() {
    var zones = null;
    try {
      if (typeof Intl.supportedValuesOf === 'function') zones = Intl.supportedValuesOf('timeZone').slice();
    } catch (e) { zones = null; }
    if (!zones || !zones.length) zones = FALLBACK_ZONES.filter(C.isValidTimeZone);
    if (zones.indexOf('UTC') === -1) zones.unshift('UTC');
    return zones;
  }

  var localZone = (function () {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
  })();

  var zones = zoneList();
  if (zones.indexOf(localZone) === -1 && C.isValidTimeZone(localZone)) zones.unshift(localZone);
  var sel = $('tz');
  zones.forEach(function (z) {
    var o = document.createElement('option');
    o.value = z;
    o.textContent = z.replace(/_/g, ' ');
    sel.appendChild(o);
  });

  var tzParam = p.get('tz');
  var tz = tzParam && C.isValidTimeZone(tzParam) ? tzParam : localZone;
  if (zones.indexOf(tz) === -1) {
    var extra = document.createElement('option');
    extra.value = tz; extra.textContent = tz.replace(/_/g, ' ');
    sel.insertBefore(extra, sel.firstChild);
  }
  sel.value = tz;

  var t = U.today();
  var defaultTarget = C.makeDate(t.y + 1, 1, 1);
  $('date').value = C.toISODate(U.dateParam(p, 'date') || defaultTarget);
  var timeParam = p.get('time');
  $('time').value = timeParam && /^([01]\d|2[0-3]):[0-5]\d$/.test(timeParam) ? timeParam : '00:00';
  $('title').value = (p.get('title') || '').slice(0, 80);
  $('local-zone').textContent = localZone.replace(/_/g, ' ');

  var target = null, timer = null;

  function describeTarget(ms, zone) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: zone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      }).format(new Date(ms));
    } catch (e) { return new Date(ms).toUTCString(); }
  }

  function tick() {
    if (target === null) return;
    var b = C.breakdownMs(target - Date.now());
    var past = b.sign < 0 && b.totalSeconds > 0;
    U.setText('cd-days', U.fmt(b.days));
    U.setText('cd-hours', String(b.hours).padStart(2, '0'));
    U.setText('cd-minutes', String(b.minutes).padStart(2, '0'));
    U.setText('cd-seconds', String(b.seconds).padStart(2, '0'));
    U.setText('cd-state', past ? 'This moment has passed. Time since:' : (b.totalSeconds === 0 ? 'It is time!' : 'Time remaining:'));
    var mins = Math.floor(b.totalSeconds / 60);
    var summary = (past ? 'Passed ' : 'In ') + C.plural(b.days, 'day') + ', ' + C.plural(b.hours, 'hour') + ', ' + C.plural(b.minutes % 60, 'minute');
    // Announce to screen readers once a minute, not every second.
    if (mins !== tick.lastMins) { tick.lastMins = mins; U.setText('cd-live', summary); }
    document.title = (past ? '-' : '') + b.days + 'd ' + b.hours + 'h ' + b.minutes + 'm' +
      ($('title').value.trim() ? ' – ' + $('title').value.trim() : '') + ' | Countdown';
  }

  function run() {
    var date = C.parseISODate($('date').value);
    var time = $('time').value || '00:00';
    var zone = sel.value;
    var title = $('title').value.trim().slice(0, 80);
    U.writeParams({ date: $('date').value, time: time === '00:00' ? '' : time, tz: zone, title: title });
    if (timer) { clearInterval(timer); timer = null; }
    if (!date || !/^\d{2}:\d{2}$/.test(time) || !C.isValidTimeZone(zone)) {
      target = null; $('result').hidden = true;
      U.setText('error', 'Enter a valid date, time, and time zone.');
      return;
    }
    U.setText('error', '');
    var hm = time.split(':');
    var h = +hm[0], mi = +hm[1];
    target = C.zonedTimeToUtc(date, h, mi, 0, zone);
    var wall = C.zonedFields(target, zone);
    var adjusted = wall.h !== h || wall.mi !== mi;
    U.setText('cd-heading', title || 'Countdown');
    U.setText('target-zone', describeTarget(target, zone) + ' in ' + zone.replace(/_/g, ' '));
    U.setText('target-local', zone === localZone ? '' : 'That is ' + describeTarget(target, localZone) + ' where you are (' + localZone.replace(/_/g, ' ') + ').');
    U.setText('dst-note', adjusted ? 'Note: ' + time + ' does not exist on that date in ' + zone.replace(/_/g, ' ') +
      ' because the clocks spring forward, so the countdown uses the moment the clocks jump past it.' : '');
    $('result').hidden = false;
    tick.lastMins = null;
    tick();
    timer = setInterval(tick, 250);
  }
  U.liveForm('form', run);
  $('use-local').addEventListener('click', function () { sel.value = localZone; run(); });
  U.setupCopy('copy', 'copy-status');
  run();
})();
