"use client";

import { useState } from "react";
import { DATA, fmtDate, fmtInt } from "@/lib/data";
import type { Anomaly } from "@/lib/types";

function Spark({ series }: { series: Record<string, number> }) {
  const ks = Object.keys(series).sort();
  const max = Math.max(...Object.values(series), 1);
  return (
    <div className="flex items-end gap-1 h-20 mt-3">
      {ks.map((k) => (
        <div key={k} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-[#d98c3f] rounded-sm transition-all duration-700"
            style={{ height: `${(series[k] / max) * 64}px` }}
            title={`${k}: ${series[k]}`}
          />
          <span className="text-[8px] opacity-50">{k.slice(2)}</span>
        </div>
      ))}
    </div>
  );
}

/** Year-over-year evidence strip, used when an anomaly has no custom series. */
function YearStrip({ window: w, metric }: { window: [string, string]; metric: "skip" | "night" }) {
  const max = Math.max(...DATA.byYear.map((y) => (metric === "skip" ? y.skip : y.night)));
  return (
    <div className="flex items-end gap-1 h-20 mt-3">
      {DATA.byYear.map((y) => {
        const v = metric === "skip" ? y.skip : y.night;
        const inside = `${y.y}` >= w[0].slice(0, 4) && `${y.y}` <= w[1].slice(0, 4);
        return (
          <div key={y.y} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm transition-all duration-700"
              style={{
                height: `${(v / max) * 64}px`,
                background: inside ? "#d98c3f" : "rgba(232,227,211,0.22)",
              }}
              title={`${y.y}: ${metric === "skip" ? (v * 100).toFixed(1) + "%" : fmtInt(v)}`}
            />
            <span className="text-[8px] opacity-50">{`${y.y}`.slice(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Card({ a, i }: { a: Anomaly; i: number }) {
  const [open, setOpen] = useState(i === 0);
  return (
    <div className="paper px-6 py-5">
      <button className="w-full text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] tracking-[0.3em] text-[#c05a4e]">⚑ FLAGGED</div>
            <h3 className="text-[19px] font-bold mt-1 leading-tight">{a.title}</h3>
            <div className="text-[11px] opacity-55 mt-1">
              {fmtDate(a.window[0])} — {fmtDate(a.window[1])}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[17px] font-bold tabular-nums">{a.stat}</div>
            <div className="text-[10px] opacity-50 mt-1">{open ? "CLOSE" : "INVESTIGATE"}</div>
          </div>
        </div>
      </button>

      {open && (
        <>
          <div className="tear my-4" />
          <p className="text-[13px] leading-relaxed">{a.body}</p>
          {a.series ? (
            <Spark series={a.series} />
          ) : (
            <YearStrip
              window={a.window}
              metric={a.id === "longnight" ? "night" : "skip"}
            />
          )}
          <div className="tear my-4" />
          <p className="text-[13px] italic opacity-85">{a.ask}</p>
        </>
      )}
    </div>
  );
}

export default function Audit() {
  return (
    <div className="pb-32">
      <div className="paper px-6 py-5 mb-6">
        <div className="text-[10px] tracking-[0.35em] opacity-50">AUTOMATED REVIEW</div>
        <h2 className="text-[22px] font-bold mt-1">Six things that don&apos;t add up</h2>
        <p className="mt-3 text-[13px] leading-relaxed opacity-85">
          These aren&apos;t the biggest numbers in the data — they&apos;re the ones that
          break their own pattern. Each was found by comparing a window against the
          eleven years around it.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-5 items-start">
        {DATA.anomalies.map((a, i) => (
          <Card key={a.id} a={a} i={i} />
        ))}
      </div>
    </div>
  );
}
