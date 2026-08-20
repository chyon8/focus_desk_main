import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { BrowserData } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { WIDGET_DEFS } from './defs';
import { FULLSCREEN_CSS, FULLSCREEN_SHIM } from './browserFullscreen';
import { LINK_SHIM } from './browserLinks';
import { useWidgetData } from './useWidgetData';

// Space left between a widget and the one a link opened out of it.
const NEW_TAB_GAP = 32;

// The levels a browser's ⌘+/⌘− walks through.
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** The next level in `direction`, or the same one at either end. */
function stepZoom(zoom: number, direction: 1 | -1) {
  const nearest = ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best
  );
  return ZOOM_STEPS[ZOOM_STEPS.indexOf(nearest) + direction] ?? nearest;
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const NavButton: React.FC<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, disabled, onClick, children }) => (
  <button
    type="button"
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="chrome-button shrink-0 w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30 disabled:hover:bg-transparent"
  >
    {children}
  </button>
);

/**
 * A real browser inside the widget, as an Electron <webview>.
 *
 * The point of the element over a native WebContentsView: it is part of the page,
 * so the canvas transform scales it, the frame clips it and z-index stacks it —
 * no bounds syncing, no snapshots, no stepping aside for other widgets (D-029).
 */
export const BrowserWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<BrowserData>(id);
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  const [address, setAddress] = useState(data.url);
  const [history, setHistory] = useState({ back: false, forward: false });
  const view = useRef<Electron.WebviewTag>(null);
  // src is set once: after that the page navigates itself, and re-rendering with
  // a new src would yank it back.
  const initialUrl = useRef(data.url);
  // Page zoom — the browser's own ⌘+/⌘−. It re-lays the page out at a new size,
  // which the canvas zoom cannot do: that only scales what is already drawn.
  const zoom = data.zoom ?? 1;
  // Read by the shortcut handler, which must not re-subscribe on every change.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  // Set on the first dom-ready: which guest this is, and proof it can be zoomed
  // at all (setZoomFactor throws before the element is attached).
  const contentsId = useRef<number | null>(null);

  useEffect(() => {
    const el = view.current;
    if (!el) return;

    // Keep the address bar honest — sites redirect (music.youtube.com sends
    // signed-out visitors to youtube.com) and links navigate away.
    const readHistory = () => setHistory({ back: el.canGoBack(), forward: el.canGoForward() });

    const onNavigate = (e: Electron.DidNavigateEvent) => {
      setAddress(e.url);
      update({ url: e.url });
      readHistory();
    };
    // Single-page sites (YouTube among them) change page with history.pushState,
    // which only surfaces here — so this has to persist too, or reopening the app
    // drops the user back on whatever the last full page load was.
    const onNavigateInPage = (e: Electron.DidNavigateInPageEvent) => {
      if (e.isMainFrame) {
        setAddress(e.url);
        update({ url: e.url });
      }
      readHistory();
    };

    // Every load gets a fresh page, so the shims go in on every dom-ready.
    const onDomReady = () => {
      contentsId.current = el.getWebContentsId();
      el.setZoomFactor(zoomRef.current);
      void el.insertCSS(FULLSCREEN_CSS);
      void el.executeJavaScript(FULLSCREEN_SHIM);
      void el.executeJavaScript(LINK_SHIM);
    };

    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('did-navigate', onNavigate);
    el.addEventListener('did-navigate-in-page', onNavigateInPage);
    return () => {
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('did-navigate', onNavigate);
      el.removeEventListener('did-navigate-in-page', onNavigateInPage);
    };
  }, [update]);

  useEffect(() => {
    if (contentsId.current !== null) view.current?.setZoomFactor(zoom);
  }, [zoom]);

  // ⌘+/⌘−/⌘0 pressed inside the page never reach the app, so the main process
  // forwards them with the id of the guest they happened in.
  useEffect(() => {
    const off = window.windowMode?.onGuestKey((key, id) => {
      if (id === undefined || id !== contentsId.current) return;
      if (key === 'zoom-in') update({ zoom: stepZoom(zoomRef.current, 1) });
      else if (key === 'zoom-out') update({ zoom: stepZoom(zoomRef.current, -1) });
      else if (key === 'zoom-reset') update({ zoom: 1 });
    });
    return () => off?.();
  }, [update]);

  // "Open in a new tab" means a new browser widget, laid down beside this one so
  // both pages are visible at once — the point of a space (D-065).
  useEffect(() => {
    const off = window.windowMode?.onGuestOpenUrl((url, guestId) => {
      if (guestId !== contentsId.current) return;
      const state = useSpaceStore.getState();
      const self = state.spaces[state.activeSpaceId]?.widgets[id];
      if (!self) return;
      const size = WIDGET_DEFS.browser.defaultSize;
      // `at` is the new widget's centre.
      state.addWidget('browser', { url }, {
        x: self.x + self.width + NEW_TAB_GAP + size.width / 2,
        y: self.y + size.height / 2,
      });
    });
    return () => off?.();
  }, [id]);

  return (
    <div className="h-full w-full flex flex-col">
      <form
        className="border-hair h-9 shrink-0 flex items-center px-2 gap-1 border-b"
        onSubmit={(e) => {
          e.preventDefault();
          const url = normalizeUrl(address);
          if (url) view.current?.loadURL(url);
        }}
      >
        <NavButton
          label="Back"
          disabled={!history.back}
          onClick={() => view.current?.goBack()}
        >
          <ArrowLeft size={13} />
        </NavButton>
        <NavButton
          label="Forward"
          disabled={!history.forward}
          onClick={() => view.current?.goForward()}
        >
          <ArrowRight size={13} />
        </NavButton>
        <NavButton label="Reload" onClick={() => view.current?.reload()}>
          <RotateCw size={12} />
        </NavButton>

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter a URL"
          className="field flex-1 min-w-0 rounded-md px-2 py-1 text-xs outline-none"
        />

        <NavButton
          label="Zoom out (⌘−)"
          disabled={zoom <= ZOOM_STEPS[0]}
          onClick={() => update({ zoom: stepZoom(zoom, -1) })}
        >
          <ZoomOut size={12} />
        </NavButton>
        {zoom !== 1 && (
          <button
            type="button"
            title="Reset zoom (⌘0)"
            onClick={() => update({ zoom: 1 })}
            className="chrome-button shrink-0 px-1 h-6 rounded-md text-[10px] tabular-nums"
          >
            {Math.round(zoom * 100)}%
          </button>
        )}
        <NavButton
          label="Zoom in (⌘+)"
          disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          onClick={() => update({ zoom: stepZoom(zoom, 1) })}
        >
          <ZoomIn size={12} />
        </NavButton>
      </form>

      <webview
        ref={view}
        src={initialUrl.current}
        // Cookies and logins are scoped to the space, so the same site can be
        // signed in as different accounts in different spaces.
        partition={`persist:space-${spaceId}`}
        allowpopups
        className="flex-1 w-full"
      />
    </div>
  );
};
