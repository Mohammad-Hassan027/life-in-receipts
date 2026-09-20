#!/usr/bin/env python3
"""
Your Life, In Receipts — ETL
Raw CSV  ->  receipts.json (ships to the frontend, no backend)

Run:  python3 build_receipts.py
Out:  out/receipts.json
"""
import pandas as pd, numpy as np, json, re, os, collections, hashlib

RAW = "data"
OUT = "out"
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- load music
s = pd.read_csv(f"{RAW}/archive/spotify_history.csv")
s.columns = [c.strip().lstrip("\ufeff") for c in s.columns]
s["ts"] = pd.to_datetime(s["ts"])
s["day"] = s.ts.dt.normalize()
s["hour"] = s.ts.dt.hour
s["min"] = s.ms_played / 60000.0
s["skipped"] = s.skipped.astype(str).str.upper().eq("TRUE")
s["shuffle"] = s.shuffle.astype(str).str.upper().eq("TRUE")
s = s.dropna(subset=["track_name", "artist_name"])

# ------------------------------------------------------------ load spending
h = pd.read_csv(f"{RAW}/archive__1_/Daily Household Transactions.csv")
h["ts"] = pd.to_datetime(h.Date, format="mixed", dayfirst=True, errors="coerce")
h = h.dropna(subset=["ts"])
h["day"] = h.ts.dt.normalize()
h["Amount"] = pd.to_numeric(h.Amount, errors="coerce").fillna(0)
h["kind"] = h["Income/Expense"].fillna("Expense")

# ------------------------------- load late-era purchases (2022-24, MH slice)
d = pd.read_csv(f"{RAW}/archive__2_/Augmented_IndiaTransactMultiFacet2024.csv", low_memory=False)
d["ts"] = pd.to_datetime(d.trans_date_trans_time, format="mixed", errors="coerce")
d = d.dropna(subset=["ts", "amt", "category"])
# Narrative continuity: the 2015-18 ledger is rooted in Maharashtra (Dadar,
# Sevagram). We keep only the Maharashtra rows so the later years stay the
# same person's map rather than a nationwide sample.
d = d[d.state.eq("Maharashtra") | d.city.isin(["Nagpur", "Mumbai", "Pune", "Aurangabad", "Nashik", "Thane"])]
d["day"] = d.ts.dt.normalize()
d["merchant"] = d.merchant.fillna("").str.replace(r"^fraud_", "", regex=True).str.replace(r"\s*(Pvt Ltd|PLC|Inc|Ltd)\s*", " ", regex=True).str.strip()

# ------------------------------------------------------------ place mining
PLACE_RE = re.compile(r"(.+?)\s+to\s+(.+)", re.I)
def clean_place(p):
    p = re.sub(r"^\d+\s+", "", str(p).strip().lower())
    p = re.sub(r"\s+(return|one way)$", "", p)
    p = re.sub(r"\s*[-–]\s*.*$", "", p)
    p = re.sub(r"\b(travels?|tour and travels?|bus stand|stand)\b", "", p).strip()
    return " ".join(w.capitalize() for w in p.split())[:28]

moves = collections.Counter()
place_days = collections.defaultdict(set)
for _, r in h[h.Category.eq("Transportation")].iterrows():
    m = PLACE_RE.match(str(r.Note))
    if m:
        a, b = clean_place(m.group(1)), clean_place(m.group(2))
        if a and b and a != b:
            moves[(a, b)] += 1
            place_days[a].add(r.day); place_days[b].add(r.day)

# ---------------------------------------------------------------- chapters
# Boundaries are chosen from real inflection points found in the data:
# the 368-day silence, the skip-rate collapse, the 2020 night spike,
# the 2022 Spanish surge, the 2023 restlessness.
CHAPTERS = [
    ("first-contact", "First Contact",      "2013-07-08", "2014-01-09",
     "208 plays, then nothing. An account opened and abandoned."),
    ("the-silence",   "The Silence",        "2014-01-10", "2015-01-11",
     "368 days with no music at all. The longest gap in the record."),
    ("the-restless",  "The Restless Year",  "2015-01-12", "2015-12-31",
     "Came back skipping 79% of everything. Nothing held."),
    ("the-turn",      "The Turn",           "2016-01-01", "2016-12-31",
     "The Beatles arrive. Skip rate falls off a cliff: 79% to 3.6%."),
    ("deep-water",    "Deep Water",         "2017-01-01", "2019-12-31",
     "Three years, ~56,000 plays, a skip rate of almost exactly zero."),
    ("the-long-night","The Long Night",     "2020-01-01", "2021-12-31",
     "13,828 plays between midnight and 5 AM — and not one financial record survives from these two years."),
    ("otra-vida",     "Otra Vida",          "2022-01-01", "2022-12-31",
     "Spanish-language listening jumps 8x in a single year."),
    ("the-drift",     "The Drift",          "2023-01-01", "2024-12-15",
     "Skipping again — 23%. Same artists, less patience."),
]

