"use client";

import { useEffect, useRef, useState } from "react";
import { DATA, fmtDate, fmtInt, fmtMoney, fmtHours } from "@/lib/data";
import type { Chapter } from "@/lib/types";

/** Each chapter totals something that isn't money. That's the whole joke. */
function totalLine(c: Chapter): { label: string; value: string } {
  if (c.plays === 0) return { label: "TOTAL SILENCE", value: "368 DAYS" };
  if (c.skipRate > 0.5) return { label: "TOTAL ABANDONED", value: `${fmtInt(Math.round(c.plays * c.skipRate))} TRACKS` };
  if (c.nightShare > 0.28) return { label: "TOTAL NIGHTS AWAKE", value: `${fmtInt(c.nightPlays)} PLAYS` };
  if (c.spanishPlays > 500) return { label: "TOTAL IN ANOTHER LANGUAGE", value: `${fmtInt(c.spanishPlays)} PLAYS` };
  return { label: "TOTAL TIME SPENT", value: fmtHours(c.minutes).toUpperCase() };
}

function Row({ l, r, dim }: { l: string; r: string; dim?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 ${dim ? "opacity-55" : ""}`}>
      <span className="truncate">{l}</span>
      <span className="flex-1 border-b border-dotted border-ink/35 translate-y-[-3px]" />
      <span className="tabular-nums shrink-0">{r}</span>
    </div>
  );
}

function ChapterReceipt({ c, i, onOpenDay }: { c: Chapter; i: number; onOpenDay: (d: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const t = totalLine(c);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setSeen(true),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`paper w-full max-w-[430px] px-7 py-8 text-[13px] leading-[1.75] transition-all duration-700
        ${seen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      style={{ transitionDelay: `${(i % 3) * 90}ms` }}
    >
      <div className="text-center">
        <div className="text-[10px] tracking-[0.35em] opacity-50">CHAPTER {String(i + 1).padStart(2, "0")}</div>
        <h2 className="mt-2 text-[22px] font-bold tracking-tight uppercase">{c.title}</h2>
        <div className="mt-1 text-[11px] tracking-[0.15em] opacity-60">
          {fmtDate(c.start)} — {fmtDate(c.end)}
        </div>
      </div>

      <p className="mt-5 text-[12.5px] italic leading-relaxed opacity-80">{c.kicker}</p>

      <div className="tear my-5" />

      <div className="space-y-1">
        <Row l="Tracks played" r={fmtInt(c.plays)} />
        <Row l="Days it happened" r={fmtInt(c.activeDays)} />
        <Row l="After midnight" r={`${Math.round(c.nightShare * 100)}%`} />
        <Row l="Skipped" r={`${(c.skipRate * 100).toFixed(1)}%`} />
        <Row l="On shuffle" r={`${Math.round(c.shuffleRate * 100)}%`} />
        <Row l="Artists never heard before" r={fmtInt(c.newArtists)} />
        <Row l="Money moved" r={c.spend ? fmtMoney(c.spend) : "NO RECORD"} dim={!c.spend} />
      </div>

      {c.topTracks.length > 0 && (
        <>
          <div className="tear my-5" />
          <div className="text-[10px] tracking-[0.3em] opacity-50 mb-2">ON REPEAT</div>
          <div className="space-y-1">
            {c.topTracks.map((t2) => (
              <Row key={t2.track + t2.artist} l={`${t2.track} — ${t2.artist}`} r={`×${t2.n}`} />
            ))}
          </div>
        </>
      )}

      {c.topSpend.length > 0 && (
        <>
          <div className="tear my-5" />
          <div className="text-[10px] tracking-[0.3em] opacity-50 mb-2">WHERE IT WENT</div>
          <div className="space-y-1">
            {c.topSpend.map((sp) => (
              <Row key={sp.name} l={sp.name} r={fmtMoney(sp.amt)} />
            ))}
          </div>
        </>
      )}

      <div className="tear my-5" />
      <div className="flex items-baseline justify-between font-bold text-[14px]">
        <span className="tracking-[0.12em]">{t.label}</span>
        <span className="tabular-nums">{t.value}</span>
      </div>

      <div className="mt-7 text-center text-[10px] tracking-[0.25em] opacity-45">
        <div>{"*".repeat(24)}</div>
        <div className="mt-2">NO REFUNDS · NO EXCHANGES</div>
        <button
          onClick={() => onOpenDay(c.start)}
          className="mt-3 underline underline-offset-4 hover:opacity-100 opacity-70"
        >
          OPEN A DAY FROM THIS CHAPTER →
        </button>
      </div>
    </div>
  );
}

export default function ReceiptRoll({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const m = DATA.meta;
  return (
    <div className="flex flex-col items-center gap-10 pb-32">
      <div className="paper w-full max-w-[430px] px-7 py-8 text-[13px]">
        <div className="text-center">
          <div className="text-[10px] tracking-[0.35em] opacity-50">ITEMISED STATEMENT</div>
          <h1 className="mt-2 text-[26px] font-bold uppercase leading-none">A Life</h1>
          <div className="mt-2 text-[11px] tracking-[0.15em] opacity-60">
            {fmtDate(m.firstDay)} — {fmtDate(m.lastDay)}
          </div>
        </div>
        <div className="tear my-5" />
        <div className="space-y-1">
          <Row l="Songs played" r={fmtInt(m.totalPlays)} />
          <Row l="Hours listened" r={fmtHours(m.totalMinutes)} />
          <Row l="Days with a pulse" r={fmtInt(m.activeDays)} />
          <Row l="Artists" r={fmtInt(m.artists)} />
          <Row l="Transactions" r={fmtInt(m.txns)} />
          <Row l="Money moved" r={fmtMoney(m.totalSpend)} />
          <Row l="Days that have both" r={fmtInt(m.overlapDays)} />
        </div>
        <div className="tear my-5" />
        <p className="text-[12.5px] italic leading-relaxed opacity-80">
          Eleven and a half years of receipts. Scroll to read them as chapters —
          or use the tabs above to find what connects them.
        </p>
        <div className="mt-6 text-center text-[10px] tracking-[0.3em] opacity-40 animate-pulse">
          ↓ PRINTING ↓
        </div>
      </div>

      {DATA.chapters.map((c, i) => (
        <ChapterReceipt key={c.id} c={c} i={i} onOpenDay={onOpenDay} />
      ))}
    </div>
  );
}
