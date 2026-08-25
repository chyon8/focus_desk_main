import React, { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import type { WebAppIcon } from '../spaces/types';
import type { WebApp } from '../stores/webappStore';
import { isComposing } from '../app/ime';
import { ICON_EMOJI, hostOf, normalizeUrl } from './presets';

/**
 * Making or changing a saved web app: an address, a name, an icon.
 *
 * Only the address is really asked for. A name left blank becomes the host,
 * which is what the user would have typed anyway, and an icon left unchosen
 * arrives on its own the first time the page loads.
 */
export const WebAppForm: React.FC<{
  draft: WebApp;
  onSave: (app: WebApp) => void;
  onCancel: () => void;
  /** Absent for a web app that has not been saved yet — cancelling is the way out. */
  onDelete?: () => void;
}> = ({ draft, onSave, onCancel, onDelete }) => {
  const [name, setName] = useState(draft.name);
  const [url, setUrl] = useState(draft.url);
  const [icon, setIcon] = useState<WebAppIcon | null>(draft.icon);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const address = normalizeUrl(url);
  const finalName = name.trim() || (address ? hostOf(address) : '');
  const valid = !!address && !!finalName;

  const save = () => {
    if (!valid) return;
    onSave({ ...draft, name: finalName, url: address, icon });
  };

  return (
    <div className="t-ink h-full w-full flex flex-col p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="t-soft text-xs font-semibold uppercase tracking-widest">
          {onDelete ? 'Edit web app' : 'New web app'}
        </span>
        <button onClick={onCancel} className="t-faint hover:t-ink ml-auto">
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-3">
        <label className="block">
          <span className="t-faint block text-[10px] uppercase tracking-widest mb-1">Address</span>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isComposing(e) && save()}
            placeholder="figma.com/files"
            className="field border-hair w-full !bg-transparent border-b text-sm pb-1 outline-none"
          />
        </label>

        <label className="block">
          <span className="t-faint block text-[10px] uppercase tracking-widest mb-1">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isComposing(e) && save()}
            placeholder={address ? hostOf(address) : 'Figma'}
            className="field border-hair w-full !bg-transparent border-b text-sm pb-1 outline-none"
          />
        </label>

        <div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="t-faint text-[10px] uppercase tracking-widest">Icon</span>
            {!icon && <span className="t-faint text-[10px]">the site’s own, once it loads</span>}
            {icon && (
              <button
                onClick={() => setIcon(null)}
                className="t-faint hover:t-ink ml-auto text-[10px]"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {ICON_EMOJI.map((char) => {
              const on = icon?.kind === 'emoji' && icon.char === char;
              return (
                <button
                  key={char}
                  onClick={() => setIcon({ kind: 'emoji', char })}
                  className={`flex items-center justify-center h-7 rounded-md text-base ${
                    on ? 'chrome-button-on' : 'row'
                  }`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {confirmingDelete ? (
        <div className="glass border-hair shrink-0 mt-3 p-2.5 rounded-xl border">
          <p className="t-ink text-[11px] leading-snug mb-2">
            Remove “{draft.name}” from your web apps? Widgets already standing for it keep working.
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setConfirmingDelete(false)}
              className="row flex-1 py-1 rounded-md text-[11px]"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="chrome-button flex-1 py-1 rounded-md text-[11px] font-medium hover:!text-red-300"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 mt-3 flex items-center gap-1.5">
          {onDelete && (
            <button
              onClick={() => setConfirmingDelete(true)}
              title="Remove from your web apps"
              className="row px-2 py-1.5 rounded-lg hover:!text-red-300"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button onClick={onCancel} className="row flex-1 py-1.5 rounded-lg text-xs">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!valid}
            className="chrome-button-on flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
          >
            <Check size={12} />
            Save
          </button>
        </div>
      )}
    </div>
  );
};
