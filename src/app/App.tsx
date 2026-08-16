import React, { useEffect, useState } from 'react';
import { Canvas } from '../canvas/Canvas';
import { useFocusStore } from '../stores/focusStore';
import { useSpaceStore } from '../stores/spaceStore';
import { AmbienceDock } from '../ambience/AmbienceDock';
import { FocusInsights } from '../focus/FocusInsights';
import { FocusSessionBar } from '../focus/FocusSessionBar';
import { useUiStore } from '../stores/uiStore';
import { BackgroundPicker } from './BackgroundPicker';
import { ControlBar } from './ControlBar';
import { MiniViewHost } from './MiniView';
import { Sidebar } from './Sidebar';

export const App: React.FC = () => {
  const isLoaded = useSpaceStore((s) => s.isLoaded);
  const background = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const isMini = useUiStore((s) => s.miniWidgetId !== null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    void useSpaceStore.getState().load();
    void useFocusStore.getState().load();
  }, []);

  if (!isLoaded) {
    return <div className="w-screen h-screen bg-[#1e1e24]" />;
  }

  const backgroundStyle =
    background?.type === 'IMAGE'
      ? { backgroundImage: `url(${background.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: background?.value ?? '#1e1e24' };

  if (isMini) {
    return (
      <div className="w-screen h-screen overflow-hidden text-white font-sans">
        <MiniViewHost />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white font-sans" style={backgroundStyle}>
      <Canvas />
      <Sidebar />
      <FocusSessionBar />
      <AmbienceDock />
      <BackgroundPicker />
      <ControlBar onOpenInsights={() => setShowInsights(true)} />
      {showInsights && <FocusInsights onClose={() => setShowInsights(false)} />}
      {/* Drag handle for the frameless window. It does swallow clicks in the top
          24px, so anything that must stay clickable keeps clear of it: the
          maximised widget starts below the chrome row (see Canvas). */}
      <div className="fixed top-0 left-0 right-0 h-6 z-[60] titlebar-drag-region" />
    </div>
  );
};
