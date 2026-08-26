import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Home, Pencil, Plus, RotateCw, Search, X } from 'lucide-react';
import { WebAppData, WebAppIcon } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { useWebAppStore, type WebApp } from '../stores/webappStore';
import { WEB_APP_PRESETS, hostOf } from '../webapps/presets';
import type { WebAppPreset } from '../webapps/presets';
import { WebAppForm } from '../webapps/WebAppForm';
import { WebAppMark } from '../webapps/WebAppMark';
import { FULLSCREEN_CSS, FULLSCREEN_SHIM } from './browserFullscreen';
import { ALLOW_POPUPS, LINK_SHIM } from './browserLinks';
import { openTabBeside, sendToCanvas } from './newTab';
import { useWidgetData } from './useWidgetData';

// The levels a browser's ⌘+/⌘− walks through.
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

function stepZoom(zoom: number, direction: 1 | -1) {
  const nearest = ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best
  );
  return ZOOM_STEPS[ZOOM_STEPS.indexOf(nearest) + direction] ?? nearest;
}

function iconsEqual(a: WebAppIcon | null, b: WebAppIcon | null) {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind === 'emoji' ? a.char === (b as typeof a).char : a.src === (b as typeof a).src;
}

/**
 * A saved web app standing in the space (D-073).
 *
 * It behaves like the app widget — a tile with an icon, click to open — and is a
 * page underneath. That is the point: most of what a project actually runs on is
 * already a website, and a page needs no accessibility grant, moves no real
 * window and hides nothing to stay visible. It also inherits the space's cookie
 * jar, so the same tool is a different account in each space (D-074).
 */
export const WebAppWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<WebAppData>(id);
  const [editing, setEditing] = useState(false);
  const saved = useWebAppStore((s) => (data.appId ? s.apps[data.appId] : undefined));

  // The saved web app was renamed or given a new icon somewhere else. The widget
  // follows it — that is what standing for a saved one means.
  useEffect(() => {
    if (!saved) return;
    if (saved.name === data.name && iconsEqual(saved.icon, data.icon)) return;
    update({ name: saved.name, icon: saved.icon });
  }, [saved, data.name, data.icon, update]);

  if (!data.appId || editing) {
    return (
      <WebAppPicker
        editing={editing ? saved : undefined}
        onClose={editing ? () => setEditing(false) : undefined}
        onPick={(app) => {
          update({
            appId: app.id,
            name: app.name,
            icon: app.icon,
            homeUrl: app.url,
            // Editing keeps the page where it is unless the address itself moved.
            url: editing && data.url && app.url === data.homeUrl ? data.url : app.url,
            // Picking is the asking: the widget was empty and the user just said
            // what belongs here, so it loads rather than waiting to be clicked a
            // second time. Editing an existing one leaves it as it was.
            open: editing ? data.open : true,
          });
          setEditing(false);
        }}
      />
    );
  }

  return data.open ? (
    <WebAppPage id={id} data={data} update={update} />
  ) : (
    <WebAppTile data={data} onOpen={() => update({ open: true })} onEdit={() => setEditing(true)} />
  );
};

/** The closed state: an icon and a name, exactly like an app widget's launcher. */
const WebAppTile: React.FC<{
  data: WebAppData;
  onOpen: () => void;
  onEdit: () => void;
}> = ({ data, onOpen, onEdit }) => (
  <div className="t-ink h-full w-full flex flex-col p-3 gap-2">
    <button
      onClick={onOpen}
      title={`Open ${data.name} here`}
      className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5"
    >
      <WebAppMark icon={data.icon} name={data.name} size={56} />
      <span className="text-sm font-medium truncate max-w-full">{data.name}</span>
    </button>

    <div className="flex items-center justify-between gap-2 px-1">
      <span className="t-soft text-[11px] truncate">{hostOf(data.url || data.homeUrl)}</span>
      <button onClick={onEdit} title="Change which web app this is" className="t-faint hover:t-ink">
        <Pencil size={11} />
      </button>
    </div>
  </div>
);

