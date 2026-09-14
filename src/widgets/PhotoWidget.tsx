import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { PhotoData } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
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
 * `object-cover`는 틀 밖으로 넘친 부분을 <img> 상자에서 잘라낸다. 그래서 옮길 수
 * 있는 건 줌으로 커진 만큼뿐이고, 사진 비율과는 상관없이 두 축이 같다.
 */
function panLimit(zoom: number) {
  return (zoom - 1) / 2 / zoom;
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
      if (url) update({ url, zoom: 1, panX: 0, panY: 0, fit: true });
      else setFailure('That image could not be saved.');
    } catch {
      setFailure('That image could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  // 새로 넣은 사진은 읽힌 뒤 위젯 높이를 사진 비율에 맞춘다. 넓이는 그대로 둔다.
  // 사진이 카드를 꽉 채우므로(cover) 비율이 다르면 끝이 잘린다. 이미 있던 사진
  // 위젯은 `fit`이 없어서 크기가 안 바뀐다.
  const fitToPicture = (img: HTMLImageElement) => {
    if (!data.fit) return;
    const { resizeWidget, spaces, activeSpaceId } = useSpaceStore.getState();
    const widget = spaces[activeSpaceId]?.widgets[id];
    if (widget && img.naturalWidth) {
      resizeWidget(id, widget.width, Math.round((widget.width * img.naturalHeight) / img.naturalWidth));
    }
    update({ fit: undefined });
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
      const limit = panLimit(next);
      update({
        zoom: next,
        panX: clamp(panX, -limit, limit),
        panY: clamp(panY, -limit, limit),
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
    const limit = panLimit(zoom);

    const onMove = (move: PointerEvent) => {
      update({
        panX: clamp(start.panX + (move.clientX - start.x) / box.width / zoom, -limit, limit),
        panY: clamp(start.panY + (move.clientY - start.y) / box.height / zoom, -limit, limit),
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
      className="photo-paper relative h-full w-full"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        // 캔버스 onDrop까지 올라가면 같은 파일로 사진 위젯이 하나 더 생겼다.
        e.stopPropagation();
        setIsDropTarget(false);
        const file = e.dataTransfer.files[0];
        if (file) void store(file);
      }}
    >
      <div
        ref={frame}
        onPointerDown={onPointerDown}
        onDoubleClick={() => update({ zoom: 1, panX: 0, panY: 0 })}
        className="photo-frame"
        style={{ cursor: data.url && zoom > 1 ? 'grab' : undefined }}
      >
        {saving ? (
          // 들어올 사진이 앉을 자리 그대로. 원형 스피너를 쓰지 않는다.
          <div className="skeleton w-full h-full" />
        ) : data.url ? (
          <img
            src={data.url}
            alt={data.caption}
            draggable={false}
            onLoad={(e) => fitToPicture(e.currentTarget)}
            // `cover`: 사진이 카드를 꽉 채운다(2026-09-14 디자인 리뉴얼, 결정 6).
            // 넣을 때 위젯을 사진 비율에 맞추므로 보통은 안 잘린다. 위젯을 다른
            // 비율로 늘리면 끝이 잘린다.
            className="w-full h-full object-cover"
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

        {/* 캡션은 위젯을 가리킬 때만 사진 아래쪽에 뜬다. 입력도 여기서 한다. */}
        {data.url && !saving && !failure && (
          <div className="photo-caption">
            <input
              value={data.caption}
              onChange={(e) => update({ caption: e.target.value })}
              // 줌 중인 사진을 끄는 핸들러와 더블클릭 초기화가 입력칸에서 안 돌게 한다.
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              placeholder={zoom > 1 ? 'Double-click the photo to reset the zoom' : 'Write a caption'}
              className="text-body"
            />
          </div>
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

        {/* 드롭 표시. 사진 위에 그려야 해서 틀의 그림자가 아니라 따로 얹는다. */}
        {isDropTarget && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 0 2px var(--accent)', borderRadius: 'inherit' }}
          />
        )}
      </div>

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
