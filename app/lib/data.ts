import raw from "@/public/data/receipts.json";
import type { Payload, Edge, Node } from "./types";

export const DATA = raw as unknown as Payload;

export const fmtInt = (n: number) => n.toLocaleString("en-IN");
export const fmtMoney = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");
export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).toUpperCase();
export const fmtHours = (min: number) => `${Math.round(min / 60).toLocaleString("en-IN")} hrs`;

/** Receipts keyed by ISO day, for O(1) lookup from the scrubber. */
export const RECEIPT_BY_DAY = new Map(DATA.receipts.map((r) => [r.d, r]));
export const DAY_BY_ISO = new Map(DATA.days.map((d) => [d.d, d]));

/** Strongest links for a node, ranked by lift (surprise) not raw count. */
export function neighbours(id: number, limit = 10) {
  const out: { node: Node; edge: Edge }[] = [];
  for (const e of DATA.edges) {
    if (e.s === id) out.push({ node: DATA.nodes[e.t], edge: e });
    else if (e.t === id) out.push({ node: DATA.nodes[e.s], edge: e });
  }
  return out.sort((a, b) => b.edge.lift - a.edge.lift).slice(0, limit);
}

export const KIND_COLOR: Record<string, string> = {
  artist: "#e8e3d3",
  spend: "#d98c3f",
  thing: "#6fa8a0",
  place: "#c05a4e",
};

export const KIND_LABEL: Record<string, string> = {
  artist: "PLAYED", spend: "PAID FOR", thing: "BOUGHT", place: "WENT TO",
};

export function chapterFor(iso: string) {
  return DATA.chapters.find((c) => iso >= c.start && iso <= c.end);
}
