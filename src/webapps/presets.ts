import type { WebAppIcon } from '../spaces/types';

export interface WebAppPreset {
  name: string;
  url: string;
  icon: WebAppIcon;
}

/**
 * The web apps offered before the user has saved any of their own (D-073).
 *
 * A short list on purpose: it is a starting point, not a directory. What makes
 * the feature worth having is the custom entry — a Notion page, a company tool,
 * one particular Figma file — and a long list of things nobody asked for would
 * bury the button that adds those.
 */
export const WEB_APP_PRESETS: WebAppPreset[] = [
  { name: 'Figma', url: 'https://www.figma.com/files', icon: { kind: 'emoji', char: '🎨' } },
  { name: 'YouTube Music', url: 'https://music.youtube.com', icon: { kind: 'emoji', char: '🎧' } },
  { name: 'Notion', url: 'https://www.notion.so', icon: { kind: 'emoji', char: '📄' } },
  { name: 'Gmail', url: 'https://mail.google.com', icon: { kind: 'emoji', char: '✉️' } },
  { name: 'Google Calendar', url: 'https://calendar.google.com', icon: { kind: 'emoji', char: '📅' } },
  { name: 'Google Drive', url: 'https://drive.google.com', icon: { kind: 'emoji', char: '🗂️' } },
  { name: 'Slack', url: 'https://app.slack.com/client', icon: { kind: 'emoji', char: '💬' } },
  { name: 'Linear', url: 'https://linear.app', icon: { kind: 'emoji', char: '📐' } },
  { name: 'ChatGPT', url: 'https://chatgpt.com', icon: { kind: 'emoji', char: '🤖' } },
  { name: 'Claude', url: 'https://claude.ai', icon: { kind: 'emoji', char: '✳️' } },
  { name: 'GitHub', url: 'https://github.com', icon: { kind: 'emoji', char: '🐙' } },
  { name: 'Spotify', url: 'https://open.spotify.com', icon: { kind: 'emoji', char: '🎵' } },
];

/** Emoji offered in the icon picker. Enough to tell a dozen tiles apart. */
export const ICON_EMOJI = [
  '🎨', '🎧', '📄', '✉️', '📅', '🗂️', '💬', '📐',
  '🤖', '🐙', '🎵', '📊', '📝', '🔎', '🧠', '⚡',
  '📌', '🧩', '🛠️', '💡', '📚', '🗺️', '🎬', '💼',
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
