import React, { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  COLUMN_CARD_HEIGHT,
  COLUMN_CARD_IMAGE,
  COLUMN_GAP,
  COLUMN_PAD,
} from '../canvas/columns';
import { dropRectAt, getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { screenToWorld } from '../canvas/camera';
import { pointedColumn } from '../canvas/WidgetFrame';
import type { BrowserData, ColumnData, WidgetDoc } from '../spaces/types';
import { hostOf } from './browserAddress';
import { cardSummary } from './cardSummary';
import { WIDGET_REGISTRY } from './registry';
import { useWidgetData } from './useWidgetData';

/** Pages already asked about this run, so a page that offers no picture is not asked once per render. */
const askedFor = new Set<string>();

/** A page in a column is a link preview: its picture, its address, its name, its own line. */
const PagePreview: React.FC<{ widget: WidgetDoc }> = ({ widget }) => {
  const card = cardSummary(widget);
  const Icon = WIDGET_REGISTRY[widget.type].icon;

  return (
    <div className="h-full w-full flex flex-col text-left">
      {card.image ? (
        <img
          src={card.image}
          alt=""
          draggable={false}
          className="w-full shrink-0 object-cover"
          style={{ height: COLUMN_CARD_IMAGE }}
        />
      ) : (
        <div
          className="flex w-full shrink-0 items-center justify-center"
          style={{
            height: COLUMN_CARD_IMAGE,
            background: card.tint
              ? `linear-gradient(160deg, rgba(${card.tint}, 0.30), rgba(${card.tint}, 0.10))`
              : 'color-mix(in srgb, var(--ink) 5%, transparent)',
          }}
        >
          {card.icon ? (
            <img src={card.icon} alt="" className="w-11 h-11 rounded-lg object-contain" />
          ) : (
            <Icon size={24} style={{ color: 'var(--ink-soft)' }} />
          )}
        </div>
      )}

      {/* Address, then name, then the page's own line — the order a link preview
          is read in, and the order every other app draws one in. */}
      <div className="min-h-0 flex-1 px-3 py-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {card.icon && (
            <img src={card.icon} alt="" className="shrink-0 w-3.5 h-3.5 rounded object-contain" />
          )}
          <span className="t-faint truncate text-[10px]">{card.subtitle}</span>
        </div>
        <div className="t-ink truncate text-[12px] font-semibold leading-tight">{card.title}</div>
        {card.body && <p className="t-faint text-[10px] leading-snug line-clamp-2">{card.body}</p>}
      </div>
    </div>
  );
};

/** How far the pointer has to travel before a press on a card becomes a drag. */
const DRAG_THRESHOLD = 6;

/** The strip at the top of a card that the card is dragged by. */
const CARD_HANDLE = 14;

/** Where the pointer is on the canvas, in the coordinates widgets are placed in. */
function worldPoint(e: React.PointerEvent) {
  const area = canvasArea();
  return screenToWorld(getCamera(), { x: e.clientX - area.x, y: e.clientY });
}

/** Puts down everything a drag was drawing, whether it ended in a drop or not. */
function clearDrag() {
  const ui = useUiStore.getState();
  ui.setDraggingWidget(null);
  ui.setDropTarget(null);
  ui.setDropSpot(null);
}

/**
 * One row of the column.
 *
 * A page becomes a preview: it is a card standing for a page nobody wants twelve
 * of loaded at once, and a live page this size is unreadable anyway. Everything
 * else stays itself — a todo list in a column is a todo list, and a summary of
 * one is no use to anybody. So the body is the widget's own, and only pages are
 * drawn as cards.
 *
 * A card is dragged, not buttoned. Dragging it up or down the list reorders it,
 * dragging it to another column moves it, and dragging it into the open takes it
 * out and sets it down where it was let go — which is the same gesture in all
 * three cases and needs nothing explaining.
 *
 * Every card is dragged by the same strip at its top, whatever is under it. The
 * drag used to start anywhere on a page card and only on a 12px edge for a note
 * or a todo list, so where a card could be grabbed depended on what it held and
 * nothing on screen said which. Starting it on the body also began a text
 * selection that ran across the whole canvas.
 *
 * The row keeps its own press handler rather than being a drag source for the
 * frame above it: the cards have no frames, which is the point of a column.
 */
