# date-calculator

Free, ad-free date, age, and business-day calculator.

**Live site:** https://date-calculator-2j5.pages.dev/

## Tools

| Page | URL | What it does |
| --- | --- | --- |
| Home | `/` | Links to every tool |
| Days between dates | `/days-between/` | Total days, weeks + days, years/months/days, optional inclusive end date |
| Add / subtract | `/add-subtract/` | Moves a date by years, months, weeks, and days with month-end clamping |
| Age | `/age/` | Exact age, totals in months/weeks/days, next-birthday countdown |
| Business days | `/business-days/` | Counts or adds workdays, skipping weekends and (optionally) observed U.S. federal holidays |
| Federal holidays | `/federal-holidays/` | Actual and observed federal holidays for any year from 1971 |
| Countdown | `/countdown/` | Live countdown to a date and time in any IANA time zone |
| About | `/about/` | Methods and sources |

Every page keeps its inputs in the query string (for example
`/business-days/?start=2026-06-29&end=2026-07-10&incstart=1`), so any result can be bookmarked or shared.

## How it is built

Plain static HTML, CSS, and vanilla JavaScript. There is no build step, no framework, and no runtime
dependency; the repository root is served as-is.

- `js/datecore.js` – all date logic (works in the browser and in Node). Dates are `{y, m, d}` values
  converted to integer day numbers, so no calculation depends on clock time or daylight saving time.
- `js/ui.js` – shared page helpers (URL state, copy-link button).
- `js/pages/*.js` – one small script per tool.
- `css/style.css` – single stylesheet; light and dark themes follow `prefers-color-scheme`.
- `_headers` – security headers for Cloudflare Pages.
- `sitemap.xml`, `robots.txt`, `404.html`.

### Rules worth knowing

- Adding months clamps to the end of the month: Jan 31 + 1 month = Feb 28 (Feb 29 in leap years).
- Years/months/days differences count the most whole months that fit, then the leftover days.
- Leap-day birthdays are counted on Feb 28 in common years.
- Federal holidays follow 5 U.S.C. 6103 and OPM's observance rules: Saturday holidays are observed on
  the Friday before, Sunday holidays on the Monday after (so Jan 1, 2028 is observed Fri Dec 31, 2027).
  Juneteenth is included from 2021, MLK Day from 1986; Veterans Day uses the 1971–1977 October rule.
- Business-day counts exclude the start date and include the end date unless you tick "count the start date".
- Countdown times are converted with the browser's IANA time zone data (`Intl`). Ambiguous fall-back
  times use the first occurrence; skipped spring-forward times move forward past the gap.

## Tests

```sh
node tests/run.js
```

No dependencies. The suite covers leap years, month-end clamping, Y/M/D round-trips, ages and
leap-day birthdays, every 2026 holiday, observed shifts (July 4, 2026 → Fri July 3; Jan 1, 2028 →
Fri Dec 31, 2027; Sunday → Monday cases), Juneteenth before and after 2021, business-day counting
and adding, DST transitions in New York, Berlin, and Sydney, and a site check that every page has a
title, a meta description, the footer, and the analytics beacon. It exits non-zero on any failure.

## Deploy

Hosted on Cloudflare Pages (project `date-calculator`), connected to this GitHub repository:

- Production branch: `main` (every push to `main` deploys to production; other branches get preview URLs)
- Build command: none
- Output directory: `/` (repository root)

Analytics: Cloudflare Web Analytics (cookieless). The beacon snippet is included at the bottom of every
HTML page. No ads, trackers, or cookies.

To preview locally, serve the folder with any static server, e.g. `python3 -m http.server`, and open
http://localhost:8000/.

## Support

Free and ad-free. If this site helped you, [buy me a coffee →](https://ko-fi.com/marcustravis)