/** The open state: the page, with only the controls a single-site window needs. */
const WebAppPage: React.FC<{
  id: string;
  data: WebAppData;
  update: (patch: Partial<WebAppData>) => void;
}> = ({ id, data, update }) => {
  const spaceId = useSpaceStore((s) => s.activeSpaceId);
  const [canGoBack, setCanGoBack] = useState(false);
  const view = useRef<Electron.WebviewTag>(null);
  // Set once: after this the page navigates itself, and a changing src would
  // yank it back to where it started.
  const initialUrl = useRef(data.url || data.homeUrl);
  const zoom = data.zoom ?? 1;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const contentsId = useRef<number | null>(null);
  const appId = data.appId;

  useEffect(() => {
    const el = view.current;
    if (!el) return;

    const remember = (url: string) => {
      update({ url });
      setCanGoBack(el.canGoBack());
    };
    const onNavigate = (e: Electron.DidNavigateEvent) => remember(e.url);
    // Single-page sites change page with history.pushState, which surfaces only
    // here — without it the widget reopens on whatever the last full load was.
    const onNavigateInPage = (e: Electron.DidNavigateInPageEvent) => {
      if (e.isMainFrame) remember(e.url);
      else setCanGoBack(el.canGoBack());
    };
    // Every load gets a fresh page, so the shims go in on every dom-ready.
    const onDomReady = () => {
      contentsId.current = el.getWebContentsId();
      el.setZoomFactor(zoomRef.current);
      void el.insertCSS(FULLSCREEN_CSS);
      void el.executeJavaScript(FULLSCREEN_SHIM);
      void el.executeJavaScript(LINK_SHIM);
    };
    // The site's own icon, which is the one the tile should be wearing. Taken
    // from the page rather than fetched from an icon service: this is a request
    // the page makes anyway, so it tells nobody new which sites the user uses.
    const onFavicon = (e: Electron.PageFaviconUpdatedEvent) => {
      const src = e.favicons?.[0];
      if (src) useWebAppStore.getState().noteFavicon(appId, src);
    };

    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('did-navigate', onNavigate);
    el.addEventListener('did-navigate-in-page', onNavigateInPage);
    el.addEventListener('page-favicon-updated', onFavicon);
    return () => {
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('did-navigate', onNavigate);
      el.removeEventListener('did-navigate-in-page', onNavigateInPage);
      el.removeEventListener('page-favicon-updated', onFavicon);
    };
  }, [update, appId]);

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

  // A link that asked for a new tab becomes a browser widget beside this one —
  // the same rule the browser widget follows (D-065). A browser rather than
  // another web app: what a link opens is a page, not a tool worth saving.
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

  return (
    <div className="h-full w-full flex flex-col">
      <div className="border-hair h-9 shrink-0 flex items-center px-2 gap-1.5 border-b">
        <WebAppMark icon={data.icon} name={data.name} size={16} className="shrink-0" />
        <span className="t-ink flex-1 min-w-0 text-xs truncate">{data.name}</span>

        <ToolButton label="Back" disabled={!canGoBack} onClick={() => view.current?.goBack()}>
          <ArrowLeft size={13} />
        </ToolButton>
        <ToolButton
          label={`Back to ${hostOf(data.homeUrl)}`}
          onClick={() => view.current?.loadURL(data.homeUrl)}
        >
          <Home size={12} />
        </ToolButton>
        <ToolButton label="Reload" onClick={() => view.current?.reload()}>
          <RotateCw size={12} />
        </ToolButton>
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
        {/* Back to the tile. The address is kept, so opening it again lands where
            the user left off. */}
        <ToolButton label="Close — back to the icon" onClick={() => update({ open: false })}>
          <X size={13} />
        </ToolButton>
      </div>

      <webview
        ref={view}
        src={initialUrl.current}
        // The space's own cookie jar, so the same site can be signed in as a
        // different account in each space (D-074).
        partition={`persist:space-${spaceId}`}
        {...ALLOW_POPUPS}
        className="flex-1 w-full"
      />
    </div>
  );
};

