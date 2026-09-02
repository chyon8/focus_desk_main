import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Home, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { BrowserData } from '../spaces/types';
import { useSiteVisitStore } from '../stores/siteVisitStore';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';
import { hostOf, toAddress } from './browserAddress';
import { BrowserStartPage } from './BrowserStartPage';
import { FULLSCREEN_CSS, FULLSCREEN_SHIM } from './browserFullscreen';
import { ALLOW_POPUPS, LINK_SHIM } from './browserLinks';
import { openTabBeside, sendToCanvas } from './newTab';
import { useWidgetData } from './useWidgetData';

// The levels a browser's ⌘+/⌘− walks through.
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** The next level in `direction`, or the same one at either end. */
function stepZoom(zoom: number, direction: 1 | -1) {
  const nearest = ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best
  );
  return ZOOM_STEPS[ZOOM_STEPS.indexOf(nearest) + direction] ?? nearest;
}

/** A load the user cancelled, which is not a failure worth a page about. */
const ERR_ABORTED = -3;

/**
 * The width the guest is laid out at when the widget is narrower than this.
 *
 * A <webview> is a real browser window: make it 300px wide and sites lay
 * themselves out for a 300px phone, so a shelf of small browser widgets shows a
 * column of unrecognisable fragments. Below this the page is laid out at this
 * width and scaled down instead, which keeps the desktop layout — small, but the
 * same shape the user remembers.
 */
const MIN_LAYOUT_WIDTH = 640;

/** Under this the address row is only taking up room; the header still names the page. */
const CHROME_MIN_WIDTH = 380;

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
 * What a browser widget shows before its page is loaded.
 *
 * An imported Chrome tab starts here rather than mounting a guest: a window of
 * twelve tabs would otherwise load twelve pages the moment the space opens. The
 * title and icon come from the tab, so the card names the page it stands for
 * before anything has been fetched.
 */
/**
 * A tab that has not been loaded: its logo, its title, and the site's own colour
 * behind both.
 *
 * The colour is what makes a wall of these readable. Twelve cards that differ
 * only by a 32-pixel icon are a list of links — the space they are in has to
 * look like somebody's desk at a glance, from far enough out that no title can
 * be read, and colour is the only thing that carries that far.
 */
/** Pages already asked about this run. Only what comes back is stored — a failure is about the moment, not the page. */
const askedFor = new Set<string>();

