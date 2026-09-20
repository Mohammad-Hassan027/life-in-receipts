# Your Life, In Receipts 🧾

**Track:** Advanced · **Constraint:** frontend-only, 6 hours, no backend.

Three raw datasets → one 713 KB JSON → four ways to read a life.

> Not a timeline. A statement. Every scroll, click, and slider on this app
> exists to answer one question: *what does it mean when you put these
> moments next to each other?*

---

## The data

| Source | Rows | Span | Used for |
|---|---|---|---|
| Spotify listening history | 149,860 plays | Jul 2013 – Dec 2024 | music, mood, skip/shuffle behaviour, time-of-day |
| Daily Household Transactions | 2,461 txns | 2015 – Sep 2018 | spending, categories, place-to-place travel notes |
| Augmented IndiaTransactMultiFacet2024 | 10,267 txns (filtered to ~2,900 in Maharashtra) | 2022 – 2024 | later-era spending, kept geographically consistent with the household ledger |

Everything ships baked into `public/data/receipts.json`. **There is no
runtime dependency on the raw CSVs, no backend, no database.** The three
source files only matter if you want to re-run the pipeline yourself.

## What we found (the real findings, not filler)

These are the six anomalies that drive **THE AUDIT**, each verified directly
against the CSVs before being written into the narrative:

- **The Missing Year** — zero plays for 368 straight days (9 Jan 2014 → 12 Jan 2015)
- **The Skip Cliff** — skip rate falls 78.7% (2015) → 3.6% (2016) → ~0.0% (2017–2021, 11 skips across 103k plays)
- **The Conversion** — The Beatles enter in 2016 and are the #1 artist in 8 of the next 9 years; no other artist survives more than 3
- **The Long Night** — busiest hour of the whole record is 23:00; 2021 alone logs 7,527 plays between midnight and 5am
- **Otra Vida** — Spanish-language listening holds at 50–150 plays/year for 7 years, spikes to 993 in 2022, collapses back to 259
- **Taste clusters, quantified** — the co-occurrence graph separates cleanly into film-score (Shore/Williams/Morricone, 5.7–6.5× lift), ranchera (Fernández/Infante/Jiménez, 4.7–5.1×), and a Sabina↔Drexler pairing at 11.9× lift

632 days have **both** a music record and a spending record — that overlap
is the connective tissue the whole app is built on.

## The four views

| View | What it is | Which requirement it satisfies |
|---|---|---|
| **THE ROLL** | 8 narrative chapters, each rendered as a torn thermal receipt with a stat block and a `TOTAL` line that is never money (*TOTAL NIGHTS AWAKE: 13,828 PLAYS*, *TOTAL SILENCE: 368 DAYS*) | Interactive storytelling · visual journey |
| **THE WEB** | Dependency-free canvas force-graph. Nodes = artists/spend categories/purchases/places. An edge exists only if two things happened on the *same day*; edge weight is **lift over chance**, not raw count — so it surfaces surprise, not just frequency | Relationship/pattern discovery mechanism |
| **THE AUDIT** | The six anomalies above, presented as disputed charges you "investigate" — click to expand evidence and a year-by-year chart | Meaningful pattern discovery, second angle |
| **ONE DAY** | 124 fully itemised days, minute-by-minute, music and money interleaved into a single printed receipt | Exploration · search · navigation |
| **Pulse** (persistent footer) | Every week of 11 years as one bar — height = plays, warmth = night-share, a teal tick = money moved that week. Click any bar to jump to that day | Visual representation of the whole journey; gaps (like the Missing Year) are visible as literal gaps |

Search, category filters, and a "surprise ≥ N×" threshold slider live inside
THE WEB and ONE DAY. Everything is responsive down to a single mobile
column — the graph, the receipt roll, and the day sidebar all reflow.

## Architecture

```
build_receipts.py        one-shot ETL: raw CSVs → out/receipts.json
public/data/receipts.json    the only thing the frontend ever reads
lib/types.ts              shape of that JSON
lib/data.ts                formatting + neighbour/lookup helpers
components/
  ReceiptRoll.tsx          THE ROLL
  ConnectionWeb.tsx        THE WEB (canvas, no chart library)
  Audit.tsx                THE AUDIT
  DayReceipt.tsx           ONE DAY
  Pulse.tsx                bottom-of-screen 11-year scrubber
app/page.tsx               tab shell, wires "open this day" across views
```

No chart library, no graph library, no CSS framework beyond Tailwind for
layout utilities. The force-directed graph is ~120 lines of canvas physics.
This keeps the shipped bundle at **229 kB first load** and the whole
experience frontend-only, as required.

## Run it

```bash
npm i
npm run dev        # http://localhost:3000
```

```bash
npm run build       # static export (output: "export" in next.config.ts)
```
`npm run build` emits a fully static `out/` directory — deployable as-is to
Vercel, Netlify, GitHub Pages, or any static host. No server, no env vars,
no API keys.

## Re-running the data pipeline (optional)

Only needed if you want to change how chapters, anomalies, or the graph are
derived. The shipped JSON already reflects the current pipeline.

```bash
# raw CSVs live under data/archive*/ (unzipped Kaggle exports)
python3 build_receipts.py       # writes out/receipts.json
cp out/receipts.json public/data/receipts.json
```

The script is one file, top to bottom:
1. loads and cleans the three CSVs
2. defines 8 chapter boundaries from real inflection points (the 368-day
   silence, the skip-rate collapse, the 2020 night spike, the 2022 Spanish
   surge)
3. builds a same-day co-occurrence graph across artists, spend categories,
   specific purchases, and mined travel destinations, scored by lift
4. picks the 120 most information-dense days for full itemisation
5. writes everything into one flat JSON, no nested fetches, no pagination

## Why receipts

A receipt is the one artifact that already does what this challenge asks
for: it turns a pile of individual, forgettable moments into one object
that adds up to something — a total, a place, a date, a person's
handwriting in the margins. We just extended that idea to a decade of
someone's digital exhaust: songs stop being a play count and become a line
item; a silence becomes a receipt that was never printed.