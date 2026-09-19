import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Plus, Search, X } from 'lucide-react';
import { WebAppData, WebAppIcon } from '../spaces/types';
import { useUiStore } from '../stores/uiStore';
import { useWebAppStore, type WebApp } from '../stores/webappStore';
import { isComposing } from '../app/ime';
import { WEB_APP_PRESETS, hostOf } from '../webapps/presets';
import type { WebAppPreset } from '../webapps/presets';
import { WebAppForm } from '../webapps/WebAppForm';
import { WebAppMark } from '../webapps/WebAppMark';
import { BrowserWidget } from './BrowserWidget';
import { useWidgetData } from './useWidgetData';

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

  // The saved web app wears the logo this widget fetched, or the sidebar row
  // keeps the preset's emoji while the tile beside it shows the real thing. On
  // the value rather than in the fetch: a widget that already had its logo when
  // this was written never fetches again, and its saved app would stay stale.
  const { appId, favicon } = data;
  useEffect(() => {
    if (appId && favicon) useWebAppStore.getState().noteFavicon(appId, favicon);
  }, [appId, favicon]);

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
    <BrowserWidget
      id={id}
      onFavicon={(src) => useWebAppStore.getState().noteFavicon(data.appId, src)}
    />
  ) : (
    <WebAppTile
      data={data}
      onOpen={() => update({ open: true })}
      onEdit={() => setEditing(true)}
      onIcon={(favicon, faviconColor) => update({ favicon, faviconColor })}
    />
  );
};

/**
 * The closed state: the site's own logo on the plate, with the name and host
 * along the bottom.
 *
 * 사이트 색으로 타일 전체를 칠하던 것을 뺐다. 위젯 면은 --surface 한 값으로만
 * 칠하고 타일은 --surface-2 한 값이다(DESIGN.md 1장) — 사이트마다 다른 색을
 * 칠하면 캔버스에 위젯 대여섯 개가 서로 다른 색 면으로 서고, 배경 사진 위에서
 * 한 벌로 안 읽힌다. 무엇인지는 진짜 로고와 이름이 말한다.
 *
 * --plate(잉크 11%)에서 --surface-2(6%)로 옅게 했다(2026-09-15 디자인 리뉴얼).
 * 흰 카드 사이에서 11%는 회색 판으로 읽혔다.
 */
