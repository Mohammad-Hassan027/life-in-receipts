# Your Life, In Receipts

Frontend-only. Three raw Kaggle exports -> one 730 KB JSON -> four ways to read a life.

## Run
```bash
npm i
npm run dev
```

## Rebuild the data (optional)
Raw CSVs go in `data/`, then:
```bash
python3 build_receipts.py     # writes out/receipts.json
cp out/receipts.json public/data/
```

## What's in here
- `build_receipts.py` — the whole ETL. Finds chapters, co-occurrence edges, anomalies.
- `public/data/receipts.json` — 128 nodes, 3,837 edges, 2,994 day-rows, 124 itemised days.
- `components/ReceiptRoll` — eight chapters as printed receipts, each totalling something that isn't money.
- `components/ConnectionWeb` — canvas force graph. Edge = same day. Weight = lift over chance.
- `components/Audit` — six statistical anomalies presented as disputed charges.
- `components/DayReceipt` — any single day, itemised minute by minute.
- `components/Pulse` — every week of 11 years as one bar.

## Deploy
`output: "export"` is on — `npm run build` emits static `out/`. Vercel, Netlify, GH Pages all work.
