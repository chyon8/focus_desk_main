import React, { useEffect, useState } from 'react';
import { Canvas } from '../canvas/Canvas';
import { useFocusStore } from '../stores/focusStore';
import { useSpaceStore } from '../stores/spaceStore';
import { AmbienceDock } from '../ambience/AmbienceDock';
import { FocusInsights } from '../focus/FocusInsights';
import { FocusSessionBar } from '../focus/FocusSessionBar';
import { useSpaceTimeTracker } from '../focus/useSpaceTimeTracker';
import { useSpaceApps } from '../apps/useSpaceApps';
import { useAppTimeStore } from '../stores/appTimeStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { useUiStore } from '../stores/uiStore';
import { SceneLayer } from '../themes/SceneLayer';
import { useActiveTheme, useThemeVariables } from '../themes/useTheme';
import { ThemePicker } from './ThemePicker';
import { ControlBar } from './ControlBar';
import { MiniViewHost } from './MiniView';
import { Sidebar } from './Sidebar';

export const App: React.FC = () => {
  const isLoaded = useSpaceStore((s) => s.isLoaded);
  const theme = useActiveTheme();
  const isMini = useUiStore((s) => s.miniWidgetId !== null);
  const [showInsights, setShowInsights] = useState(false);

  useThemeVariables(theme);
  useSpaceTimeTracker();
  useSpaceApps();

  useEffect(() => {
    void useSpaceStore.getState().load();
    void useFocusStore.getState().load();
    void useSpaceTimeStore.getState().load();
    void useAppTimeStore.getState().load();
  }, []);

  if (!isLoaded) {
    return <div className="w-screen h-screen bg-[#1e1e24]" />;
  }

  if (isMini) {
    return (
      <div className="w-screen h-screen overflow-hidden" style={{ fontFamily: 'var(--font-ui)' }}>
        <MiniViewHost />
      </div>
    );
  }

  return (
    <div
      className="t-ink relative w-screen h-screen overflow-hidden"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {/* Drag handle for the frameless window. It comes first and sits lowest on
          purpose: the OS drag region is the union of the drag rects minus the
          no-drag rects that follow, so a widget resting under this strip punches
          its own hole and keeps its header draggable (WidgetFrame). */}
      <div className="fixed top-0 left-0 right-0 h-6 z-0 titlebar-drag-region" />
      <SceneLayer theme={theme} />
      <Canvas />
      <Sidebar />
      <FocusSessionBar />
      <AmbienceDock />
      <ThemePicker />
      <ControlBar onOpenInsights={() => setShowInsights(true)} />
      {showInsights && <FocusInsights onClose={() => setShowInsights(false)} />}
    </div>
  );
};
