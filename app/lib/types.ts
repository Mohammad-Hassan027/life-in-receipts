export type Kind = "artist" | "spend" | "thing" | "place";

export interface Meta {
  title: string; firstDay: string; lastDay: string;
  totalPlays: number; totalMinutes: number; activeDays: number;
  artists: number; tracks: number; totalSpend: number; txns: number;
  overlapDays: number; artistIndex: string[];
}

export interface Chapter {
  id: string; title: string; kicker: string; start: string; end: string;
  plays: number; minutes: number; activeDays: number;
  nightPlays: number; nightShare: number;
  skipRate: number; shuffleRate: number;
  spend: number; txns: number; spanishPlays: number; newArtists: number;
  topArtists: { name: string; n: number }[];
  topTracks: { track: string; artist: string; n: number }[];
  topSpend: { name: string; amt: number }[];
}

/** One compact row per day. p=plays m=minutes n=night s=spend k=skipRate a=artistIdx c=category */
export interface Day {
  d: string; p: number; m: number; n: number; s: number; k: number;
  a: number; c: string | null;
}

export interface Node { id: number; label: string; kind: Kind; w: number }
export interface Edge { s: number; t: number; w: number; lift: number; move?: number }

export interface ReceiptItem {
  t: string; kind: "music" | "money"; l: string; sub: string;
  v: number; flag: string | null;
}
export interface Receipt {
  d: string; plays: number; minutes: number; spend: number; night: number;
  headline: string; items: ReceiptItem[];
}

export interface Anomaly {
  id: string; title: string; stat: string; window: [string, string];
  body: string; ask: string; series?: Record<string, number>;
}

export interface YearRow {
  y: number; plays: number; minutes: number; skip: number;
  night: number; spend: number; artist: string;
}

export interface Payload {
  meta: Meta;
  chapters: Chapter[];
  days: Day[];
  byYear: YearRow[];
  hours: { h: number; n: number }[];
  nodes: Node[];
  edges: Edge[];
  receipts: Receipt[];
  anomalies: Anomaly[];
  moves: { from: string; to: string; n: number }[];
}