const BrowserCard: React.FC<{ data: BrowserData; onOpen: () => void }> = ({ data, onOpen }) => {
  const tint = data.faviconColor;
  const host = hostOf(data.url);
  return (
    <button
      onClick={onOpen}
      title={`Load ${data.url}`}
      className="t-ink relative h-full w-full flex flex-col overflow-hidden text-left"
      style={
        tint
          ? {
              // Strong enough to tell two sites apart across the canvas, faint
              // enough that the title stays the thing being read.
              background: `linear-gradient(160deg, rgba(${tint}, 0.30), rgba(${tint}, 0.10))`,
              boxShadow: `inset 0 0 0 1px rgba(${tint}, 0.35)`,
            }
          : undefined
      }
    >
      {/* The page's own preview picture, the way a pasted link is drawn
          elsewhere. It takes the room and the icon steps down to the caption:
          the picture says what the page is faster than its title does. Without
          one the card is what it was — a big icon over the title. */}
      {data.thumbnail ? (
        <img src={data.thumbnail} alt="" draggable={false} className="w-full flex-1 min-h-0 object-cover" />
      ) : (
        <div className="flex flex-1 min-h-0 items-center justify-center p-3">
          {data.favicon ? (
            <img
              src={data.favicon}
              alt=""
              className="w-16 h-16 rounded-xl object-contain"
              style={tint ? { filter: `drop-shadow(0 6px 14px rgba(${tint}, 0.55))` } : undefined}
            />
          ) : (
            <span className="glass t-soft w-16 h-16 rounded-xl flex items-center justify-center text-xl uppercase">
              {host[0] ?? '?'}
            </span>
          )}
        </div>
      )}

      <div className="shrink-0 flex items-center gap-2 px-3 py-2">
        {data.thumbnail && data.favicon && (
          <img src={data.favicon} alt="" className="shrink-0 w-4 h-4 rounded object-contain" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-snug truncate">
            {data.title || host}
          </div>
          <div className="t-faint text-[10px] truncate">{host}</div>
        </div>
      </div>
    </button>
  );
};

/**
 * A real browser inside the widget, as an Electron <webview>.
 *
 * The point of the element over a native WebContentsView: it is part of the page,
 * so the canvas transform scales it, the frame clips it and z-index stacks it —
 * no bounds syncing, no snapshots, no stepping aside for other widgets (D-029).
 *
 * A widget with no address shows a start page rather than loading a placeholder
 * site, and the address bar takes what people type into address bars: a host, a
 * full URL, or words to search for (D-075).
 */
export const BrowserWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<BrowserData>(id);
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  const [address, setAddress] = useState(data.url);
  const [history, setHistory] = useState({ back: false, forward: false });
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const view = useRef<Electron.WebviewTag>(null);
  // The page area in world units, which is what the guest is laid out at.
  const pageBox = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  // src is set once: after that the page navigates itself, and re-rendering with
  // a new src would yank it back. Empty means the start page is showing, and the
  // first address typed is what mounts the guest.
  const initialUrl = useRef(data.url);
  // Page zoom — the browser's own ⌘+/⌘−. It re-lays the page out at a new size,
  // which the canvas zoom cannot do: that only scales what is already drawn.
  const zoom = data.zoom ?? 1;
  // Read by the shortcut handler, which must not re-subscribe on every change.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  // Read by the navigation handler for the same reason.
  const urlRef = useRef(data.url);
  urlRef.current = data.url;
  // Set on the first dom-ready: which guest this is, and proof it can be zoomed
  // at all (setZoomFactor throws before the element is attached).
  const contentsId = useRef<number | null>(null);

  const hasPage = !!data.url;
  // Undefined is loaded, so only a widget created closed shows the card.
  const closed = hasPage && data.open === false;

  /**
   * A card with no icon fetches its own.
   *
   * An imported tab arrives without one — Chrome's tab list comes over
   * AppleScript, which cannot report favicons — and the page it would come from
   * is the page this card exists to avoid loading. Asked for here rather than at
   * import time so there is no race with the user pressing the button, and so a
   * card made any other way is filled in too. The main process keeps one request
   * per host, so a window of twelve tabs on one site costs one.
   */
  useEffect(() => {
    if (!closed || data.favicon) return;
    let host: string;
    try {
      host = new URL(data.url).hostname;
    } catch {
      return;
    }
    let wanted = true;
    void window.images?.favicons([host]).then((found) => {
      const icon = found[host];
      if (wanted && icon) update({ favicon: icon.url, faviconColor: icon.color });
    });
    return () => {
      wanted = false;
    };
    // `update` is stable for the widget's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed, data.url, data.favicon]);

  /**
   * And its preview picture, for the same reason: a card is a bookmark, and the
   * picture a page offers for one is what makes a stack of them readable. Asked
   * for per address rather than per host — every page has its own — and asked
   * again whenever the picture on file belongs to an address the widget has
   * since browsed away from. What came back is written even when it is nothing,
   * so the picture of the old page comes down and the ask does not repeat.
   */
  useEffect(() => {
    if (!closed || !data.url || data.previewUrl === data.url || askedFor.has(data.url)) return;
    const url = data.url;
    askedFor.add(url);
    let wanted = true;
    void window.images?.previews([url]).then((found) => {
      if (!wanted) return;
      const preview = found[url];
      update({
        previewUrl: url,
        thumbnail: preview?.image ?? '',
        description: preview?.description ?? '',
      });
    });
    return () => {
      wanted = false;
    };
    // `update` is stable for the widget's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed, data.url, data.previewUrl]);

  useEffect(() => {
    const el = pageBox.current;
    if (!el) return;
    // contentRect is the layout size, so the camera zoom does not enter into it —
    // a zoomed-out canvas must not relayout every page on it.
    const observer = new ResizeObserver(([entry]) =>
      setPageSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasPage]);

  const shrink =
    pageSize.width > 0 && pageSize.width < MIN_LAYOUT_WIDTH
      ? pageSize.width / MIN_LAYOUT_WIDTH
      : 1;
  // Always pixels, never percentages: the guest only follows the element when its
  // own style changes, so a percentage that stays "100%" leaves the page laid out
  // at its old width — maximising a browser widget used to do exactly that.
  const pageStyle: React.CSSProperties =
    pageSize.width === 0
      ? { width: '100%', height: '100%' }
      : {
          width: pageSize.width / shrink,
          height: pageSize.height / shrink,
          ...(shrink !== 1 && {
            transform: `scale(${shrink})`,
            transformOrigin: 'top left',
          }),
        };
  const showChrome = pageSize.width === 0 || pageSize.width >= CHROME_MIN_WIDTH;

  /** Goes somewhere, mounting the guest if this widget has not been anywhere yet. */
  const go = (url: string) => {
    if (!url) return;
    setFailure(null);
    setAddress(url);
    if (view.current && initialUrl.current) view.current.loadURL(url);
    else initialUrl.current = url;
    update({ url });
  };

  useEffect(() => {
    const el = view.current;
    if (!el) return;

    // Keep the address bar honest — sites redirect (music.youtube.com sends
    // signed-out visitors to youtube.com) and links navigate away.
    const readHistory = () => setHistory({ back: el.canGoBack(), forward: el.canGoForward() });

    const onNavigate = (e: Electron.DidNavigateEvent) => {
      setAddress(e.url);
      // A new site gets a blank header until it says its own name: otherwise the
      // last page's title sits there, and on a site with no favicon at all the
      // last page's icon would stay for good.
      const sameSite = hostOf(e.url) === hostOf(urlRef.current);
      update(sameSite ? { url: e.url } : { url: e.url, title: '', favicon: '' });
      // What the start page offers next time. Only full loads: a single-page
      // site would otherwise count a dozen times for one visit.
      useSiteVisitStore.getState().record(e.url);
      setFailure(null);
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

    // What the widget header wears, so several browsers can be told apart. Saved
    // in the widget so it is there before the page has loaded.
    const onTitle = (e: Electron.PageTitleUpdatedEvent) => update({ title: e.title });
    const onFavicon = (e: Electron.PageFaviconUpdatedEvent) => {
      const src = e.favicons?.[0];
      if (src) update({ favicon: src });
    };

    // A click inside the page goes to the guest, so the frame's own pointer
    // handler never runs — the widget has to report being used itself.
    // The page swallows the pointer, so the frame never learns it was used —
    // and `z` is what an arrange reads as "most recently used".
    const onUsed = () => {
      useUiStore.getState().noteActive(id);
      useSpaceStore.getState().bringToFront(id);
    };

    const onStart = () => setIsLoading(true);
    const onStop = () => setIsLoading(false);
    // A page that will not load leaves the guest blank, which reads as the widget
    // being broken rather than the site being unreachable.
    const onFail = (e: Electron.DidFailLoadEvent) => {
      if (!e.isMainFrame || e.errorCode === ERR_ABORTED) return;
      setFailure(e.errorDescription || 'The page could not be loaded.');
    };

    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('did-navigate', onNavigate);
    el.addEventListener('did-navigate-in-page', onNavigateInPage);
    el.addEventListener('focus', onUsed);
    el.addEventListener('page-title-updated', onTitle);
    el.addEventListener('page-favicon-updated', onFavicon);
    el.addEventListener('did-start-loading', onStart);
    el.addEventListener('did-stop-loading', onStop);
    el.addEventListener('did-fail-load', onFail);
    return () => {
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('did-navigate', onNavigate);
      el.removeEventListener('did-navigate-in-page', onNavigateInPage);
      el.removeEventListener('focus', onUsed);
      el.removeEventListener('page-title-updated', onTitle);
      el.removeEventListener('page-favicon-updated', onFavicon);
      el.removeEventListener('did-start-loading', onStart);
      el.removeEventListener('did-stop-loading', onStop);
      el.removeEventListener('did-fail-load', onFail);
    };
  }, [update, hasPage, id]);

  useEffect(() => {
    if (contentsId.current !== null) view.current?.setZoomFactor(zoom);
  }, [zoom]);

  // ⌘+/⌘−/⌘0 pressed inside the page never reach the app, so the main process
  // forwards them with the id of the guest they happened in.
  useEffect(() => {
    const off = window.windowMode?.onGuestKey((key, guestId) => {
      if (guestId === undefined || guestId !== contentsId.current) return;
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
      openTabBeside(id, url);
    });
    return () => off?.();
  }, [id]);

  // "Send to the canvas" from the page's context menu (D-081).
  useEffect(() => {
    const off = window.windowMode?.onGuestToCanvas((kind, value, guestId) => {
      if (guestId !== contentsId.current) return;
      void sendToCanvas(id, kind, value);
    });
    return () => off?.();
  }, [id]);

  // After the effects, so the hooks run either way: they all guard on a ref that
  // is null until the guest mounts.
  if (closed) return <BrowserCard data={data} onOpen={() => update({ open: true })} />;

  return (
    <div className="h-full w-full flex flex-col">
      {showChrome && (
      <form
        className="border-hair h-9 shrink-0 flex items-center px-2 gap-1 border-b"
        onSubmit={(e) => {
          e.preventDefault();
          go(toAddress(address));
        }}
      >
        <NavButton label="Back" disabled={!history.back} onClick={() => view.current?.goBack()}>
          <ArrowLeft size={13} />
        </NavButton>
        <NavButton
          label="Forward"
          disabled={!history.forward}
          onClick={() => view.current?.goForward()}
        >
          <ArrowRight size={13} />
        </NavButton>
        {isLoading ? (
          <NavButton label="Stop" onClick={() => view.current?.stop()}>
            <X size={13} />
          </NavButton>
        ) : (
          <NavButton
            label="Reload"
            disabled={!hasPage}
            onClick={() => view.current?.reload()}
          >
            <RotateCw size={12} />
          </NavButton>
        )}
        {/* Turns the widget back into a fresh tab. The guest is unmounted, so the
            page really does close — same as closing a tab, which is what the
            tiles are for. */}
        <NavButton
          label="Close the page and show the start page"
          disabled={!hasPage}
          onClick={() => {
            setAddress('');
            setFailure(null);
            update({ url: '', title: '', favicon: '' });
          }}
        >
          <Home size={12} />
        </NavButton>

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          // Clicking into a full address to change one word means selecting it
          // first, every time; every other browser does this for you.
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setAddress(data.url);
              e.currentTarget.blur();
            }
          }}
          placeholder="Search, or enter an address"
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
      )}

      <div ref={pageBox} className="relative flex-1 min-h-0 overflow-hidden">
        {hasPage ? (
          <webview
            ref={view}
            src={initialUrl.current}
            // Cookies and logins are scoped to the space, so the same site can be
            // signed in as different accounts in different spaces (D-074).
            partition={`persist:space-${spaceId}`}
            {...ALLOW_POPUPS}
            className="web-page absolute top-0 left-0"
            style={pageStyle}
          />
        ) : (
          <BrowserStartPage onOpen={go} />
        )}

        {failure && (
          <div className="glass-panel absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="t-ink text-sm">This page didn’t load</span>
            <span className="t-faint text-xs max-w-[40ch]">{failure}</span>
            <button
              onClick={() => {
                setFailure(null);
                view.current?.reload();
              }}
              className="chrome-button mt-1 px-3 h-8 rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
