"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DATA, KIND_COLOR, KIND_LABEL, neighbours } from "@/lib/data";
import type { Kind } from "@/lib/types";

type P = { x: number; y: number; vx: number; vy: number; r: number };

const KINDS: Kind[] = ["artist", "spend", "thing", "place"];

/**
 * Two things are linked if they happened on the same day.
 * `lift` = how much more often than chance — that's what makes a link interesting.
 */
export default function ConnectionWeb({
  onOpenDay,
  nodeParam,
}: {
  onOpenDay: (d: string) => void;
  nodeParam?: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState<number | null>(0);
  const [minLift, setMinLift] = useState(1.4);
  const [kinds, setKinds] = useState<Set<Kind>>(new Set(KINDS));
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pts = useRef<P[]>([]);
  const hover = useRef<number | null>(null);
  const selRef = useRef<number | null>(0);
  const selectionMix = useRef(1);

  useEffect(() => {
    const requested =
      nodeParam === null || nodeParam === undefined ? null : Number(nodeParam);
    if (
      requested !== null &&
      Number.isInteger(requested) &&
      DATA.nodes.some((n) => n.id === requested)
    ) {
      selRef.current = requested;
      setSel(requested);
    }
  }, [nodeParam]);

  const visible = useMemo(() => {
    const ok = new Set<number>();
    DATA.nodes.forEach((n, i) => {
      if (!kinds.has(n.kind)) return;
      if (q && !n.label.toLowerCase().includes(q.toLowerCase())) return;
      ok.add(i);
    });
    return ok;
  }, [kinds, q]);

  const edges = useMemo(
    () =>
      DATA.edges.filter(
        (e) => e.lift >= minLift && visible.has(e.s) && visible.has(e.t),
      ),
    [minLift, visible],
  );

  useEffect(() => {
    if (sel !== null && !visible.has(sel)) {
      const next = [...visible][0] ?? null;
      selRef.current = next;
      setSel(next);
    }
  }, [sel, visible]);

  const selectNode = (id: number | null) => {
    selRef.current = id;
    selectionMix.current = 0;
    setSel(id);
  };

  // ---- physics ----------------------------------------------------------
  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let frame = 0;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      cv.width = r.width * dpr;
      cv.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    if (pts.current.length !== DATA.nodes.length) {
      const r = cv.getBoundingClientRect();
      pts.current = DATA.nodes.map((n, i) => {
        const a = (i / DATA.nodes.length) * Math.PI * 2;
        return {
          x: r.width / 2 + Math.cos(a) * (r.width / 3.2),
          y: r.height / 2 + Math.sin(a) * (r.height / 3.2),
          vx: 0,
          vy: 0,
          r: 3 + Math.min(11, Math.sqrt(n.w) * 0.85),
        };
      });
    }

    const step = () => {
      const r = cv.getBoundingClientRect();
      frame += 1;
      if (r.width < 640 && frame % 2 === 0) {
        raf = requestAnimationFrame(step);
        return;
      }
      const P = pts.current;
      const cx = r.width / 2,
        cy = r.height / 2;

      // repulsion (only between visible nodes, O(n²) is fine at n=128)
      const vis = [...visible];
      for (let i = 0; i < vis.length; i++) {
        for (let j = i + 1; j < vis.length; j++) {
          const a = P[vis[i]],
            b = P[vis[j]];
          let dx = b.x - a.x,
            dy = b.y - a.y;
          let d2 = dx * dx + dy * dy || 0.01;
          if (d2 > 90000) continue;
          const f = 2600 / d2;
          const d = Math.sqrt(d2);
          dx /= d;
          dy /= d;
          a.vx -= dx * f;
          a.vy -= dy * f;
          b.vx += dx * f;
          b.vy += dy * f;
        }
      }
      // springs
      for (const e of edges) {
        const a = P[e.s],
          b = P[e.t];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const target = 130 - Math.min(70, e.lift * 16);
        const f = ((d - target) / d) * 0.012 * Math.min(3, e.lift);
        a.vx += dx * f;
        a.vy += dy * f;
        b.vx -= dx * f;
        b.vy -= dy * f;
      }
      // gravity + integrate
      for (const i of vis) {
        const p = P[i];
        p.vx += (cx - p.x) * 0.0016;
        p.vy += (cy - p.y) * 0.0016;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
      }

      // ---- draw ----
      ctx.clearRect(0, 0, r.width, r.height);
      const selected = selRef.current;
      selectionMix.current = Math.min(1, selectionMix.current + 0.12);
      const mix = selectionMix.current;
      const nb =
        selected !== null
          ? new Set(neighbours(selected, 40).map((n) => n.node.id))
          : null;

      for (const e of edges) {
        const a = P[e.s],
          b = P[e.t];
        const hot = selected !== null && (e.s === selected || e.t === selected);
        ctx.strokeStyle = hot
          ? `rgba(217,140,63,${0.07 + 0.68 * mix})`
          : "rgba(232,227,211,0.07)";
        ctx.lineWidth = hot
          ? 0.5 + (Math.min(3, 0.6 + e.lift * 0.45) - 0.5) * mix
          : 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (const i of vis) {
        const n = DATA.nodes[i],
          p = P[i];
        const on = selected === null || selected === i || nb?.has(i);
        ctx.globalAlpha = on ? 1 : 1 - 0.82 * mix;
        ctx.fillStyle = KIND_COLOR[n.kind];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fill();
        if (selected === i) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 5 + Math.sin(Date.now() / 180) * 1.5, 0, 7);
          ctx.stroke();
        }
        if (on && (p.r > 7 || selected === i || hover.current === i)) {
          ctx.globalAlpha = on ? 0.9 : 0.15;
          ctx.fillStyle = "#e8e3d3";
          ctx.font = "11px ui-monospace, monospace";
          ctx.fillText(n.label, p.x + p.r + 5, p.y + 4);
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(step);
    };
    step();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, [edges, visible]);

  const pick = (ev: React.MouseEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const mx = ev.clientX - r.left,
      my = ev.clientY - r.top;
    let best: number | null = null,
      bd = 1e9;
    for (const i of visible) {
      const p = pts.current[i];
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < p.r + 9 && d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };

  const node = sel !== null ? DATA.nodes[sel] : null;
  const links = sel !== null ? neighbours(sel, 12) : [];

  return (
    <div className="grid lg:grid-cols-[1fr_330px] gap-4 h-[calc(100vh-190px)] min-h-[520px]">
      <div className="relative rounded-lg border border-ink/15 overflow-hidden bg-[#0d0c0a]">
        <canvas
          ref={canvas}
          className="w-full h-full cursor-pointer"
          tabIndex={0}
          role="img"
          aria-label="Connection graph. Use the connection list to navigate nodes."
          onClick={(e) => selectNode(pick(e))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectNode(hover.current);
            }
          }}
          onMouseMove={(e) => (hover.current = pick(e))}
        />
        <button
          className="web-filter-toggle hidden absolute top-3 right-3 min-h-11 px-3 rounded border border-ink/35 bg-black/70 text-[10px] tracking-[0.18em]"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          FILTERS
        </button>
        <div
          className={`web-filters absolute top-3 left-3 flex flex-wrap gap-2 max-w-[calc(100%-24px)] ${filtersOpen ? "is-open" : ""}`}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="find…"
            className="bg-black/60 border border-ink/25 rounded px-2 py-1 min-h-11 text-[11px] w-28 outline-none focus:border-ink/60"
          />
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => {
                const n = new Set(kinds);
                n.has(k) ? n.delete(k) : n.add(k);
                setKinds(n);
              }}
              className={`min-h-11 px-2 py-1 rounded text-[10px] tracking-wider border transition
                ${kinds.has(k) ? "border-ink/50 bg-black/60" : "border-ink/15 opacity-40"}`}
              style={{ color: KIND_COLOR[k] }}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        {visible.size === 0 && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <p className="paper px-5 py-4 text-[12px] italic shadow-lg">
              No matches. Loosen the filters to reveal a connection.
            </p>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] tracking-wider opacity-70">
          <span>SURPRISE ≥ {minLift.toFixed(1)}×</span>
          <input
            type="range"
            min={1}
            max={6}
            step={0.1}
            value={minLift}
            onChange={(e) => setMinLift(+e.target.value)}
            className="w-32 accent-[#d98c3f]"
          />
          <span>{edges.length} links</span>
        </div>
      </div>

      <aside className="paper px-5 py-5 text-[12.5px] overflow-y-auto">
        {!node ? (
          <p className="opacity-60 italic">
            Pick anything. Two nodes are joined when they turned up on the same
            day — and the thicker the line, the less likely that was to be
            chance.
          </p>
        ) : (
          <>
            <div className="text-[10px] tracking-[0.3em] opacity-50">
              {KIND_LABEL[node.kind]}
            </div>
            <h3 className="text-[19px] font-bold mt-1 leading-tight">
              {node.label}
            </h3>
            <div className="text-[11px] opacity-60 mt-1">
              appears on {node.w} days
            </div>
            <div className="tear my-4" />
            <div className="text-[10px] tracking-[0.3em] opacity-50 mb-2">
              SHOWS UP WITH
            </div>
            <div className="space-y-2">
              {links.map(({ node: n2, edge }) => (
                <button
                  key={n2.id}
                  onClick={() => selectNode(n2.id)}
                  className="w-full text-left group"
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: KIND_COLOR[n2.kind] }}
                    />
                    <span className="truncate group-hover:underline underline-offset-2">
                      {n2.label}
                    </span>
                    <span className="flex-1 border-b border-dotted border-ink/30 translate-y-[-3px]" />
                    <span className="tabular-nums text-[11px] opacity-70">
                      {edge.w}d · {edge.lift}×
                    </span>
                  </div>
                </button>
              ))}
              {links.length === 0 && (
                <p className="opacity-50 italic">
                  Nothing co-occurs above threshold.
                </p>
              )}
            </div>
            <div className="tear my-4" />
            <p className="text-[11.5px] italic opacity-70 leading-relaxed">
              {node.kind === "artist"
                ? "Artists clustered here were played on the same days — the shape of a mood, not a playlist."
                : "This link exists because money, movement and music landed on the same date."}
            </p>
          </>
        )}
      </aside>
      <p className="sr-only" aria-live="polite">
        {node
          ? `${node.label}, ${KIND_LABEL[node.kind]}. Top connections: ${
              links
                .slice(0, 5)
                .map(({ node: linked }) => linked.label)
                .join(", ") || "none"
            }.`
          : "No node selected."}
      </p>
    </div>
  );
}
