"use client";

import { useMemo, useState } from "react";
import {
  DATA,
  RECEIPT_BY_DAY,
  chapterFor,
  fmtDate,
  fmtMoney,
  fmtInt,
} from "@/lib/data";

export default function DayReceipt({
  day,
  setDay,
}: {
  day: string | null;
  setDay: (d: string) => void;
}) {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const rs = [...DATA.receipts].sort((a, b) => a.d.localeCompare(b.d));
    if (!q) return rs;
    const s = q.toLowerCase();
    return rs.filter(
      (r) =>
        r.d.includes(s) ||
        r.headline.toLowerCase().includes(s) ||
        r.items.some(
          (i) =>
            i.l.toLowerCase().includes(s) || i.sub.toLowerCase().includes(s),
        ),
    );
  }, [q]);

  // Nearest itemised day to whatever was requested.
  const r = useMemo(() => {
    if (day && RECEIPT_BY_DAY.has(day)) return RECEIPT_BY_DAY.get(day)!;
    if (!day) return list[0] ?? DATA.receipts[0];
    let best = DATA.receipts[0],
      bd = Infinity;
    for (const x of DATA.receipts) {
      const d = Math.abs(+new Date(x.d) - +new Date(day));
      if (d < bd) {
        bd = d;
        best = x;
      }
    }
    return best;
  }, [day, list]);

  const ch = chapterFor(r.d);

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-5 pb-32">
      <aside className="paper px-4 py-4 h-fit lg:sticky lg:top-4 max-h-[75vh] overflow-y-auto">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search 124 days…"
          className="w-full bg-transparent border-b border-ink/25 pb-2 mb-3 text-[12px] outline-none focus:border-ink/60"
        />
        <div className="space-y-0.5" role="list">
          {list.map((x) => (
            <button
              key={x.d}
              onClick={() => setDay(x.d)}
              className={`w-full text-left px-2 py-1.5 rounded text-[11.5px] flex justify-between gap-2 transition focus-visible:ring-1
                ${x.d === r.d ? "bg-ink/15 font-bold" : "hover:bg-ink/7"}`}
            >
              <span className="tabular-nums">{x.d}</span>
              <span className="truncate opacity-60 max-w-[110px]">
                {x.headline}
              </span>
            </button>
          ))}
          {list.length === 0 && (
            <p className="text-[12px] opacity-50 italic px-2">
              Nothing matches.
            </p>
          )}
        </div>
      </aside>

      <div className="flex justify-center">
        <div
          key={r.d}
          className="paper day-receipt-swap w-full max-w-[460px] px-7 py-8 text-[12.5px]"
        >
          <div className="text-center">
            <div className="text-[10px] tracking-[0.35em] opacity-50">
              ONE DAY
            </div>
            <h2 className="mt-2 text-[24px] font-bold tabular-nums">
              {fmtDate(r.d)}
            </h2>
            {ch && (
              <div className="mt-1 text-[11px] tracking-[0.15em] opacity-55">
                FROM “{ch.title.toUpperCase()}”
              </div>
            )}
          </div>

          <div className="tear my-5" />
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["PLAYS", fmtInt(r.plays)],
              ["MINS", fmtInt(r.minutes)],
              ["AFTER 12", fmtInt(r.night)],
              ["SPENT", r.spend ? fmtMoney(r.spend) : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[15px] font-bold tabular-nums">{v}</div>
                <div className="text-[9px] tracking-[0.2em] opacity-50 mt-0.5">
                  {k}
                </div>
              </div>
            ))}
          </div>

          <div className="tear my-5" />
          <div className="space-y-1.5">
            {r.items.map((it, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="tabular-nums opacity-45 text-[11px] w-10 shrink-0">
                  {it.t}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: it.kind === "music" ? "#e8e3d3" : "#d98c3f",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate ${it.flag === "SKIP" ? "line-through opacity-45" : ""}`}
                  >
                    {it.l}
                  </div>
                  <div className="text-[10.5px] opacity-50 truncate">
                    {it.sub}
                  </div>
                </div>
                <span className="tabular-nums shrink-0 text-[11.5px]">
                  {it.kind === "money" ? fmtMoney(it.v) : `${it.v}m`}
                </span>
              </div>
            ))}
          </div>

          <div className="tear my-5" />
          <div className="flex justify-between font-bold">
            <span className="tracking-[0.12em]">THAT DAY, MOSTLY</span>
            <span>{r.headline.toUpperCase()}</span>
          </div>
          <div className="mt-6 text-center text-[10px] tracking-[0.25em] opacity-40">
            {"─".repeat(26)}
            <div className="mt-2">THANK YOU · COME AGAIN</div>
          </div>
        </div>
      </div>
    </div>
  );
}
