import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrefsStore } from '../stores/prefsStore';
import { useUiStore } from '../stores/uiStore';
import { FolderOpen, Download, Upload, AppWindow, X } from 'lucide-react';

/**
 * The app's own settings, as opposed to how anything looks — brightness lives
 * in ThemePicker, where a user goes when something is too bright.
 *
 * Backups are the reason this panel exists: there is no account and no server,
 * so a copy of the folder is the only thing between the user and a lost disk
 * (D-094).
 */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="t-soft text-[10px] font-semibold uppercase tracking-[0.14em] mb-2">{children}</div>
);

const Row: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="row flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[12px]"
  >
    {icon}
    <span className="t-ink">{label}</span>
  </button>
);

export const SettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const attachApps = usePrefsStore((s) => s.attachApps);
  const [accessibility, setAccessibility] = useState(true);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    void window.backup?.status().then((s) => setLastBackup(s.last));
  }, []);

  // Only worth reading while the switch is on: with it off no window is moved,
  // so whether macOS would allow it says nothing the user needs.
  useEffect(() => {
    if (attachApps) void window.apps?.permissions().then((p) => setAccessibility(p.accessibility));
  }, [attachApps]);

  const toggleAttachApps = () => {
    // Turning it off gives every placed window its own size and place back;
    // closing an app widget is what releases its window.
    if (attachApps) useUiStore.getState().closeAllApps();
    usePrefsStore.getState().setAttachApps(!attachApps);
  };

  const exportTo = async () => {
    const dest = await window.backup?.export();
    if (dest) setNote(`Copied to ${dest.split('/').pop()}`);
  };

  const importFrom = async () => {
    const result = await window.backup?.import();
    if (!result) return;
    if ('error' in result) {
      setNote(result.error);
      return;
    }
    setNote(
      result.spaces === 0 && result.images === 0
        ? 'Nothing new — this profile already has all of it.'
        : `Added ${result.spaces} space${result.spaces === 1 ? '' : 's'}.`
    );
    // The stores read their files once, when the window loads.
    if (result.spaces > 0 || result.images > 0) setImported(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-[98]" onPointerDown={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="glass-panel fixed bottom-24 left-4 z-[99] w-[21rem] max-h-[70vh] overflow-y-auto p-4 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="t-soft text-[11px] font-semibold uppercase tracking-widest">
            Settings
          </span>
          <button onClick={onClose} className="t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>

        <Label>Apps</Label>
        <button
          onClick={toggleAttachApps}
          className={`chrome-button w-full h-9 flex items-center justify-center gap-1.5 mb-2 rounded-lg text-[11px] ${
            attachApps ? 'chrome-button-on' : ''
          }`}
        >
          <AppWindow size={13} />
          Sit app windows in the space
        </button>
        <p className="t-faint mb-2 px-0.5 text-[10px] leading-snug">
          On, an app widget brings the real window to its slot and holds the other applications
          out of the way, which macOS asks you to allow. Off, it is a tile that opens the app.
        </p>
        {attachApps && !accessibility && (
          <button
            onClick={() => void window.apps?.showAccessibilitySettings()}
            className="chrome-button w-full py-1.5 mb-5 rounded-lg text-[11px]"
          >
            Allow Focus Desk to move windows…
          </button>
        )}
        {(!attachApps || accessibility) && <div className="mb-5" />}

        <Label>Data</Label>
        <p className="t-faint mb-2 px-0.5 text-[10px] leading-snug">
          Everything is on this mac only. A backup is a plain folder — spaces, pictures and
          settings. Sign-ins are not in it.
        </p>
        <div className="space-y-0.5 mb-2">
          <Row
            icon={<FolderOpen size={14} className="t-soft" />}
            label="Open data folder"
            onClick={() => void window.backup?.openFolder()}
          />
          <Row
            icon={<Download size={14} className="t-soft" />}
            label="Export a backup…"
            onClick={() => void exportTo()}
          />
          <Row
            icon={<Upload size={14} className="t-soft" />}
            label="Import from a backup…"
            onClick={() => void importFrom()}
          />
        </div>
        <p className="t-faint mb-1.5 px-2.5 text-[10px]">
          {lastBackup ? `Last automatic copy: ${lastBackup}` : 'No automatic copy yet.'}
        </p>
        {note && <p className="t-soft mb-2 px-2.5 text-[10px] leading-snug">{note}</p>}
        {imported && (
          <button
            onClick={() => void window.backup?.reload()}
            className="chrome-button-on w-full py-1.5 rounded-lg text-[11px] font-medium"
          >
            Show them
          </button>
        )}
      </motion.div>
    </>
  );
};
