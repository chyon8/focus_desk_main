import React, { useEffect, useRef, useState } from 'react';
import { isCovered } from '../canvas/layout';
import { BrowserData } from '../spaces/types';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { useWidgetData } from './useWidgetData';

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * A native WebContentsView composited by the main process on top of the
 * placeholder below. This component only reports where the placeholder sits on
 * screen and at what scale — the camera transform is applied by the browser, so
 * getBoundingClientRect() already gives the final rect.
 *
 * When the view is parked (zoomed too far out, this space is not active, or it
 * would paint over the app's chrome), the main process returns its last frame
 * and we render that in place.
 */
export const BrowserWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<BrowserData>(id);
  const [draft, setDraft] = useState(data.url);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = window.browserView;
    if (!api) return;

    let frame = 0;
    let disposed = false;

    void api.snapshot(id).then((image) => {
      if (!disposed) setSnapshot(image);
    });

    const sync = async () => {
      frame = 0;
      const el = viewportRef.current;
      if (!el) return;

      const state = useSpaceStore.getState();
      const widget = state.spaces[state.activeSpaceId]?.widgets[id];
      const url = (widget?.data as unknown as BrowserData | undefined)?.url;
      if (!widget || !url) return;

      // DOMRect's properties live on its prototype, so it does not survive the
      // structured clone across IPC — copy into a plain object.
      const { x, y, width, height } = el.getBoundingClientRect();
      // The native view paints above all HTML, so the main process hides it
      // whenever it reaches into the chrome and hands back its last frame.
      const parked = await api.sync(
        id,
        state.activeSpaceId,
        url,
        { x, y, width, height },
        getCamera().zoom,
        canvasArea(),
        // A native view ignores z-index and would paint over any widget stacked
        // in front of it — header and all — so it steps aside for one.
        isCovered(widget, Object.values(state.spaces[state.activeSpaceId].widgets))
      );
      if (!disposed) setSnapshot(parked);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => void sync());
    };

    schedule();
    const unsubscribe = useSpaceStore.subscribe(schedule);
    // Toggling the sidebar moves the canvas area, so the view must follow.
    const unsubscribeUi = useUiStore.subscribe(schedule);
    window.addEventListener('resize', schedule);

    return () => {
      disposed = true;
      unsubscribe();
      unsubscribeUi();
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
      // Unmount also happens on a space switch, so park rather than delete —
      // removeWidget in the store handles real deletion.
      void api.hibernate(id);
    };
  }, [id]);

  return (
    <div className="h-full w-full flex flex-col bg-black/40">
      <form
        className="h-9 shrink-0 flex items-center px-2 gap-2 border-b border-white/10"
        onSubmit={(e) => {
          e.preventDefault();
          update({ url: normalizeUrl(draft) });
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Enter a URL"
          className="flex-1 min-w-0 bg-white/5 rounded-md px-2 py-1 text-xs text-white/80 placeholder-white/25 outline-none focus:bg-white/10"
        />
      </form>

      {/* The native view covers this element and swallows every pointer event,
          so it stops short of the frame's bottom-right resize handle. */}
      <div ref={viewportRef} className="flex-1 relative overflow-hidden mb-4">
        {snapshot ? (
          <img src={snapshot} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/25 text-sm">
            {data.url ? 'loading' : 'no page'}
          </div>
        )}
      </div>
    </div>
  );
};
