import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { PhotoData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
/** Same feel as the canvas pinch. */
const ZOOM_SENSITIVITY = 0.01;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * How far off centre the picture may sit, per axis, before its edge would show.
 *
 * The <img> always fills the frame, but `object-contain` paints inside it at the
 * picture's own shape — so the axis that fits with room to spare has nothing to
 * pan along, however far it is zoomed in.
 */
function panLimits(img: HTMLImageElement | null, frame: DOMRect | undefined, zoom: number) {
  if (!img?.naturalWidth || !frame?.width) return { x: 0, y: 0 };
  const fit = Math.min(frame.width / img.naturalWidth, frame.height / img.naturalHeight);
  const painted = { x: img.naturalWidth * fit * zoom, y: img.naturalHeight * fit * zoom };
  return {
    x: Math.max(0, painted.x - frame.width) / 2 / (zoom * frame.width),
    y: Math.max(0, painted.y - frame.height) / 2 / (zoom * frame.height),
  };
}

export const PhotoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<PhotoData>(id);
  const [isDropTarget, setIsDropTarget] = useState(false);
  // 파일을 앱 폴더로 복사하는 동안, 그리고 실패했을 때. 둘 다 조용히 아무 일도
  // 안 일어나던 자리다 — PDF를 떨어뜨리면 위젯이 그대로 비어 있었고, 사용자는
  // 드롭을 못 받은 건지 사진이 안 되는 건지 알 수 없었다(DESIGN.md 6장).
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLImageElement>(null);

  const zoom = data.zoom ?? 1;
  const panX = data.panX ?? 0;
  const panY = data.panY ?? 0;

  // Images are copied into the app's own folder and referenced by URL, so a
  // space document never carries megabytes of base64.
  const store = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFailure(`${file.name} is not an image.`);
      return;
    }
    setFailure(null);
    setSaving(true);
    try {
      const url = await window.images?.save(await file.arrayBuffer(), file.name);
      if (url) update({ url, zoom: 1, panX: 0, panY: 0 });
      else setFailure('That image could not be saved.');
    } catch {
      setFailure('That image could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  // Pinch on the trackpad zooms the picture inside its frame; the widget keeps
  // the size it was given. A native listener, because it has to stop the event
  // reaching the canvas — which would otherwise zoom the whole space instead.
  useEffect(() => {
    const el = frame.current;
    if (!el || !data.url) return;

    const onWheel = (e: WheelEvent) => {
      // A pinch arrives as a wheel with ctrlKey; a plain two-finger scroll is
      // left to the canvas, so the space still pans over a photo.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const next = clamp(zoom * Math.exp(-e.deltaY * ZOOM_SENSITIVITY), MIN_ZOOM, MAX_ZOOM);
      const limit = panLimits(picture.current, el.getBoundingClientRect(), next);
      update({
        zoom: next,
        panX: clamp(panX, -limit.x, limit.x),
        panY: clamp(panY, -limit.y, limit.y),
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [data.url, zoom, panX, panY, update]);

  // Dragging a zoomed-in picture moves it under the frame. At 1 there is nothing
  // to move, so the drag stays with the widget and moves that instead.
  const onPointerDown = (e: React.PointerEvent) => {
    const box = frame.current?.getBoundingClientRect();
    if (zoom <= 1 || !box) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const start = { x: e.clientX, y: e.clientY, panX, panY };
    const limit = panLimits(picture.current, box, zoom);

    const onMove = (move: PointerEvent) => {
      update({
        panX: clamp(start.panX + (move.clientX - start.x) / box.width / zoom, -limit.x, limit.x),
        panY: clamp(start.panY + (move.clientY - start.y) / box.height / zoom, -limit.y, limit.y),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className="photo-paper h-full w-full flex flex-col px-3 pb-3 pt-10"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        const file = e.dataTransfer.files[0];
        if (file) void store(file);
      }}
    >
      <div
        ref={frame}
        onPointerDown={onPointerDown}
        onDoubleClick={() => update({ zoom: 1, panX: 0, panY: 0 })}
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-mark transition-all"
        style={{
          background: 'color-mix(in srgb, var(--ink) 8%, transparent)',
          boxShadow: isDropTarget ? '0 0 0 2px var(--accent)' : undefined,
          cursor: data.url && zoom > 1 ? 'grab' : undefined,
        }}
      >
        {saving ? (
          // 들어올 사진이 앉을 자리 그대로. 원형 스피너를 쓰지 않는다.
          <div className="skeleton w-full h-full" />
        ) : data.url ? (
          <img
            ref={picture}
            src={data.url}
            alt={data.caption}
            draggable={false}
            // `contain`, not `cover`: the frame is whatever size the widget was
            // dragged to, and cropping the picture to fill it meant a wide photo
            // in a tall widget showed a strip of its middle. The whole picture
            // fits the shape it is given; zoom is how you crop, on purpose.
            className="w-full h-full object-contain"
            style={{
              transform: `scale(${zoom}) translate(${panX * 100}%, ${panY * 100}%)`,
              transformOrigin: 'center',
            }}
          />
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="t-faint press hover:opacity-70 flex flex-col items-center gap-2 transition-opacity"
          >
            <ImagePlus size={28} />
            <span className="text-ui">Drop or choose a photo</span>
          </button>
        )}

        {/* 실패는 사진을 치우지 않고 그 위에 얹는다 — 사진이 걸린 위젯에 PDF를
            떨어뜨렸다고 걸려 있던 사진까지 사라지면 안 된다. */}
        {failure && !saving && (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lift)' }}
          >
            <span className="min-w-0 flex-1 text-ui" style={{ color: 'var(--danger)' }}>
              {failure}
            </span>
            <button
              onClick={() => {
                setFailure(null);
                fileInput.current?.click();
              }}
              className="chrome-button press shrink-0 px-2 h-6 rounded-control text-ui"
            >
              Choose another
            </button>
          </div>
        )}
      </div>

      {/* Polaroid-style caption strip below the image. */}
      <input
        value={data.caption}
        onChange={(e) => update({ caption: e.target.value })}
        placeholder={zoom > 1 ? 'Double-click the photo to reset the zoom' : 'Write a caption'}
        className="field mt-3 mb-1 shrink-0 !bg-transparent text-center text-body outline-none"
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void store(file);
        }}
      />
    </div>
  );
};
