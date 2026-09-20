"use client";

import { useMemo, useRef, useState } from "react";
import { DATA, fmtDate, fmtMoney } from "@/lib/data";

/**
 * Every day of the record as one bar: height = plays, warmth = night share,
 * a dot below = money moved. Gaps are visible as gaps — that's the point.
 */
export default function Pulse({ onPick }: { onPick: (d: string) => void }) {
  const [hi, setHi] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const { bars, max } = useMemo(() => {
    const first = +new Date(DATA.meta.firstDay);
    const last = +new Date(DATA.meta.lastDay);
    const weeks = Math.ceil((last - first) / (7 * 864e5));
    const acc = Array.from({ length: weeks + 1 }, () => ({ p: 0, n: 0, s: 0, d: "" }));
    for (const day of DATA.days) {
      const i = Math.floor((+new Date(day.d) - first) / (7 * 864e5));
      if (i < 0 || i > weeks) continue;
      acc[i].p += day.p; acc[i].n += day.n; acc[i].s += day.s;
      if (!acc[i].d || day.p > 0) acc[i].d = day.d;
    }
    return { bars: acc, max: Math.max(...acc.map((a) => a.p), 1) };
  }, []);

  const b = hi !== null ? bars[hi] : null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-[#0b0a09]/95 backdrop-blur border-t border-ink/15">
      <div className="max-w-[1180px] mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between text-[9.5px] tracking-[0.25em] opacity-50 mb-1.5">
          <span>2013</span>
          <span>
            {b && b.d
              ? `${fmtDate(b.d)} · ${b.p} PLAYS${b.s ? ` · ${fmtMoney(b.s)}` : ""}`
              : "11 YEARS · CLICK ANY WEEK"}
          </span>
          <span>2024</span>
        </div>
        <div
          ref={box}
          className="flex items-end gap-px h-12 cursor-crosshair"
          onMouseLeave={() => setHi(null)}
        >
          {bars.map((w, i) => {
            const h = (w.p / max) * 100;
            const night = w.p ? w.n / w.p : 0;
            return (
              <div
                key={i}
                onMouseEnter={() => setHi(i)}
                onClick={() => w.d && onPick(w.d)}
                className="flex-1 min-w-[1px] flex flex-col justify-end h-full group"
              >
                <div
                  className="w-full rounded-t-[1px] transition-all"
                  style={{
                    height: `${Math.max(h, w.p ? 3 : 0)}%`,
                    background: hi === i
                      ? "#fff"
                      : `rgb(${180 + night * 60}, ${150 - night * 40}, ${90 - night * 40})`,
                    opacity: hi === null || hi === i ? 1 : 0.55,
                  }}
                />
                <div
                  className="w-full h-[2px] mt-[1px]"
                  style={{ background: w.s ? "#6fa8a0" : "transparent" }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
