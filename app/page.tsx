"use client";

import { useState } from "react";
import ReceiptRoll from "@/components/ReceiptRoll";
import ConnectionWeb from "@/components/ConnectionWeb";
import Audit from "@/components/Audit";
import DayReceipt from "@/components/DayReceipt";
import Pulse from "@/components/Pulse";

const TABS = [
  { id: "roll", label: "THE ROLL", hint: "eight chapters, printed" },
  { id: "web", label: "THE WEB", hint: "what happened together" },
  { id: "audit", label: "THE AUDIT", hint: "six things that don't add up" },
  { id: "day", label: "ONE DAY", hint: "any single receipt" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function Page() {
  const [tab, setTab] = useState<Tab>("roll");
  const [day, setDay] = useState<string | null>(null);

  const openDay = (d: string) => { setDay(d); setTab("day"); };

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 bg-[#0b0a09]/92 backdrop-blur border-b border-ink/12">
        <div className="max-w-[1180px] mx-auto px-4 py-3 flex items-center gap-5 flex-wrap">
          <div className="leading-none">
            <div className="text-[13px] font-bold tracking-[0.2em]">YOUR LIFE, IN RECEIPTS</div>
            <div className="text-[9.5px] tracking-[0.22em] opacity-45 mt-1">
              149,860 SONGS · 2,989 TRANSACTIONS · 4,204 DAYS
            </div>
          </div>
          <nav className="flex gap-1 ml-auto flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                title={t.hint}
                className={`px-3 py-1.5 rounded text-[10.5px] tracking-[0.18em] border transition
                  ${tab === t.id
                    ? "border-ink/55 bg-ink/12"
                    : "border-transparent opacity-50 hover:opacity-85"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-[1180px] mx-auto px-4 pt-7">
        {tab === "roll" && <ReceiptRoll onOpenDay={openDay} />}
        {tab === "web" && <ConnectionWeb onOpenDay={openDay} />}
        {tab === "audit" && <Audit />}
        {tab === "day" && <DayReceipt day={day} setDay={setDay} />}
      </div>

      <Pulse onPick={openDay} />
    </main>
  );
}
