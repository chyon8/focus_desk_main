import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { BrowserData } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { FULLSCREEN_CSS, FULLSCREEN_SHIM } from './browserFullscreen';
import { useWidgetData } from './useWidgetData';

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

    // Every load gets a fresh page, so the shim goes in on every dom-ready.
    const onDomReady = () => {
      void el.insertCSS(FULLSCREEN_CSS);
      void el.executeJavaScript(FULLSCREEN_SHIM);
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
