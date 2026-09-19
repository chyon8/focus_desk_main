import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { WebAppIcon } from '../spaces/types';
import type { WebApp } from '../stores/webappStore';
import { isComposing } from '../app/ime';
import { ICON_EMOJI, normalizeUrl } from './presets';
import { hostOf } from '../widgets/browserAddress';

/**
 * Making or changing a saved web app: an address, a name, an icon.
 *
 * Only the address is really asked for. A name left blank becomes the host,
 * which is what the user would have typed anyway, and an icon left unchosen
 * arrives on its own the first time the page loads.
 *
 * Removing is not here (2026-09-19): it belongs to the Manage list, where the
 * row being removed is on screen and the button is the size of a button.
 *
 * The picker draws the column this sits in, so there is no padding or width of
 * its own — `wide` only steps the type up for a panel-sized widget.
 */
export const WebAppForm: React.FC<{
  draft: WebApp;
  wide?: boolean;
  onSave: (app: WebApp) => void;
  onCancel: () => void;
}> = ({ draft, wide = false, onSave, onCancel }) => {
  const [name, setName] = useState(draft.name);
  const [url, setUrl] = useState(draft.url);
  const [icon, setIcon] = useState<WebAppIcon | null>(draft.icon);

  const address = normalizeUrl(url);
  const finalName = name.trim() || (address ? hostOf(address) : '');
  const valid = !!address && !!finalName;

  const size = {
    label: wide ? 'text-ui' : 'text-micro',
    field: wide ? 'text-title' : 'text-body',
    button: wide ? 'py-2 text-body' : 'py-1.5 text-ui',
    cell: wide ? 'h-9' : 'h-7',
  };

  const save = () => {
    if (!valid) return;
    onSave({ ...draft, name: finalName, url: address, icon });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        {/* No close button: Cancel at the foot of the form is the way back, and a
            second ✕ under the widget's own reads as two ways out of the widget. */}
        <span
          className={`t-soft font-semibold uppercase tracking-widest ${
            wide ? 'text-body' : 'text-ui'
          }`}
        >
          {draft.name || draft.url ? 'Edit favorite' : 'New favorite'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-3">
        <label className="block">
          <span className={`t-faint block uppercase tracking-widest mb-1 ${size.label}`}>
            Address
          </span>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isComposing(e) && save()}
            placeholder="figma.com/files"
            className={`field border-hair w-full !bg-transparent border-b pb-1 outline-none ${size.field}`}
          />
        </label>

        <label className="block">
          <span className={`t-faint block uppercase tracking-widest mb-1 ${size.label}`}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isComposing(e) && save()}
            placeholder={address ? hostOf(address) : 'Figma'}
            className={`field border-hair w-full !bg-transparent border-b pb-1 outline-none ${size.field}`}
          />
        </label>

        <div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className={`t-faint uppercase tracking-widest ${size.label}`}>Icon</span>
            {!icon && (
              <span className={`t-faint ${size.label}`}>the site’s own, once it loads</span>
            )}
            {icon && (
              <button
                onClick={() => setIcon(null)}
                className={`t-faint hover:t-ink ml-auto ${size.label}`}
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
                  className={`flex items-center justify-center rounded-control text-title ${
                    size.cell
                  } ${on ? 'chrome-button-on' : 'row'}`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shrink-0 mt-3 flex items-center gap-1.5">
        <button onClick={onCancel} className={`row press flex-1 rounded-control ${size.button}`}>
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!valid}
          className={`chrome-button-on press flex-1 flex items-center justify-center gap-1.5 rounded-control font-medium disabled:opacity-40 ${size.button}`}
        >
          <Check size={wide ? 15 : 12} />
          Save
        </button>
      </div>
    </div>
  );
};
