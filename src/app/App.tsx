import React, { useEffect, useState } from 'react';
import { Canvas } from '../canvas/Canvas';
import { useFocusStore } from '../stores/focusStore';
import { useSpaceStore } from '../stores/spaceStore';
import { AmbienceDock } from '../ambience/AmbienceDock';
import { FocusInsights } from '../focus/FocusInsights';
import { FocusSessionBar } from '../focus/FocusSessionBar';
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

  useEffect(() => {
    void useSpaceStore.getState().load();
    void useFocusStore.getState().load();
  }, []);

  if (!isLoaded) {
    return <div className="w-screen h-screen bg-[#1e1e24]" />;
  }

  if (isMini) {
    return (
      <div className="w-screen h-screen overflow-hidden text-white font-sans">
        <MiniViewHost />
      </div>
    );
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden text-white"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      <SceneLayer theme={theme} />
      <Canvas />
      <Sidebar />
      <FocusSessionBar />
      <AmbienceDock />
      <ThemePicker />
      <ControlBar onOpenInsights={() => setShowInsights(true)} />
      {showInsights && <FocusInsights onClose={() => setShowInsights(false)} />}
      {/* Drag handle for the frameless window. It does swallow clicks in the top
          24px, so anything that must stay clickable keeps clear of it: the
          maximised widget starts below the chrome row (see Canvas). */}
      <div className="fixed top-0 left-0 right-0 h-6 z-[60] titlebar-drag-region" />
    </div>
  );
};
