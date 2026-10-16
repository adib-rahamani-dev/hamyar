"use client";
import { useRef, useState, type PointerEvent } from "react";
import { Download, Undo2, Trash2, Pencil } from "lucide-react";
import type { Stroke } from "@/modules/classroom/input";
const colors = {
  emerald: "var(--pen-green)",
  ink: "var(--pen-ink)",
  violet: "var(--pen-purple)",
};
const path = (points: number[][]) =>
  points.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
/** Pointer frames update the SVG draft only; a completed stroke is server-persisted. */
export function SharedBoard({
  strokes,
  revision,
  editable,
  canClear,
  busy,
  command,
}: {
  strokes: Stroke[];
  revision: number;
  editable: boolean;
  canClear: boolean;
  busy: boolean;
  command: (body: unknown) => Promise<void>;
}) {
  const svg = useRef<SVGSVGElement>(null),
    draft = useRef<SVGPathElement>(null);
  const points = useRef<number[][]>([]),
    pointer = useRef<number | null>(null);
  const [color, setColor] = useState<Stroke["color"]>("emerald"),
    [width, setWidth] = useState<Stroke["width"]>(4);
  function point(e: PointerEvent<SVGSVGElement>): number[] {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(
        Math.min(
          1000,
          Math.max(0, ((e.clientX - rect.left) / rect.width) * 1000),
        ),
      ),
      Math.round(
        Math.min(
          640,
          Math.max(0, ((e.clientY - rect.top) / rect.height) * 640),
        ),
      ),
    ];
  }
  function finish(e: PointerEvent<SVGSVGElement>) {
    if (pointer.current !== e.pointerId) return;
    const current = points.current;
    pointer.current = null;
    points.current = [];
    draft.current?.setAttribute("d", "");
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (editable && current.length >= 2 && e.type !== "pointercancel")
      void command({
        action: "add",
        stroke: { id: crypto.randomUUID(), color, width, points: current },
      });
  }
  function download() {
    const style = getComputedStyle(svg.current!);
    const palette = {
      emerald: style.getPropertyValue("--pen-green").trim(),
      ink: style.getPropertyValue("--pen-ink").trim(),
      violet: style.getPropertyValue("--pen-purple").trim(),
    };
    const paths = strokes
      .map(
        (s) =>
          `<path d="${path(s.points)}" stroke="${palette[s.color]}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join("");
    const bg = style.getPropertyValue("--board").trim();
    const url = URL.createObjectURL(
      new Blob(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 640"><rect width="1000" height="640" fill="${bg}"/>${paths}</svg>`,
        ],
        { type: "image/svg+xml" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "hamyar-board.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="shared-board-panel" aria-label="تختهٔ مشترک">
      <div className="board-tools">
        <span className="board-caption">
          <Pencil size={18} /> تختهٔ کلاس
        </span>
        <div className="board-palette" role="group" aria-label="رنگ قلم">
          {(["emerald", "ink", "violet"] as const).map((c, i) => (
            <button
              key={c}
              aria-label={`قلم ${["سبز", "روشن", "بنفش"][i]}`}
              aria-pressed={color === c}
              disabled={!editable || busy}
              onClick={() => setColor(c)}
              style={{ color: colors[c] }}
            >
              ●
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="board-width">
          ضخامت قلم
        </label>
        <select
          id="board-width"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value) as Stroke["width"])}
          disabled={!editable || busy}
        >
          <option value={2}>نازک</option>
          <option value={4}>معمولی</option>
          <option value={8}>ضخیم</option>
        </select>
        <button
          className="icon-button"
          aria-label="برگرداندن آخرین خط خودم"
          disabled={!editable || busy || !strokes.length}
          onClick={() => void command({ action: "undo", revision })}
        >
          <Undo2 size={19} />
        </button>
        <button
          className="icon-button"
          aria-label="پاک‌کردن تخته"
          disabled={!editable || !canClear || busy || !strokes.length}
          onClick={() => {
            if (window.confirm("تمام خطوط تخته پاک شوند؟"))
              void command({ action: "clear", revision });
          }}
        >
          <Trash2 size={19} />
        </button>
        <button
          className="icon-button"
          aria-label="دانلود تخته"
          onClick={download}
        >
          <Download size={19} />
        </button>
      </div>
      <svg
        ref={svg}
        className={`shared-board ${editable ? "is-editable" : ""}`}
        viewBox="0 0 1000 640"
        preserveAspectRatio="none"
        role="img"
        aria-label="محتوای تختهٔ مشترک کلاس"
        onPointerDown={(e) => {
          if (!editable || busy || e.button !== 0) return;
          e.preventDefault();
          pointer.current = e.pointerId;
          points.current = [point(e)];
          e.currentTarget.setPointerCapture(e.pointerId);
          draft.current?.setAttribute("stroke", colors[color]);
          draft.current?.setAttribute("stroke-width", String(width));
        }}
        onPointerMove={(e) => {
          if (pointer.current !== e.pointerId || points.current.length >= 120)
            return;
          const p = point(e),
            last = points.current.at(-1)!;
          if (Math.hypot(p[0]! - last[0]!, p[1]! - last[1]!) < 3) return;
          points.current.push(p);
          draft.current?.setAttribute("d", path(points.current));
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        <defs>
          <pattern
            id="classroom-grid"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".7" fill="var(--board-grid)" />
          </pattern>
        </defs>
        <rect width="1000" height="640" fill="url(#classroom-grid)" />
        {strokes.map((s) => (
          <path
            key={s.id}
            d={path(s.points)}
            stroke={colors[s.color]}
            strokeWidth={s.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <path
          ref={draft}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="board-foot">
        <span>
          {editable
            ? "بنویسید؛ خطوط برای اعضای اتاق ذخیره می‌شوند."
            : "نمایش تخته؛ اجازهٔ نوشتن را از میزبان بخواهید."}
        </span>
        <span>{strokes.length.toLocaleString("fa-IR")} / ۲۰۰ خط</span>
      </div>
    </section>
  );
}
