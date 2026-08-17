import React from 'react';
import { Minimize2 } from 'lucide-react';
import { useSpaceStore, useWidget } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';
import { WIDGET_REGISTRY } from '../widgets/registry';

/**
 * The floating mini window: one widget, filling a small always-on-top window,
 * so it stays usable while the user works in another app.
 */
const MiniView: React.FC<{ id: string }> = ({ id }) => {
  const widget = useWidget(id);
  const exitMini = useUiStore((s) => s.exitMini);
  const entry = WIDGET_REGISTRY[widget.type];
  const Body = entry.Component;

  return (
    <div className="mini-shell fixed inset-0 flex flex-col overflow-hidden">
      <div className="widget-header h-7 shrink-0 flex items-center px-3 gap-2 titlebar-drag-region">
        <entry.icon size={12} className="t-soft" />
        <span className="t-ink text-xs">{entry.label}</span>
        <button
          onClick={exitMini}
          title="Back to canvas"
          className="chrome-button ml-auto p-1 -mr-1 rounded no-drag"
        >
          <Minimize2 size={12} />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <Body id={id} />
      </div>
    </div>
  );
};

export const MiniViewHost: React.FC = () => {
  const miniWidgetId = useUiStore((s) => s.miniWidgetId);
  // The widget may have been deleted while mini mode was active.
  const exists = useSpaceStore((s) =>
    miniWidgetId ? !!s.spaces[s.activeSpaceId]?.widgets[miniWidgetId] : false
  );

  if (!miniWidgetId || !exists) return null;
  return <MiniView id={miniWidgetId} />;
};