const ToolButton: React.FC<{
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
 * Choosing what stands here: the user's saved web apps first, then a short list
 * of suggestions, then the form that makes the feature worth having — an address
 * and an icon for whatever this particular project runs on.
 */
const WebAppPicker: React.FC<{
  editing?: WebApp;
  onPick: (app: WebApp) => void;
  onClose?: () => void;
}> = ({ editing, onPick, onClose }) => {
  const apps = useWebAppStore((s) => s.apps);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<WebApp | null>(editing ?? null);

  const saved = useMemo(() => {
    const all = Object.values(apps).sort((a, b) => a.name.localeCompare(b.name));
    const needle = query.trim().toLowerCase();
    return needle ? all.filter((app) => app.name.toLowerCase().includes(needle)) : all;
  }, [apps, query]);

  // Kept in the order the preset list is written in, so each heading is just the
  // point where the group changes.
  const presetGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const taken = new Set(Object.values(apps).map((app) => app.url));
    const groups: { group: string; items: WebAppPreset[] }[] = [];
    for (const preset of WEB_APP_PRESETS) {
      if (taken.has(preset.url)) continue;
      if (needle && !preset.name.toLowerCase().includes(needle)) continue;
      const last = groups[groups.length - 1];
      if (last?.group === preset.group) last.items.push(preset);
      else groups.push({ group: preset.group, items: [preset] });
    }
    return groups;
  }, [apps, query]);

  if (form) {
    // Editing the app this widget already stands for is a round trip: saving or
    // deleting closes the picker. Editing another saved one, or writing a new
    // one, comes back to the list — except that a brand new one is what the user
    // came here to choose, so saving it picks it.
    const isThisWidgets = !!editing && editing.id === form.id;
    const isSaved = !!apps[form.id];
    return (
      <WebAppForm
        draft={form}
        onCancel={() => (isThisWidgets ? onClose?.() : setForm(null))}
        onSave={(draft) => {
          const app = useWebAppStore.getState().save(draft);
          if (isThisWidgets || !isSaved) onPick(app);
          else setForm(null);
        }}
        onDelete={
          isSaved
            ? () => {
                useWebAppStore.getState().remove(form.id);
                if (isThisWidgets) onClose?.();
                else setForm(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="t-ink h-full w-full flex flex-col p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="t-soft text-xs font-semibold uppercase tracking-widest">Web app</span>
        {onClose && (
          <button onClick={onClose} className="t-faint hover:t-ink ml-auto">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="border-hair flex items-center gap-2 pb-2 mb-2 border-b">
        <Search size={14} className="t-faint shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your web apps"
          autoFocus
          className="field flex-1 min-w-0 !bg-transparent outline-none text-sm"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2 space-y-0.5">
        {saved.map((app) => (
          // The row picks, the pencil manages. Editing has to be reachable from
          // here and not only from a tile already standing for it: otherwise a
          // saved web app whose widget was closed can never be renamed or removed.
          <div key={app.id} className="row group flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
            <button
              onClick={() => onPick(app)}
              className="!text-[inherit] flex-1 min-w-0 flex items-center gap-2.5 text-left"
            >
              <WebAppMark icon={app.icon} name={app.name} size={20} className="shrink-0" />
              <span className="flex-1 min-w-0 text-sm truncate">{app.name}</span>
              <span className="t-faint text-[10px] truncate max-w-[8rem]">{hostOf(app.url)}</span>
            </button>
            <button
              onClick={() => setForm(app)}
              title={`Edit or remove ${app.name}`}
              className="t-faint hover:t-ink shrink-0 opacity-0 group-hover:opacity-100"
            >
              <Pencil size={11} />
            </button>
          </div>
        ))}

        {presetGroups.map(({ group, items }) => (
          <div key={group}>
            <div className="t-faint px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest">
              {group}
            </div>
            {items.map((preset) => (
              <button
                key={preset.url}
                onClick={() =>
                  onPick(
                    // Without the field picking, the preset's `group` would be
                    // saved onto the user's web app.
                    useWebAppStore
                      .getState()
                      .save({ name: preset.name, url: preset.url, icon: preset.icon })
                  )
                }
                className="row !text-[inherit] w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left"
              >
                <WebAppMark icon={preset.icon} name={preset.name} size={20} className="shrink-0" />
                <span className="flex-1 min-w-0 text-sm truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={() => setForm({ id: crypto.randomUUID(), name: '', url: '', icon: null })}
        className="row shrink-0 mt-2 flex items-center justify-center gap-2 py-2 rounded-lg text-xs"
      >
        <Plus size={13} />
        Add a web app
      </button>
    </div>
  );
};