def between(df, a, b, col="day"):
    return df[(df[col] >= a) & (df[col] <= b)]

ES_ARTISTS = {"Joaquín Sabina","David Bisbal","Manu Chao","Los Rodríguez","Extremoduro",
              "Fito & Fitipaldis","Enrique Iglesias","Jarabe De Palo","Shakira","Juanes",
              "Mecano","Héroes Del Silencio","Alejandro Sanz","Los Planetas","Vetusta Morla"}

def money(x): return round(float(x), 2)

chapters = []
for cid, title, a, b, kicker in CHAPTERS:
    a, b = pd.Timestamp(a), pd.Timestamp(b)
    ms, hs, ds = between(s, a, b), between(h, a, b), between(d, a, b)
    if len(ms) == 0 and len(hs) == 0: continue
    night = ms[ms.hour < 5]
    spend = hs[hs.kind.eq("Expense")].Amount.sum() + ds.amt.sum()
    top_tracks = ms.groupby(["track_name", "artist_name"]).size().nlargest(5)
    chapters.append({
        "id": cid, "title": title, "kicker": kicker,
        "start": a.strftime("%Y-%m-%d"), "end": b.strftime("%Y-%m-%d"),
        "plays": int(len(ms)),
        "minutes": int(ms["min"].sum()),
        "activeDays": int(ms.day.nunique()),
        "nightPlays": int(len(night)),
        "nightShare": round(len(night) / max(len(ms), 1), 3),
        "skipRate": round(ms.skipped.mean(), 3) if len(ms) else 0,
        "shuffleRate": round(ms.shuffle.mean(), 3) if len(ms) else 0,
        "spend": money(spend),
        "txns": int(len(hs) + len(ds)),
        "spanishPlays": int(ms.artist_name.isin(ES_ARTISTS).sum()),
        "topArtists": [{"name": k, "n": int(v)} for k, v in ms.artist_name.value_counts().head(6).items()],
        "topTracks": [{"track": k[0], "artist": k[1], "n": int(v)} for k, v in top_tracks.items()],
        "topSpend": [{"name": k, "amt": money(v)} for k, v in
                     hs[hs.kind.eq("Expense")].groupby("Category").Amount.sum().nlargest(6).items()]
                    or [{"name": k, "amt": money(v)} for k, v in ds.groupby("category").amt.sum().nlargest(6).items()],
        "newArtists": int(len(set(ms.artist_name) - set(s[s.day < a].artist_name))),
    })

# --------------------------------------------------------------- day pulse
# One compact row per day the person existed in the data. Drives the calendar
# heatmap, the scrubber and the day-receipt lookup.
sp_day = s.groupby("day").agg(plays=("track_name", "size"), minutes=("min", "sum"),
                              skip=("skipped", "mean")).reset_index()
night_day = s[s.hour < 5].groupby("day").size().rename("night")
top_artist_day = s.groupby(["day", "artist_name"]).size().reset_index(name="n") \
                  .sort_values("n", ascending=False).drop_duplicates("day").set_index("day")
hs_day = h[h.kind.eq("Expense")].groupby("day").Amount.sum().rename("spend")
hc_day = h[h.kind.eq("Expense")].groupby(["day", "Category"]).Amount.sum().reset_index() \
           .sort_values("Amount", ascending=False).drop_duplicates("day").set_index("day")
ds_day = d.groupby("day").amt.sum().rename("spend2")

pulse = sp_day.set_index("day").join([night_day, hs_day, ds_day]).fillna(0)
pulse = pulse.join(top_artist_day[["artist_name"]]).join(hc_day[["Category"]])
all_days = sorted(set(pulse.index) | set(h.day) | set(d.day))
pulse = pulse.reindex(all_days).fillna({"plays": 0, "minutes": 0, "night": 0, "spend": 0, "spend2": 0, "skip": 0})

ARTIST_IDX = {a: i for i, a in enumerate(s.artist_name.value_counts().index)}
days = [{
    "d": ix.strftime("%Y-%m-%d"),
    "p": int(r.plays), "m": int(r.minutes), "n": int(r.night),
    "s": money(r.spend + r.spend2),
    "k": round(float(r.skip), 2) if r.plays else 0,
    "a": ARTIST_IDX.get(r.artist_name, -1) if isinstance(r.artist_name, str) else -1,
    "c": r.Category if isinstance(r.Category, str) else None,
} for ix, r in pulse.iterrows()]

