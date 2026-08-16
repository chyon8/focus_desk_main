import { useEffect } from 'react';
import { WidgetType } from '../types';

interface KeyboardShortcutsProps {
  activeWidgetId: string | null;
  widgets: any[];
  onAddWidget: (type: WidgetType) => void;
  onCloseActiveWidget: () => void;
  onToggleMaximize: () => void;
  onFocusWidget: (index: number) => void;
  onToggleFocusMode: () => void;
  onClearFocus: () => void;
  onToggleCheatsheet: () => void;
  onArrangeGrid: () => void;
  isFocusMode: boolean;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  activeWidgetId,
  widgets,
  onAddWidget,
  onCloseActiveWidget,
  onToggleMaximize,
  onFocusWidget,
  onToggleFocusMode,
  onClearFocus,
  onToggleCheatsheet,
  onArrangeGrid,
  isFocusMode
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // ? key: Toggle cheatsheet
      if (e.key === '?' && !cmdOrCtrl) {
        e.preventDefault();
        onToggleCheatsheet();
        return;
      }

      // Cmd/Ctrl + K: Open widget add menu (show control bar if needed)
      if (cmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        // This will be handled by showing a widget selection menu
        // For now, we'll just add a TODO widget as an example
        console.log('Cmd+K: Open widget menu');
        // You can implement a custom menu here or just add default widget
        return;
      }

      // Cmd/Ctrl + 1-9: Focus widget by index
      if (cmdOrCtrl && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        onFocusWidget(index);
        return;
      }

      // Cmd/Ctrl + W: Close active widget
      if (cmdOrCtrl && e.key === 'w' && activeWidgetId) {
        e.preventDefault();
        onCloseActiveWidget();
        return;
      }

      // Cmd/Ctrl + M: Toggle maximize active widget
      if (cmdOrCtrl && e.key === 'm' && activeWidgetId) {
        e.preventDefault();
        onToggleMaximize();
        return;
      }

      // Cmd/Ctrl + G: Auto-arrange in grid
      if (cmdOrCtrl && e.key === 'g') {
        e.preventDefault();
        onArrangeGrid();
        return;
      }

      // Cmd/Ctrl + F: Toggle focus mode
      if (cmdOrCtrl && e.key === 'f') {
        e.preventDefault();
        onToggleFocusMode();
        return;
      }

      // Escape: Clear active widget focus
      if (e.key === 'Escape') {
        if (activeWidgetId) {
          e.preventDefault();
          onClearFocus();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeWidgetId,
    widgets,
    onAddWidget,
    onCloseActiveWidget,
    onToggleMaximize,
    onFocusWidget,
    onToggleFocusMode,
    onClearFocus,
    onToggleCheatsheet,
    onArrangeGrid,
    isFocusMode
  ]);

  return null; // This component doesn't render anything
};
