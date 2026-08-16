import React from 'react';
import { BarChart2, Scan } from 'lucide-react';
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
    className="group relative w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
  >
    {children}
    <span className="absolute bottom-full mb-2 px-2 py-1 rounded-md bg-black/80 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      {label}
    </span>
  </button>
);

export const ControlBar: React.FC<{ onOpenInsights: () => void }> = ({ onOpenInsights }) => {
  const addWidget = useSpaceStore((s) => s.addWidget);
  const fitToWidgets = useSpaceStore((s) => s.fitToWidgets);
  const zoom = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.camera.zoom ?? 1);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-2 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl">
      {WIDGET_TYPES.map((type) => {
        const entry = WIDGET_REGISTRY[type];
        return (
          <BarButton key={type} label={entry.label} onClick={() => addWidget(type)}>
            <entry.icon size={18} />
          </BarButton>
        );
      })}

      <div className="w-px h-6 bg-white/10 mx-1" />

      <ArrangeMenu />
      <BarButton label="Fit to widgets (F)" onClick={fitToWidgets}>
        <Scan size={18} />
      </BarButton>
      <BarButton label="Focus insights" onClick={onOpenInsights}>
        <BarChart2 size={18} />
      </BarButton>

      <span className="px-2 text-xs text-white/40 tabular-nums">{Math.round(zoom * 100)}%</span>
    </div>
  );
};
