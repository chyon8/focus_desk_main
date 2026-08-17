import React from 'react';
import { BarChart2, Maximize, Music, Scan } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { WIDGET_REGISTRY, WIDGET_TYPES } from '../widgets/registry';
import { ArrangeMenu } from './ArrangeMenu';

const BarButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({
  label,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    title={label}
    className="chrome-button group relative w-10 h-10 flex items-center justify-center rounded-xl active:scale-95"
  >
    {children}
    <span className="glass-panel t-ink absolute bottom-full mb-2 px-2 py-1 rounded-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      {label}
    </span>
  </button>
);

// A site the browser widget opens straight into. Not a widget type of its own:
// a native view loads music.youtube.com just fine, and everything a dedicated
// widget would add (its own address bar, nav buttons) already exists.
const MUSIC_URL = 'https://music.youtube.com';

export const ControlBar: React.FC<{ onOpenInsights: () => void }> = ({ onOpenInsights }) => {
  const addWidget = useSpaceStore((s) => s.addWidget);
  const fitToWidgets = useSpaceStore((s) => s.fitToWidgets);
  const zoom = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.camera.zoom ?? 1);

  return (
    <div className="glass-panel fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-2 rounded-2xl shadow-2xl">
      {WIDGET_TYPES.map((type) => {
        const entry = WIDGET_REGISTRY[type];
        return (
          <BarButton key={type} label={entry.label} onClick={() => addWidget(type)}>
            <entry.icon size={18} />
          </BarButton>
        );
      })}

      <BarButton label="YouTube Music" onClick={() => addWidget('browser', { url: MUSIC_URL })}>
        <Music size={18} />
      </BarButton>

      <div className="bg-hair w-px h-6 mx-1" />

      <ArrangeMenu />
      <BarButton label="Fit to widgets (F)" onClick={fitToWidgets}>
        <Scan size={18} />
      </BarButton>
      <BarButton
        label="Fullscreen (⌃⌘F)"
        onClick={() => void window.windowMode?.toggleFullscreen()}
      >
        <Maximize size={18} />
      </BarButton>
      <BarButton label="Focus insights" onClick={onOpenInsights}>
        <BarChart2 size={18} />
      </BarButton>

      <span className="t-faint px-2 text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
    </div>
  );
};
