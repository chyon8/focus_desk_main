import React, { useEffect, useState } from 'react';
import { Canvas } from '../canvas/Canvas';
import { useFocusStore } from '../stores/focusStore';
import { flushSaves, useSpaceStore } from '../stores/spaceStore';
import { AmbienceDock } from '../ambience/AmbienceDock';
import { FocusInsights } from '../focus/FocusInsights';
import { FocusSessionBar } from '../focus/FocusSessionBar';
import { useSpaceTimeTracker } from '../focus/useSpaceTimeTracker';
import { useSpaceApps } from '../apps/useSpaceApps';
import { useAppTimeStore } from '../stores/appTimeStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useSiteVisitStore } from '../stores/siteVisitStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { useWebAppStore } from '../stores/webappStore';
import { SceneLayer } from '../themes/SceneLayer';
import { useActiveTheme, useThemeVariables } from '../themes/useTheme';
import { Launcher } from './Launcher';
import { QuickAdd } from './QuickAdd';
import { ShortcutSheet } from './ShortcutSheet';
import { ThemePicker } from './ThemePicker';
import { Sidebar } from './Sidebar';
import { HiddenAppsToast } from './HiddenAppsToast';
import { NoticeToast } from './NoticeToast';
import { SelectionBar } from './SelectionBar';
import { UndoToast } from './UndoToast';

export const App: React.FC = () => {
  const isLoaded = useSpaceStore((s) => s.isLoaded);
  const theme = useActiveTheme();
  const [showInsights, setShowInsights] = useState(false);

  useThemeVariables(theme);
  useSpaceTimeTracker();
  useSpaceApps();

  useEffect(() => {
    void useSpaceStore.getState().load();
    void useFocusStore.getState().load();
    void useSpaceTimeStore.getState().load();
    void useAppTimeStore.getState().load();
    void useWebAppStore.getState().load();
    void useSiteVisitStore.getState().load();
    void usePrefsStore.getState().load();
  }, []);

  // The paper switch is one attribute on the root; the CSS does the rest.
  const paper = usePrefsStore((s) => s.paper);
  useEffect(() => {
    document.documentElement.dataset.paper = paper;
  }, [paper]);

  // Saves are debounced, so closing the window right after an edit would drop it.
  useEffect(() => {
    window.addEventListener('beforeunload', flushSaves);
    return () => window.removeEventListener('beforeunload', flushSaves);
  }, []);

  if (!isLoaded) {
    return <div className="w-screen h-screen bg-[#1e1e24]" />;
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
      <Sidebar onOpenInsights={() => setShowInsights(true)} />
      <FocusSessionBar />
      <AmbienceDock />
      <ThemePicker />
      <QuickAdd />
      <Launcher />
      <ShortcutSheet />
      <SelectionBar />
      <UndoToast />
      <NoticeToast />
      <HiddenAppsToast />
      {showInsights && <FocusInsights onClose={() => setShowInsights(false)} />}
    </div>
  );
};
