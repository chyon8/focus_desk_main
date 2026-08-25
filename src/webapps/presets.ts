import type { WebAppIcon } from '../spaces/types';

export type WebAppGroup = 'AI' | 'Video' | 'Design' | 'Work' | 'Chat' | 'Music';

export interface WebAppPreset {
  name: string;
  url: string;
  icon: WebAppIcon;
  group: WebAppGroup;
}

/**
 * The web apps offered before the user has saved any of their own (D-073).
 *
 * Grouped, because the list is long enough that a flat one is hard to read. It
 * is still a starting point and not a directory — what makes the feature worth
 * having is the custom entry, a Notion page or a company tool or one particular
 * Figma file, and the button for that stays at the bottom of the picker.
 *
 * Kept in group order: the picker builds its headings by walking this list.
 */
export const WEB_APP_PRESETS: WebAppPreset[] = [
  { group: 'AI', name: 'ChatGPT', url: 'https://chatgpt.com', icon: { kind: 'emoji', char: '🤖' } },
  { group: 'AI', name: 'Claude', url: 'https://claude.ai', icon: { kind: 'emoji', char: '✳️' } },
  { group: 'AI', name: 'Gemini', url: 'https://gemini.google.com', icon: { kind: 'emoji', char: '🔮' } },
  { group: 'AI', name: 'Perplexity', url: 'https://www.perplexity.ai', icon: { kind: 'emoji', char: '🔎' } },
  { group: 'AI', name: 'NotebookLM', url: 'https://notebooklm.google.com', icon: { kind: 'emoji', char: '🧠' } },
  { group: 'AI', name: 'Midjourney', url: 'https://www.midjourney.com', icon: { kind: 'emoji', char: '🖼️' } },
  { group: 'AI', name: 'Runway', url: 'https://app.runwayml.com', icon: { kind: 'emoji', char: '🎞️' } },

  { group: 'Video', name: 'YouTube', url: 'https://www.youtube.com', icon: { kind: 'emoji', char: '▶️' } },
  { group: 'Video', name: 'YouTube Studio', url: 'https://studio.youtube.com', icon: { kind: 'emoji', char: '🎬' } },
  { group: 'Video', name: 'Vimeo', url: 'https://vimeo.com', icon: { kind: 'emoji', char: '📽️' } },
  { group: 'Video', name: 'Twitch', url: 'https://www.twitch.tv', icon: { kind: 'emoji', char: '🎮' } },
  { group: 'Video', name: 'Frame.io', url: 'https://next.frame.io', icon: { kind: 'emoji', char: '🎥' } },
  { group: 'Video', name: 'CapCut', url: 'https://www.capcut.com/editor', icon: { kind: 'emoji', char: '✂️' } },
  { group: 'Video', name: 'Descript', url: 'https://web.descript.com', icon: { kind: 'emoji', char: '🎙️' } },
  { group: 'Video', name: 'Loom', url: 'https://www.loom.com', icon: { kind: 'emoji', char: '📹' } },

  { group: 'Design', name: 'Figma', url: 'https://www.figma.com/files', icon: { kind: 'emoji', char: '🎨' } },
  { group: 'Design', name: 'Canva', url: 'https://www.canva.com', icon: { kind: 'emoji', char: '🖌️' } },
  { group: 'Design', name: 'Miro', url: 'https://miro.com/app/dashboard', icon: { kind: 'emoji', char: '🧩' } },
  { group: 'Design', name: 'Pinterest', url: 'https://www.pinterest.com', icon: { kind: 'emoji', char: '📌' } },

  { group: 'Work', name: 'Notion', url: 'https://www.notion.so', icon: { kind: 'emoji', char: '📄' } },
  { group: 'Work', name: 'Gmail', url: 'https://mail.google.com', icon: { kind: 'emoji', char: '✉️' } },
  { group: 'Work', name: 'Google Calendar', url: 'https://calendar.google.com', icon: { kind: 'emoji', char: '📅' } },
  { group: 'Work', name: 'Google Drive', url: 'https://drive.google.com', icon: { kind: 'emoji', char: '🗂️' } },
  { group: 'Work', name: 'Google Docs', url: 'https://docs.google.com', icon: { kind: 'emoji', char: '📝' } },
  { group: 'Work', name: 'Google Sheets', url: 'https://sheets.google.com', icon: { kind: 'emoji', char: '📊' } },
  { group: 'Work', name: 'Dropbox', url: 'https://www.dropbox.com/home', icon: { kind: 'emoji', char: '📦' } },
  { group: 'Work', name: 'Linear', url: 'https://linear.app', icon: { kind: 'emoji', char: '📐' } },
  { group: 'Work', name: 'GitHub', url: 'https://github.com', icon: { kind: 'emoji', char: '🐙' } },

  { group: 'Chat', name: 'Slack', url: 'https://app.slack.com/client', icon: { kind: 'emoji', char: '💬' } },
  { group: 'Chat', name: 'Discord', url: 'https://discord.com/app', icon: { kind: 'emoji', char: '🕹️' } },
  { group: 'Chat', name: 'X', url: 'https://x.com', icon: { kind: 'emoji', char: '🐦' } },

  { group: 'Music', name: 'YouTube Music', url: 'https://music.youtube.com', icon: { kind: 'emoji', char: '🎧' } },
  { group: 'Music', name: 'Spotify', url: 'https://open.spotify.com', icon: { kind: 'emoji', char: '🎵' } },
  { group: 'Music', name: 'SoundCloud', url: 'https://soundcloud.com/discover', icon: { kind: 'emoji', char: '🔊' } },
];

/** Emoji offered in the icon picker. Enough to tell a dozen tiles apart. */
export const ICON_EMOJI = [
  '🎨', '🎧', '📄', '✉️', '📅', '🗂️', '💬', '📐',
  '🤖', '🐙', '🎵', '📊', '📝', '🔎', '🧠', '⚡',
  '📌', '🧩', '🛠️', '💡', '📚', '🗺️', '🎬', '💼',
  '▶️', '📹', '🎥', '✂️', '🎙️', '🖼️', '🔮', '🕹️',
];

/** Adds a scheme when the user typed a bare host, as an address bar would. */
export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** The host, for naming a web app the user has not named themselves. */
export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
