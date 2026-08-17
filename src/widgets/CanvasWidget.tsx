import React, { useRef, useState } from 'react';
import { Eraser, Minus, Pen, Trash2 } from 'lucide-react';
import { SketchData, SketchStroke } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

const COLORS = ['#1e293b', '#dc2626', '#2563eb', '#16a34a', '#eab308'];
const WIDTHS = [2, 4, 8];

function toPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  // Straight segments are enough at these stroke widths and keep the data small.
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export const CanvasWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<SketchData>(id);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [isErasing, setIsErasing] = useState(false);
  // The in-progress stroke lives in a ref: pointermove fires faster than React
  // re-renders, and reading it from state would append to a stale copy.
  const drawing = useRef<SketchStroke | null>(null);
  const [, redraw] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Points are stored in the SVG's own user units, so a stroke keeps its place
   * when the widget is resized or the camera zooms.
   */
  const pointAt = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1000,
      y: ((e.clientY - rect.top) / rect.height) * 1000,
    };
  };

  const eraseAt = (e: React.PointerEvent) => {
    const p = pointAt(e);
    const hit = data.strokes.find((stroke) =>
      stroke.points.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 20)
    );
    if (hit) update({ strokes: data.strokes.filter((s) => s.id !== hit.id) });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (isErasing) {
      eraseAt(e);
      return;
    }
    drawing.current = { id: crypto.randomUUID(), color, width, points: [pointAt(e)] };
    redraw((n) => n + 1);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isErasing) {
      if (e.buttons === 1) eraseAt(e);
      return;
    }
    if (!drawing.current) return;
    drawing.current.points.push(pointAt(e));
    redraw((n) => n + 1);
  };

  const onPointerUp = () => {
    const stroke = drawing.current;
    drawing.current = null;
    if (stroke && stroke.points.length > 1) {
      update({ strokes: [...data.strokes, stroke] });
    }
    redraw((n) => n + 1);
  };

  return (
    <div className="photo-paper h-full w-full flex flex-col">
      <div className="border-hair h-9 shrink-0 flex items-center gap-2 px-3 border-b">
        <button
          onClick={() => setIsErasing(false)}
          title="Draw"
          className={`chrome-button p-1.5 rounded-md ${isErasing ? '' : 'row-on'}`}
        >
          <Pen size={13} />
        </button>
        <button
          onClick={() => setIsErasing(true)}
          title="Erase"
          className={`chrome-button p-1.5 rounded-md ${isErasing ? 'row-on' : ''}`}
        >
          <Eraser size={13} />
        </button>

        <div className="bg-hair w-px h-4 mx-0.5" />

        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              setIsErasing(false);
            }}
            className={`w-4 h-4 rounded-full transition-transform ${
              color === c && !isErasing ? 'scale-110' : ''
            }`}
            style={{
              backgroundColor: c,
              boxShadow: color === c && !isErasing ? '0 0 0 2px var(--accent)' : undefined,
            }}
          />
        ))}

        <div className="bg-hair w-px h-4 mx-0.5" />

        {WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setWidth(w)}
            title={`${w}px`}
            className={`chrome-button p-1 rounded ${width === w ? 't-ink' : ''}`}
          >
            <Minus size={13} strokeWidth={w} />
          </button>
        ))}

        <button
          onClick={() => update({ strokes: [] })}
          title="Clear"
          className="t-faint hover:!text-red-400 ml-auto p-1.5 rounded-md transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className={`flex-1 min-h-0 w-full touch-none ${isErasing ? 'cursor-cell' : 'cursor-crosshair'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {[...data.strokes, ...(drawing.current ? [drawing.current] : [])].map((stroke) => (
          <path
            key={stroke.id}
            d={toPath(stroke.points)}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
};