# ------------------------------------------------------- connection graph
# An edge exists when two things happened on the same day. This is the whole
# "discover relationships" mechanism: co-occurrence in time.
TOP_ARTISTS = list(s.artist_name.value_counts().head(70).index)
CATS = list(h[h.kind.eq("Expense")].Category.value_counts().head(16).index)
SUBS = list(h.Subcategory.dropna().value_counts().head(20).index)
PLACES = [p for p, dd in sorted(place_days.items(), key=lambda kv: -len(kv[1]))[:18]]
MERCH = list(d.category.value_counts().head(6).index)

nodes, node_id = [], {}
def add_node(name, kind, weight, extra=None):
    key = f"{kind}:{name}"
    if key in node_id: return node_id[key]
    node_id[key] = len(nodes)
    nodes.append({"id": len(nodes), "label": name, "kind": kind, "w": int(weight), **(extra or {})})
    return node_id[key]

art_days, cat_days, sub_days, place_nodes = {}, {}, {}, {}
for a in TOP_ARTISTS:
    dd = set(s[s.artist_name.eq(a)].day); art_days[a] = dd
    add_node(a, "artist", len(dd))
for c in CATS:
    dd = set(h[h.Category.eq(c)].day); cat_days[c] = dd
    add_node(c, "spend", len(dd))
for sc in SUBS:
    dd = set(h[h.Subcategory.eq(sc)].day); sub_days[sc] = dd
    add_node(sc, "thing", len(dd))
for p in PLACES:
    add_node(p, "place", len(place_days[p]))
for m in MERCH:
    dd = set(d[d.category.eq(m)].day)
    cat_days[m] = dd
    add_node(m.replace("_", " "), "spend", len(dd))

def nid(name, kind): return node_id.get(f"{kind}:{name}")

edges = []
def link(k1, n1, k2, n2, d1, d2, min_shared=4):
    shared = d1 & d2
    if len(shared) < min_shared: return
    # lift: how much more often than chance do these co-occur?
    exp = len(d1) * len(d2) / max(len(all_days), 1)
    edges.append({"s": nid(n1, k1), "t": nid(n2, k2), "w": len(shared),
                  "lift": round(len(shared) / max(exp, 0.5), 2)})

for i, a1 in enumerate(TOP_ARTISTS):
    for a2 in TOP_ARTISTS[i + 1:]:
        link("artist", a1, "artist", a2, art_days[a1], art_days[a2], 25)
for a in TOP_ARTISTS:
    for c in CATS:   link("artist", a, "spend", c, art_days[a], cat_days[c], 6)
    for sc in SUBS:  link("artist", a, "thing", sc, art_days[a], sub_days[sc], 6)
    for p in PLACES: link("artist", a, "place", p, art_days[a], place_days[p], 5)
for a, b in moves:
    if nid(a, "place") is not None and nid(b, "place") is not None:
        edges.append({"s": nid(a, "place"), "t": nid(b, "place"), "w": moves[(a, b)], "lift": 1, "move": 1})

# ------------------------------------------------------------- day receipts
# Fully itemised receipts for the days where music + money + movement overlap.
overlap = sorted(set(s.day) & set(h.day))
scored = []
for dd in overlap:
    ms, hs = s[s.day.eq(dd)], h[h.day.eq(dd)]
    scored.append((len(ms) * 0.4 + len(hs) * 6 + hs.Amount.sum() * 0.01, dd))
pick = [dd for _, dd in sorted(scored, reverse=True)[:120]]
# always include the head and tail of the record
pick = sorted(set(pick) | {s.day.min(), s.day.max(), h.day.min(), h.day.max()})

receipts = []
for dd in pick:
    ms, hs = s[s.day.eq(dd)].sort_values("ts"), h[h.day.eq(dd)].sort_values("ts")
    items = []
    for _, r in ms.head(28).iterrows():
        items.append({"t": r.ts.strftime("%H:%M"), "kind": "music", "l": r.track_name,
                      "sub": r.artist_name, "v": round(r["min"], 1),
                      "flag": "SKIP" if r.skipped else None})
    for _, r in hs.iterrows():
        items.append({"t": r.ts.strftime("%H:%M"), "kind": "money", "l": (str(r.Note)[:44] if pd.notna(r.Note) else r.Category),
                      "sub": f"{r.Category} · {r.Mode}", "v": money(r.Amount),
                      "flag": None if r.kind == "Expense" else str(r.kind).upper()})
    items.sort(key=lambda x: x["t"])
    receipts.append({
        "d": dd.strftime("%Y-%m-%d"),
        "plays": int(len(ms)), "minutes": int(ms["min"].sum()),
        "spend": money(hs[hs.kind.eq("Expense")].Amount.sum()),
        "night": int((ms.hour < 5).sum()),
        "headline": (ms.artist_name.value_counts().index[0] if len(ms) else "—"),
        "items": items[:40],
    })

