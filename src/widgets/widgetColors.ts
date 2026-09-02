/**
 * The colours a widget can be marked with.
 *
 * A colour here means "these belong together", not decoration: with twenty
 * widgets standing in a space, which ones are one job is otherwise only
 * remembered by where they are. So the set is small and fixed — a free colour
 * picker makes every mark a decision, and the results stop matching each other
 * across spaces.
 *
 * Every one sits at about the same lightness and the same distance off grey, so
 * eight marks read as one family instead of a bag of loose colours — the earlier
 * set mixed a bright red with a flat slate and looked like a mistake. They are
 * kept off full saturation on purpose: the widgets are glass with a photograph
 * behind them, and a pure hue on top of that reads as a sticker.
 *
 * Stored as the key, not the value, so a theme can repaint them later.
 */
export const WIDGET_COLORS = {
  clay: '#c96f5e',
  amber: '#c99154',
  olive: '#9aa257',
  moss: '#63a173',
  teal: '#4d9c9c',
  denim: '#5f8ec4',
  iris: '#8480c4',
  plum: '#b06f9c',
} as const;

export type WidgetColor = keyof typeof WIDGET_COLORS;

export const WIDGET_COLOR_NAMES = Object.keys(WIDGET_COLORS) as WidgetColor[];

/** The colour to paint a widget in, or null for the ones left unmarked. */
export function colorOf(color: string | undefined): string | null {
  if (!color) return null;
  return WIDGET_COLORS[color as WidgetColor] ?? null;
}
