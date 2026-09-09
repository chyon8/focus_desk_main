import React, { useEffect, useState } from 'react';
import { Canvas } from '../canvas/Canvas';
import { useFocusStore } from '../stores/focusStore';
import { flushSaves, useSpaceStore } from '../stores/spaceStore';
import { AmbienceEngineHost, SoundPanel } from '../ambience/AmbienceDock';
import { FocusInsights } from '../focus/FocusInsights';
import { FocusSessionBar } from '../focus/FocusSessionBar';
import { useSpaceTimeTracker } from '../focus/useSpaceTimeTracker';
import { useWelcomeBack } from '../focus/useWelcomeBack';
import { useSpaceApps } from '../apps/useSpaceApps';
import { useAppTimeStore } from '../stores/appTimeStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useSiteVisitStore } from '../stores/siteVisitStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { useWebAppStore } from '../stores/webappStore';
import { FirstSteps } from '../onboarding/FirstSteps';
import { Onboarding } from '../onboarding/Onboarding';
import { SceneLayer } from '../themes/SceneLayer';
import { useActiveTheme, useThemeVariables } from '../themes/useTheme';
import { Launcher } from './Launcher';
import { QuickAdd } from './QuickAdd';
import { ShortcutSheet } from './ShortcutSheet';
import { ThemePicker } from './ThemePicker';
import { Rail } from './Rail';
import { HiddenAppsToast } from './HiddenAppsToast';
import { NoticeToast } from './NoticeToast';
import { Dock } from './Dock';
import { UndoToast } from './UndoToast';
import { useUiStore } from '../stores/uiStore';

/**
 * 배경을 누르면 열려 있던 Atmosphere·Sound 패널이 닫힌다.
 *
 * 둘은 레일 버튼으로만 여닫혔다. 그래서 켜둔 채 다른 데를 눌러도 남아 있었고,
 * 레일을 접으면 입구까지 사라져서 끌 수가 없었다. 한 번에 하나만 열리므로
 * (`openDock`이 값 하나다) 뒷판도 하나다.
 *
 * 패널보다 아래(z-49), 레일보다 위다 — 레일 버튼을 다시 눌러 닫는 길이 막히면
 * 안 되고, 그 클릭은 `toggleDock`이 받아야 한다.
 */
const DockBackdrop: React.FC = () => {
  const openDock = useUiStore((s) => s.openDock);
  if (!openDock) return null;
  return (
    <div
      className="fixed inset-0 z-[49]"
      onPointerDown={() => useUiStore.getState().closeDock()}
    />
  );
};

export const App: React.FC = () => {
  const isLoaded = useSpaceStore((s) => s.isLoaded);
  const needsOnboarding = useSpaceStore((s) => s.needsOnboarding);
  const theme = useActiveTheme();
  const [showInsights, setShowInsights] = useState(false);
  // Seen once, on a profile with nothing in it. To work on it, run the app on a
  // profile of its own: `FOCUS_DESK_PROFILE=test npm run dev`.
  const [onboarding, setOnboarding] = useState(false);

  useThemeVariables(theme);
  useSpaceTimeTracker();
  useWelcomeBack();
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

  // The store only knows after the load, so this catches the real first run.
  useEffect(() => {
    if (needsOnboarding) setOnboarding(true);
  }, [needsOnboarding]);

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
      <Rail onOpenInsights={() => setShowInsights(true)} />
      <FocusSessionBar />
      <AmbienceEngineHost />
      <DockBackdrop />
      <SoundPanel />
      <ThemePicker />
      <QuickAdd />
      <Launcher />
      <ShortcutSheet />
      <Dock />
      <UndoToast />
      <NoticeToast />
      <HiddenAppsToast />
      <FirstSteps />
      {showInsights && <FocusInsights onClose={() => setShowInsights(false)} />}
      {onboarding && <Onboarding onDone={() => setOnboarding(false)} />}
    </div>
  );
};