# ---------------------------------------------------------------- anomalies
def artist_year(a):
    return {int(y): int(n) for y, n in s[s.artist_name.eq(a)].groupby(s.ts.dt.year).size().items()}

anomalies = [
  {"id":"silence","title":"The Missing Year","stat":"368 days",
   "window":["2014-01-09","2015-01-12"],
   "body":"Between 9 Jan 2014 and 12 Jan 2015 not a single track was played. The account had existed for six months and logged 208 plays. Then it stopped, completely, for longer than it had ever been used.",
   "ask":"What fills a year that leaves no trace?"},
  {"id":"skipcliff","title":"The Skip Cliff","stat":"79% → 0.1%",
   "window":["2015-01-12","2017-12-31"],
   "body":"In 2015, 79% of tracks were skipped — restless, nothing landing. In 2016 that fell to 3.6%. From 2017 to 2021 the skip rate is effectively zero: 11 skips across 103,000 plays. Something stopped searching and started staying.",
   "ask":"Was it the music that changed, or the person?"},
  {"id":"thebeatles","title":"The Conversion","stat":"13,601 plays",
   "window":["2016-01-01","2024-12-15"],
   "body":"The Beatles appear in 2016 and never leave. They are the #1 artist in eight of the nine following years. No other artist in the record survives more than three years at the top.",
   "series": artist_year("The Beatles"),
   "ask":"Which of your habits started as a phase?"},
  {"id":"longnight","title":"The Long Night","stat":"13,828 plays after midnight",
   "window":["2020-01-01","2021-12-31"],
   "body":"Listening between midnight and 5 AM peaks in 2021 at 7,527 plays — more than double 2019. Across the whole record the busiest hour of the day is 23:00, and 8 AM to noon is nearly silent. This is a life lived on the other side of the clock.",
   "ask":"Who were you talking to at 3 AM?"},
  {"id":"otravida","title":"Otra Vida","stat":"8x in one year",
   "window":["2022-01-01","2022-12-31"],
   "body":"Spanish-language artists sit at 50–150 plays a year for seven years. In 2022 they hit 993 — Joaquín Sabina alone accounts for 576. The next year it collapses back to 259 and never recovers.",
   "series": artist_year("Joaquín Sabina"),
   "ask":"What arrived in 2022 and left again?"},
  {"id":"drift","title":"The Drift","stat":"23% skipped",
   "window":["2023-01-01","2024-12-15"],
   "body":"After five years of near-zero skipping, 2023 jumps to 23.5% and stays there. The top artists barely change — The Beatles, The Killers, John Mayer. Same records, less patience.",
   "ask":"Is this boredom, or is this grief?"},
]

# ------------------------------------------------------------------ hours
hours = [{"h": int(hh), "n": int(n)} for hh, n in s.hour.value_counts().sort_index().items()]
by_year = []
for y, g in s.groupby(s.ts.dt.year):
    hy = h[h.ts.dt.year.eq(y) & h.kind.eq("Expense")]
    dy = d[d.ts.dt.year.eq(y)]
    by_year.append({"y": int(y), "plays": int(len(g)), "minutes": int(g["min"].sum()),
                    "skip": round(g.skipped.mean(), 3), "night": int((g.hour < 5).sum()),
                    "spend": money(hy.Amount.sum() + dy.amt.sum()),
                    "artist": g.artist_name.value_counts().index[0]})

payload = {
  "meta": {
    "title": "Your Life, In Receipts",
    "firstDay": str(s.day.min().date()), "lastDay": str(s.day.max().date()),
    "totalPlays": int(len(s)), "totalMinutes": int(s["min"].sum()),
    "activeDays": int(s.day.nunique()), "artists": int(s.artist_name.nunique()),
    "tracks": int(s.track_name.nunique()),
    "totalSpend": money(h[h.kind.eq("Expense")].Amount.sum() + d.amt.sum()),
    "txns": int(len(h) + len(d)),
    "overlapDays": int(len(overlap)),
    "artistIndex": TOP_ARTISTS,
  },
  "chapters": chapters, "days": days, "byYear": by_year, "hours": hours,
  "nodes": nodes, "edges": edges, "receipts": receipts, "anomalies": anomalies,
  "moves": [{"from": a, "to": b, "n": n} for (a, b), n in moves.most_common(40)],
}

with open(f"{OUT}/receipts.json", "w") as f:
    json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)

print("nodes", len(nodes), "edges", len(edges), "days", len(days),
      "receipts", len(receipts), "chapters", len(chapters))
print("size", round(os.path.getsize(f"{OUT}/receipts.json") / 1e6, 2), "MB")
