import React, { useEffect, useRef, useState } from 'react';
import { BrowserData } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { useWidgetData } from './useWidgetData';

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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
  const view = useRef<Electron.WebviewTag>(null);
  // src is set once: after that the page navigates itself, and re-rendering with
  // a new src would yank it back.
  const initialUrl = useRef(data.url);

  useEffect(() => {
    const el = view.current;
    if (!el) return;

    // Keep the address bar honest — sites redirect (music.youtube.com sends
    // signed-out visitors to youtube.com) and links navigate away.
    const onNavigate = (e: Electron.DidNavigateEvent) => {
      setAddress(e.url);
      update({ url: e.url });
    };
    const onNavigateInPage = (e: Electron.DidNavigateInPageEvent) => {
      if (e.isMainFrame) setAddress(e.url);
    };

    el.addEventListener('did-navigate', onNavigate);
    el.addEventListener('did-navigate-in-page', onNavigateInPage);
    return () => {
      el.removeEventListener('did-navigate', onNavigate);
      el.removeEventListener('did-navigate-in-page', onNavigateInPage);
    };
  }, [update]);

  return (
    <div className="h-full w-full flex flex-col bg-black/40">
      <form
        className="h-9 shrink-0 flex items-center px-2 gap-2 border-b border-white/10"
        onSubmit={(e) => {
          e.preventDefault();
          const url = normalizeUrl(address);
          if (url) view.current?.loadURL(url);
        }}
      >
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter a URL"
          className="flex-1 min-w-0 bg-white/5 rounded-md px-2 py-1 text-xs text-white/80 placeholder-white/25 outline-none focus:bg-white/10"
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
