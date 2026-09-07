import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrefsStore } from '../stores/prefsStore';
import { useUiStore } from '../stores/uiStore';
import { AppWindow, Chrome, Download, FolderOpen, KeyRound, Moon, Sun, Upload, X } from 'lucide-react';

/**
 * The app's own settings.
 *
 * 종이·웹페이지 밝기가 여기 있는 이유: 둘 다 앱 전체에 걸리고, 공간 하나의 외양이
 * 아니다. Atmosphere 패널에 두었더니 그 패널 안에 밝기 컨트롤이 셋이 되어(종이 /
 * 웹페이지 / 배경) 무엇이 무엇을 바꾸는지 알 수 없었다.
 *
 * Backups are the reason this panel exists: there is no account and no server,
 * so a copy of the folder is the only thing between the user and a lost disk
 * (D-094).
 */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="t-soft text-micro font-semibold uppercase tracking-[0.14em] mb-2">{children}</div>
);

const Row: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="row flex items-center gap-3 w-full px-3 py-2 rounded-control text-ui"
  >
    {icon}
    <span className="t-ink">{label}</span>
  </button>
);

export const SettingsPanel: React.FC<{
  onClose: () => void;
  /** Bring in the windows open in Chrome. */
  onOpenImport: () => void;
  /** What this space is signed in to. */
  onOpenSessions: () => void;
}> = ({ onClose, onOpenImport, onOpenSessions }) => {
  const attachApps = usePrefsStore((s) => s.attachApps);
  const paper = usePrefsStore((s) => s.paper);
  const webDark = usePrefsStore((s) => s.webDark);
  const [accessibility, setAccessibility] = useState(true);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  // 실패한 것에는 다시 해볼 길을 같이 준다 (DESIGN.md 6장). 성공한 것은 retry가
  // 없어서 그냥 한 줄로 남는다.
  const [note, setNote] = useState<{ text: string; retry?: () => void } | null>(null);
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

  // 쓰기가 도중에 죽으면(디스크가 찼다·권한이 없다) invoke가 reject한다. 잡지
  // 않으면 아무 일도 안 일어난 것처럼 보인다 — 백업이 이 패널의 존재 이유다.
  const exportTo = async () => {
    setNote(null);
    try {
      const dest = await window.backup?.export();
      if (dest) setNote({ text: `Copied to ${dest.split('/').pop()}` });
    } catch {
      setNote({ text: 'Backup failed. Nothing was written.', retry: () => void exportTo() });
    }
  };

  const importFrom = async () => {
    setNote(null);
    let result: Awaited<ReturnType<NonNullable<typeof window.backup>['import']>> | undefined;
    try {
      result = await window.backup?.import();
    } catch {
      setNote({ text: 'The backup could not be read.', retry: () => void importFrom() });
      return;
    }
    if (!result) return;
    if ('error' in result) {
      setNote({ text: result.error, retry: () => void importFrom() });
      return;
    }
    setNote({
      text:
        result.spaces === 0 && result.images === 0
          ? 'Nothing new. This profile already has all of it.'
          : `Added ${result.spaces} space${result.spaces === 1 ? '' : 's'}.`,
    });
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
        className="glass-panel fixed bottom-4 left-[88px] z-[99] w-[21rem] max-h-[70vh] overflow-y-auto p-4 rounded-surface"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="t-soft text-meta font-semibold uppercase tracking-widest">
            Settings
          </span>
          <button onClick={onClose} className="t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>

        <Label>This space</Label>
        <Row icon={<Chrome size={14} />} label="Bring in what Chrome has open" onClick={onOpenImport} />
        <Row icon={<KeyRound size={14} />} label="What this space is signed in to" onClick={onOpenSessions} />
        <div className="mb-6" />

        <Label>Notes and pages</Label>
        <div className="t-faint mb-1.5 text-micro font-medium">Note paper</div>
        <div className="flex items-center gap-1 mb-2">
          {(
            [
              { mode: 'theme', label: 'Match the room', icon: Moon },
              { mode: 'light', label: 'Always white', icon: Sun },
            ] as const
          ).map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => usePrefsStore.getState().setPaper(mode)}
              className={`chrome-button flex-1 h-9 flex items-center justify-center gap-1.5 rounded-control text-meta ${
                paper === mode ? 'chrome-button-on' : ''
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <p className="t-faint mb-4 px-0.5 text-micro leading-snug">
          Notes, photos and sketches are printed sheets, so they can keep white paper whatever the
          room is doing. This changes those three widgets only.
        </p>

        <button
          onClick={() => usePrefsStore.getState().setWebDark(!webDark)}
          className={`chrome-button w-full h-9 flex items-center justify-center gap-1.5 mb-2 rounded-control text-meta ${
            webDark ? 'chrome-button-on' : ''
          }`}
        >
          <Moon size={13} />
          Ask sites for their dark theme
        </button>
        <p className="t-faint mb-6 px-0.5 text-micro leading-snug">
          Sites with a dark theme of their own will use it. Sites without one look the same either
          way. This changes web pages only.
        </p>

        <Label>Apps</Label>
        <button
          onClick={toggleAttachApps}
          className={`chrome-button w-full h-9 flex items-center justify-center gap-1.5 mb-2 rounded-control text-meta ${
            attachApps ? 'chrome-button-on' : ''
          }`}
        >
          <AppWindow size={13} />
          Sit app windows in the space
        </button>
        <p className="t-faint mb-2 px-0.5 text-micro leading-snug">
          On, an app widget brings the real window to its slot and holds the other applications
          out of the way, which macOS asks you to allow. Off, it is a tile that opens the app.
        </p>
        {attachApps && !accessibility && (
          <button
            onClick={() => void window.apps?.showAccessibilitySettings()}
            className="chrome-button w-full py-1.5 mb-6 rounded-control text-meta"
          >
            Allow Focus Desk to move windows…
          </button>
        )}
        {(!attachApps || accessibility) && <div className="mb-6" />}

        <Label>Data</Label>
        <p className="t-faint mb-2 px-0.5 text-micro leading-snug">
          Everything is on this mac only. A backup is a plain folder: spaces, pictures and
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
        <p className="t-faint mb-1.5 px-3 text-micro">
          {lastBackup ? `Last automatic copy: ${lastBackup}` : 'No automatic copy yet.'}
        </p>
        {note &&
          (note.retry ? (
            <div className="mb-2 px-3">
              <p className="text-micro leading-snug" style={{ color: 'var(--danger)' }}>
                {note.text}
              </p>
              <button
                onClick={note.retry}
                className="chrome-button t-accent mt-1 px-2 py-0.5 rounded-control text-micro font-medium"
              >
                Try again
              </button>
            </div>
          ) : (
            <p className="t-soft mb-2 px-3 text-micro leading-snug">{note.text}</p>
          ))}
        {imported && (
          <button
            onClick={() => void window.backup?.reload()}
            className="chrome-button-on w-full py-1.5 rounded-control text-meta font-medium"
          >
            Show them
          </button>
        )}
      </motion.div>
    </>
  );
};
