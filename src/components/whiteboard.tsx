"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Download, PenLine, Trash2, Undo2 } from "lucide-react";

type Point = { x: number; y: number };
type Stroke = { id: string; color: string; points: Point[] };
const colors = [
  { value: "#1e6542", label: "سبز" },
  { value: "#222d40", label: "سرمه‌ای" },
  { value: "#975492", label: "بنفش" },
];

export function Whiteboard() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(colors[0]!.value);
  const svgRef = useRef<SVGSVGElement>(null);
  const active = useRef<{ strokeId: string; pointerId: number } | null>(null);

  function point(event: PointerEvent<SVGSVGElement>): Point {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const transformed = new DOMPoint(
      event.clientX,
      event.clientY,
    ).matrixTransform(matrix.inverse());
    return {
      x: Math.max(0, Math.min(1000, transformed.x)),
      y: Math.max(0, Math.min(600, transformed.y)),
    };
  }

  function end(event: PointerEvent<SVGSVGElement>) {
    if (active.current?.pointerId !== event.pointerId) return;
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function exportBoard() {
    if (!svgRef.current) return;
    const serialized = new XMLSerializer().serializeToString(svgRef.current);
    const url = URL.createObjectURL(
      new Blob([serialized], { type: "image/svg+xml" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "hamyar-whiteboard.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="board-panel" aria-label="تختهٔ محلی نمونه">
      <div className="board-toolbar">
        <strong>
          <PenLine size={17} /> قلم
        </strong>
        {colors.map((item) => (
          <button
            key={item.value}
            aria-label={`قلم ${item.label}`}
            aria-pressed={color === item.value}
            className={`board-color ${color === item.value ? "selected" : ""}`}
            onClick={() => setColor(item.value)}
          >
            <span style={{ background: item.value }} />
          </button>
        ))}
        <span className="toolbar-divider" />
        <button
          className="icon-button"
          aria-label="برگشت آخرین خط"
          title="برگشت آخرین خط"
          disabled={!strokes.length}
          onClick={() => setStrokes((current) => current.slice(0, -1))}
        >
          <Undo2 size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="پاک‌کردن تخته"
          title="پاک‌کردن تخته"
          disabled={!strokes.length}
          onClick={() => setStrokes([])}
        >
          <Trash2 size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="دانلود تخته"
          title="دانلود تخته"
          onClick={exportBoard}
        >
          <Download size={18} />
        </button>
      </div>
      <div className="board-canvas">
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          className="whiteboard"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          role="img"
          aria-label="ناحیهٔ رسم؛ با ماوس یا لمس خط بکشید"
          onPointerDown={(event) => {
            if (
              active.current ||
              (event.pointerType === "mouse" && event.button !== 0)
            )
              return;
            const id = crypto.randomUUID();
            const startPoint = point(event);
            active.current = { strokeId: id, pointerId: event.pointerId };
            event.currentTarget.setPointerCapture(event.pointerId);
            setStrokes((current) => [
              ...current,
              { id, color, points: [startPoint] },
            ]);
          }}
          onPointerMove={(event) => {
            if (!active.current || active.current.pointerId !== event.pointerId)
              return;
            const id = active.current.strokeId;
            const next = point(event);
            setStrokes((current) =>
              current.map((stroke) =>
                stroke.id === id
                  ? { ...stroke, points: [...stroke.points, next] }
                  : stroke,
              ),
            );
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={() => {
            active.current = null;
          }}
        >
          <defs>
            <pattern
              id="board-grid"
              width="25"
              height="25"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#9daf9e" opacity=".35" />
            </pattern>
          </defs>
          <rect width="1000" height="600" fill="#f6f8f3" />
          <rect width="1000" height="600" fill="url(#board-grid)" />
          {strokes.map((stroke) =>
            stroke.points.length === 1 ? (
              <circle
                key={stroke.id}
                cx={stroke.points[0]!.x}
                cy={stroke.points[0]!.y}
                r="2"
                fill={stroke.color}
              />
            ) : (
              <polyline
                key={stroke.id}
                points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={stroke.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          )}
        </svg>
        {strokes.length === 0 && (
          <div className="board-empty" aria-hidden="true">
            <PenLine size={31} />
            <strong>اینجا بنویسید</strong>
            <span>با ماوس یا لمس، روی تخته رسم کنید.</span>
          </div>
        )}
      </div>
    </section>
  );
}
