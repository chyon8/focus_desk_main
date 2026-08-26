import React from 'react';
import { useWebAppStore } from '../stores/webappStore';
import { WebAppMark } from '../webapps/WebAppMark';
import { openWebApp } from './launcherItems';
import { WIDGET_DRAG_TYPE, WidgetDragPayload } from './WidgetPalette';

/** One row of icons. More than this is a list, and the launcher (K) is the list. */
const MAX_APPS = 8;

/**
 * The saved web apps, as icons, where the Dock would be.
 *
 * Opening a tool here took a widget being added first, which is the one step a
 * Dock does not have. A click opens the app in this space — or goes to its
 * widget if one is already standing — and dragging an icon puts it exactly where
 * it is let go, the way the widget palette below works.
 */
export const WebAppDock: React.FC = () => {
  const apps = useWebAppStore((s) => s.apps);
  const list = Object.values(apps)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, MAX_APPS);

  if (list.length === 0) return null;

  return (
    <div className="border-hair shrink-0 mt-3 pt-3 border-t">
      <div className="px-3 mb-2">
        <span className="t-faint text-[10px] font-bold uppercase tracking-widest">Web apps</span>
      </div>

      <div className="grid grid-cols-4 gap-1 px-1">
        {list.map((app) => (
          <button
            key={app.id}
            title={`${app.name} — click to open, or drag onto the canvas`}
            draggable
            onDragStart={(e) => {
              const payload: WidgetDragPayload = {
                type: 'webapp',
                data: {
                  appId: app.id,
                  name: app.name,
                  icon: app.icon,
                  homeUrl: app.url,
                  url: app.url,
                  open: true,
                },
              };
              e.dataTransfer.setData(WIDGET_DRAG_TYPE, JSON.stringify(payload));
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => openWebApp(app)}
            className="row flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg active:scale-95"
          >
            <WebAppMark icon={app.icon} name={app.name} size={18} />
            <span className="text-[9px] leading-none tracking-wide truncate max-w-full">
              {app.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
