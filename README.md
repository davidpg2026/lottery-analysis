# David's Lottery Analysis

A self-contained statistics site for a range of lottery games. Every chart and
number runs in your browser — there is no server, no build step, and no personal
data is collected. It's descriptive statistics for entertainment only: lottery
draws are independent random events, so nothing here can predict results or
improve anyone's odds.

**Live site:** https://davidpg2026.github.io/lottery-analysis/

## Games covered

**Live from New York State Open Data (data.ny.gov)** — these refresh automatically
in your browser every time the page loads, straight from the official open-data
feed, at no cost:

- **Powerball**, **Mega Millions**, **Millionaire For Life** — multi-state games
  drawn with identical numbers nationwide (full history).
- **NY Lotto**, **Take 5**, **Numbers**, **Win 4** — New York draw games.
- **Pick 10** and **Quick Draw** — keno-style games that draw 20 numbers from 1–80.
  For these, frequency, gap, sum and uniformity stats are shown, but pair/triplet
  co-occurrence tables are omitted because with 20 numbers per draw those counts
  aren't meaningful.

**Illinois games** — **IL Lotto**, **IL Lucky Day Lotto**, **IL Pick 3**, **IL Pick 4**.
Illinois has no free public open-data feed, so these results are stored inside the
page as a snapshot.

## How it stays up to date

The multi-state and New York games need no maintenance — the page reads the live
data.ny.gov feed each time it opens. There is nothing to run and your computer can
be off.

The Illinois games are updated **manually**. They have no open-data feed, and the
Illinois lottery site now blocks automated scraping from GitHub's servers (HTTP 403),
so the old daily Action (`.github/workflows/update.yml`, running `update.py`) can no
longer run reliably — its scheduled trigger is disabled. To refresh Illinois, add the
new draws to the `IL_DATA` block in `index.html` (newest first) and commit. The live
NY and multi-state games are unaffected and keep updating on their own.

## Add another game later

Open `index.html`, find the `GAMES` config block near the top, and add an entry
following the existing pattern:

- **Ball games** need `whiteCount`, `whiteMax`, and (if there's a bonus ball)
  `specialName` / `specialMax`. Set `src:"live"` with an `endpoint` and a
  `liveParse` function for an open-data feed, or `src:"il"` for a built-in snapshot.
- **Digit / Pick-style games** use `type:"digit"` with `digitCount`.
- **Large-field keno-style games** (more than 10 numbers per draw) should set
  `largeField:true` so the expensive co-occurrence analysis is skipped. An optional
  `limit` caps how many recent draws are fetched (useful for very high-volume feeds
  like Quick Draw).

Any game added to `GAMES` automatically gets its own tab.

## Republishing

The site is a single `index.html` plus images. To host it, put the repository on
GitHub Pages (Settings → Pages → Deploy from a branch → `main` / root). Once Pages
is on, the live site updates itself with each visit.