const WebAppTile: React.FC<{
  data: WebAppData;
  onOpen: () => void;
  onEdit: () => void;
  onIcon: (favicon: string, faviconColor?: string) => void;
}> = ({ data, onOpen, onEdit, onIcon }) => {
  const address = data.url || data.homeUrl;
  const host = hostOf(address);

  // The site's icon, asked for once per host and cached in the main process, so
  // a tile is wearing the real logo a second after it lands. The emoji shows
  // until then and stays for sites that have no icon at all.
  //
  // The full hostname, not `hostOf`: that one drops `www.` because it writes the
  // label under the name, and `notion.so` without it serves nothing to fetch.
  useEffect(() => {
    if (data.favicon) return;
    let name: string;
    try {
      name = new URL(address).hostname;
    } catch {
      return;
    }
    let wanted = true;
    void window.images?.favicons([name]).then((found) => {
      const icon = found[name];
      if (wanted && icon) onIcon(icon.url, icon.color);
    });
    return () => {
      wanted = false;
    };
    // `onIcon` is stable for the widget's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, data.favicon]);

  return (
    <button
      onClick={onOpen}
      title={`Open ${data.name} here`}
      className="t-ink group/tile relative h-full w-full flex flex-col overflow-hidden text-left"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="flex flex-1 min-h-0 items-center justify-center p-3">
        {data.favicon ? (
          <img
            src={data.favicon}
            alt=""
            draggable={false}
            className="w-16 h-16 rounded-control object-contain"
          />
        ) : (
          <WebAppMark icon={data.icon} name={data.name} size={56} />
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-body font-medium leading-snug truncate">{data.name}</div>
          <div className="t-faint text-micro truncate">{host}</div>
        </div>
        {/* On hover only: changing which app this is belongs with the other
            things a header offers, not in the tile's resting state. */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Change which favorite this is"
          className="t-faint press hover:t-ink shrink-0 opacity-0 group-hover/tile:opacity-100"
        >
          <Pencil size={12} />
        </span>
      </div>
    </button>
  );
};

/**
 * Choosing what stands here: the user's saved web apps first, then a short list
 * of suggestions.
 *
 * One screen (2026-09-19 사용자). A row only opens the favourite it names —
 * picking is not the place to edit one, which is what the pencil made it. One
 * favourite is renamed, re-addressed or removed by right-clicking its row, the
 * way spaces, widgets and sign-ins are; the whole list is managed in Settings →
 * Favorites, which is also the only place it can be read without a widget.
 *
 * One type size at every width. The list was stepped up on wide panels and read
 * as a blown-up card; what a wide panel changes is the margin, not the text, so
 * the content is held to one column and centred.
 */
const COLUMN = 'mx-auto w-full max-w-[420px]';

const WebAppPicker: React.FC<{
  editing?: WebApp;
  onPick: (app: WebApp) => void;
  onClose?: () => void;
}> = ({ editing, onPick, onClose }) => {
  const apps = useWebAppStore((s) => s.apps);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<WebApp | null>(null);
  const [menu, setMenu] = useState<{ app: WebApp; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

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
    return (
      <div className="t-ink h-full w-full flex flex-col p-4">
        <div className={`${COLUMN} flex-1 min-h-0 flex flex-col`}>
          <WebAppForm
            draft={form}
            onCancel={() => setForm(null)}
            onSave={(draft) => {
              const app = useWebAppStore.getState().save(draft);
              // A favourite written here is what the user came for, so saving it
              // puts it in the widget. Changing the address of the one this
              // widget already stands for moves the widget with it.
              if (!apps[app.id] || (editing && editing.id === app.id)) onPick(app);
              else setForm(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="t-ink h-full w-full flex flex-col p-4">
      <div className={`${COLUMN} flex-1 min-h-0 flex flex-col`}>
        <div className="border-hair flex items-center gap-2 pb-2 mb-2 border-b">
          <Search size={14} className="t-faint shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your favorites"
            autoFocus
            className="field flex-1 min-w-0 !bg-transparent outline-none text-body"
          />
          {onClose && (
            <button onClick={onClose} className="t-faint press hover:t-ink shrink-0">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2 space-y-0.5">
          {saved.map((app) => (
            <SavedRow
              key={app.id}
              app={app}
              renaming={renaming === app.id}
              onOpen={() => onPick(app)}
              onMenu={(x, y) => setMenu({ app, x, y })}
              onRenamed={(name) => {
                if (name.trim()) useWebAppStore.getState().save({ ...app, name: name.trim() });
                setRenaming(null);
              }}
            />
          ))}

          {presetGroups.map(({ group, items }) => (
            <div key={group}>
              <div className="t-faint px-2 pt-3 pb-1 text-micro font-bold uppercase tracking-widest">
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
                  className="row press !text-[inherit] w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-left"
                >
                  <WebAppMark icon={preset.icon} name={preset.name} size={20} className="shrink-0" />
                  <span className="flex-1 min-w-0 text-body truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="border-hair shrink-0 mt-2 pt-2 flex items-center gap-2 border-t">
          <button
            onClick={() => setForm({ id: crypto.randomUUID(), name: '', url: '', icon: null })}
            className="row press flex items-center gap-1.5 px-2 py-1.5 rounded-control text-ui"
          >
            <Plus size={13} />
            Add by address
          </button>
          <button
            onClick={() => useUiStore.getState().setFavoritesOpen(true)}
            title="Rename, re-address or remove favorites"
            className="t-faint press hover:t-ink ml-auto px-2 py-1.5 text-ui"
          >
            Manage in settings
          </button>
        </div>
      </div>

      {menu &&
        /* On the body, not in the widget: the canvas is transformed, and inside a
           transform even `position: fixed` is measured from that element. */
        createPortal(
          <>
            <div className="fixed inset-0 z-[95]" onPointerDown={() => setMenu(null)} />
            <div
              className="glass-panel fixed z-[96] w-44 p-1 rounded-surface"
              style={{
                left: Math.min(menu.x, window.innerWidth - 184),
                top: Math.min(menu.y, window.innerHeight - 124),
              }}
            >
              <MenuItem
                label="Rename"
                onClick={() => {
                  setRenaming(menu.app.id);
                  setMenu(null);
                }}
              />
              <MenuItem
                label="Change address…"
                onClick={() => {
                  setForm(menu.app);
                  setMenu(null);
                }}
              />
              <MenuItem
                label="Remove"
                danger
                onClick={() => {
                  useWebAppStore.getState().remove(menu.app.id);
                  setMenu(null);
                }}
              />
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

const MenuItem: React.FC<{ label: string; danger?: boolean; onClick: () => void }> = ({
  label,
  danger,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`row press w-full px-2 py-1.5 rounded-control text-ui text-left ${
      danger ? 't-danger' : ''
    }`}
  >
    {label}
  </button>
);

/**
 * A saved favourite in the list. Renaming happens on the row itself — the name
 * is already on screen, so it is that text that gets edited rather than a form
 * (2026-09-18 사용자, `.name-input`).
 */
const SavedRow: React.FC<{
  app: WebApp;
  renaming: boolean;
  onOpen: () => void;
  onMenu: (x: number, y: number) => void;
  onRenamed: (name: string) => void;
}> = ({ app, renaming, onOpen, onMenu, onRenamed }) => {
  const [draft, setDraft] = useState(app.name);
  useEffect(() => setDraft(app.name), [app.name, renaming]);

  const host = hostOf(app.url);
  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        // The frame has its own right-click menu (which sign-in the page uses).
        // Over a row, the row is what was aimed at.
        e.stopPropagation();
        onMenu(e.clientX, e.clientY);
      }}
      className="row flex items-center gap-2 px-2 py-1.5 rounded-control"
    >
      <WebAppMark icon={app.icon} name={app.name} size={20} className="shrink-0" />
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onRenamed(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isComposing(e)) onRenamed(draft);
            if (e.key === 'Escape') onRenamed(app.name);
          }}
          className="name-input flex-1 min-w-0 text-body"
        />
      ) : (
        <button
          onClick={onOpen}
          className="press !text-[inherit] flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          <span className="flex-1 min-w-0 text-body truncate">{app.name}</span>
          {/* Only when it says something the name does not. */}
          {host.toLowerCase() !== app.name.toLowerCase() &&
            host.replace(/\..*$/, '').toLowerCase() !== app.name.toLowerCase() && (
            <span className="t-faint text-meta truncate max-w-[9rem]">{host}</span>
          )}
        </button>
      )}
    </div>
  );
};