const Card: React.FC<{ widget: WidgetDoc; onOpen: () => void }> = ({ widget, onOpen }) => {
  const isPage = widget.type === 'browser' || widget.type === 'webapp';
  const Body = WIDGET_REGISTRY[widget.type].Component;
  const isDragging = useUiStore((s) => s.draggingWidgetId === widget.id);
  const press = useRef<{ pointerId: number; x: number; y: number; dragging: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // ⌥ and ⇧ belong to the canvas — picking widgets out and banding them.
    if (e.button !== 0 || e.altKey || e.shiftKey) return;
    // Without this the press starts a text selection that keeps growing over
    // every widget the pointer crosses while the card is being dragged.
    e.preventDefault();
    press.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, dragging: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.pointerId !== e.pointerId) return;
    // The same guard the frame has: a release this element never saw would leave
    // the card being dragged by a bare hover.
    if (e.buttons === 0) {
      press.current = null;
      clearDrag();
      return;
    }
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return;
      p.dragging = true;
      useUiStore.getState().setDraggingWidget(widget.id);
    }
    const target = pointedColumn(widget.id, e);
    const ui = useUiStore.getState();
    ui.setDropTarget(target);
    // Over a column the column's own line says where it goes; in the open, the
    // outline is the only thing that does.
    ui.setDropSpot(target ? null : dropRectAt(widget, worldPoint(e)));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.pointerId !== e.pointerId) return;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    press.current = null;

    clearDrag();

    // A press on the handle that never travelled is nothing: opening a page is
    // a click on the card itself.
    if (!p.dragging) return;

    const target = pointedColumn(widget.id, e);
    const store = useSpaceStore.getState();
    if (target) store.dropIntoColumnAt(widget.id, target.columnId, target.index);
    else {
      // Let go in the open: it comes out, loaded, exactly where it was dropped.
      store.takeOutOfColumn(widget.id, true, worldPoint(e));
    }
  };

  return (
    <div
      className={`group card-tile relative w-full shrink-0 overflow-hidden rounded-xl ${
        isDragging ? 'opacity-40' : ''
      }`}
      style={{ height: COLUMN_CARD_HEIGHT }}
    >
      <div className="h-full w-full flex flex-col">
        <div
          className="shrink-0 flex select-none cursor-grab items-center justify-center active:cursor-grabbing"
          title="Drag to move it"
          style={{
            height: CARD_HANDLE,
            background: 'color-mix(in srgb, var(--ink) 7%, transparent)',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="h-[2px] w-6 rounded-full"
            style={{ background: 'color-mix(in srgb, var(--ink) 22%, transparent)' }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isPage ? (
            /* Not a button: a button inside a card that is also a drop target
               fires on releases the card meant to handle itself. */
            <div
              className="h-full w-full select-none cursor-pointer"
              title="Click to open it"
              onClick={onOpen}
            >
              <PagePreview widget={widget} />
            </div>
          ) : (
            <Body id={widget.id} />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The column: a name, a count, and its cards. The cards are ordinary widgets in
 * the space document — the column owns their order and draws them, and the
 * canvas leaves them out of its own render for as long as they are in here.
 */
export const ColumnWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data] = useWidgetData<ColumnData>(id);
  const children = useSpaceStore(
    useShallow((s) => {
      const space = s.spaces[s.activeSpaceId];
      return data.children.map((child) => space?.widgets[child]).filter(Boolean) as WidgetDoc[];
    })
  );

  // A card in a column is drawn here, so the fetch that fills one in belongs
  // here too — the browser widget's own is for cards standing on the canvas.
  // Both go through the main process, which keeps one request per site and one
  // per page however many cards ask.
  useEffect(() => {
    const pages = children
      .filter((child) => child.type === 'browser')
      .map((child) => ({ id: child.id, page: child.data as unknown as BrowserData }));
    const fill = (child: string, patch: Record<string, unknown>) =>
      useSpaceStore.getState().updateWidgetData(child, patch);

    const needIcon = pages.filter((child) => !child.page.favicon && child.page.url);
    const hosts = [...new Set(needIcon.map((child) => hostOf(child.page.url)))].filter(Boolean);
    if (hosts.length) {
      void window.images?.favicons(hosts).then((found) => {
        for (const child of needIcon) {
          const icon = found[hostOf(child.page.url)];
          if (icon) fill(child.id, { favicon: icon.url, faviconColor: icon.color });
        }
      });
    }

    // A card is asked about whenever its picture belongs to a different address
    // than the one it is on — which covers both a card that has never been asked
    // and a card whose page was browsed away from. The asked-list is per run, so
    // a page with nothing to offer costs one request a session rather than one
    // per render.
    const needArt = pages.filter((child) => child.page.url && child.page.previewUrl !== child.page.url);
    const urls = [...new Set(needArt.map((child) => child.page.url))].filter(
      (url) => !askedFor.has(url)
    );
    if (urls.length) {
      for (const url of urls) askedFor.add(url);
      void window.images?.previews(urls).then((found) => {
        for (const child of needArt) {
          const preview = found[child.page.url];
          // What came back is written even when it is nothing: the old picture
          // is of the page the card used to be on, and leaving it up says the
          // card is somewhere it is not. `previewUrl` is what stops the ask
          // repeating, so a page that offers nothing is not asked again either.
          fill(child.id, {
            previewUrl: child.page.url,
            thumbnail: preview?.image ?? '',
            description: preview?.description ?? '',
          });
        }
      });
    }
  }, [children]);

  const target = useUiStore((s) => (s.dropTarget?.columnId === id ? s.dropTarget.index : null));
  const draggingWidgetId = useUiStore((s) => s.draggingWidgetId);

  // The card being dragged stays mounted, only faded. Taking it out of the list
  // instead unmounted the element holding the pointer capture the moment the
  // drag began, so the release never arrived anywhere — the card did not move
  // and the line stayed up afterwards.
  //
  // The store counts slots in a list with that card left out, so dropping it
  // back where it started is the slot it already had. Here it is still in the
  // list, so a slot past its own position is one row further down on screen.
  const from = draggingWidgetId ? children.findIndex((c) => c.id === draggingWidgetId) : -1;
  const dropAt = target === null ? null : from !== -1 && target > from ? target + 1 : target;

  const Line = () => (
    <div className="drop-line shrink-0" style={{ marginBlock: -COLUMN_GAP / 2 }} />
  );

  return (
    <div className="h-full w-full flex flex-col">
      <div
        className="flex flex-1 min-h-0 flex-col overflow-hidden"
        style={{ gap: COLUMN_GAP, padding: COLUMN_PAD }}
      >
        {children.length === 0 && dropAt === null ? (
          <div className="t-faint flex flex-1 items-center justify-center text-center text-[11px] leading-relaxed">
            Drag a widget in
          </div>
        ) : (
          <>
            {dropAt === 0 && <Line />}
            {children.map((child, i) => (
              <React.Fragment key={child.id}>
                <Card
                  widget={child}
                  onOpen={() => useSpaceStore.getState().openFromColumn(child.id)}
                />
                {dropAt === i + 1 && <Line />}
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
