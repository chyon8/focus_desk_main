import React from 'react';
import { X } from 'lucide-react';
import { ranked, useSiteVisitStore } from '../stores/siteVisitStore';
import { useWebAppStore } from '../stores/webappStore';
import { WebAppMark } from '../webapps/WebAppMark';
import { hostOf } from './browserAddress';

/** Enough tiles to cover a day's sites without becoming a directory. */
const MAX_TILES = 12;

/**
 * What a browser widget shows before it has been anywhere (D-075).
 *
 * It used to open on `example.com` — a placeholder nobody wants to read, and one
 * that made every new widget a chore. This offers the two things that are
 * actually worth one click: the web apps the user saved, and the sites they
 * keep going back to.
 */
export const BrowserStartPage: React.FC<{ onOpen: (url: string) => void }> = ({ onOpen }) => {
  const webApps = useWebAppStore((s) => s.apps);
  const sites = useSiteVisitStore((s) => s.sites);

  const saved = Object.values(webApps).sort((a, b) => a.name.localeCompare(b.name));
  // A saved web app already has a tile of its own; listing its host again under
  // "often" would be the same thing twice.
  const savedHosts = new Set(saved.map((app) => hostOf(app.url)));
  const often = ranked(sites)
    .filter((site) => !savedHosts.has(site.host))
    .slice(0, MAX_TILES);

  const empty = saved.length === 0 && often.length === 0;

  return (
    <div className="t-ink h-full w-full overflow-y-auto p-6">
      {empty ? (
        <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center">
          <span className="t-soft text-sm">Type an address or a search above.</span>
          <span className="t-faint text-xs max-w-[34ch]">
            Sites you visit show up here, and so do the web apps you save.
          </span>
        </div>
      ) : (
        <>
          {saved.length > 0 && (
            <Section title="Your web apps">
              {saved.map((app) => (
                <Tile key={app.id} label={app.name} onOpen={() => onOpen(app.url)}>
                  <WebAppMark icon={app.icon} name={app.name} size={28} />
                </Tile>
              ))}
            </Section>
          )}

          {often.length > 0 && (
            <Section title="Often">
              {often.map((site) => (
                <Tile
                  key={site.host}
                  label={site.host}
                  onOpen={() => onOpen(site.url)}
                  onForget={() => useSiteVisitStore.getState().forget(site.host)}
                >
                  <span className="glass t-ink w-7 h-7 rounded-[22%] flex items-center justify-center text-sm uppercase">
                    {site.host[0]}
                  </span>
                </Tile>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-5">
    <div className="t-faint mb-2 text-[10px] font-bold uppercase tracking-widest">{title}</div>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">{children}</div>
  </div>
);

const Tile: React.FC<{
  label: string;
  onOpen: () => void;
  /** Only the visited sites can be dropped; a saved web app is managed in its widget. */
  onForget?: () => void;
  children: React.ReactNode;
}> = ({ label, onOpen, onForget, children }) => (
  <div className="relative group">
    <button
      onClick={onOpen}
      title={label}
      className="row w-full flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl active:scale-95"
    >
      {children}
      <span className="text-[10px] leading-none truncate max-w-full">{label}</span>
    </button>
    {onForget && (
      <button
        onClick={onForget}
        title={`Forget ${label}`}
        className="t-faint hover:!text-red-300 absolute top-1 right-1 opacity-0 group-hover:opacity-100"
      >
        <X size={10} />
      </button>
    )}
  </div>
);
