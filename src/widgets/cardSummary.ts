import { hostOf } from './browserAddress';
import { WIDGET_DEFS } from './defs';
import type {
  BookmarksData,
  BrowserData,
  ColumnData,
  MemoData,
  TodoData,
  WebAppData,
  WidgetDoc,
} from '../spaces/types';

/**
 * What a widget looks like as a row in a column: a picture or an icon, a name,
 * and a line under it. Every type answers the same three things, so a column is
 * one list rather than a stack of unrelated widgets.
 */
export interface CardSummary {
  /** The page's own preview picture, when it has one. */
  image?: string;
  /** The site's icon, shown beside the name — and on its own when there is no picture. */
  icon?: string;
  title: string;
  /** The address line a link preview carries above its title. */
  subtitle: string;
  /** What the page says about itself, when it says anything. */
  body?: string;
  /** `r, g, b` from the icon, for a card with no picture to tint itself with. */
  tint?: string;
}

/** The first line of a note, with its markup taken off. */
function firstLine(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 120);
}

export function cardSummary(widget: WidgetDoc): CardSummary {
  const label = WIDGET_DEFS[widget.type].label;

  switch (widget.type) {
    case 'browser': {
      const data = widget.data as unknown as BrowserData;
      return {
        image: data.thumbnail || undefined,
        icon: data.favicon,
        title: data.title || hostOf(data.url) || 'Untitled',
        subtitle: hostOf(data.url),
        body: data.description || undefined,
        tint: data.faviconColor,
      };
    }
    case 'webapp': {
      const data = widget.data as unknown as WebAppData;
      return {
        icon: data.icon?.kind === 'image' ? data.icon.src : undefined,
        title: data.name || hostOf(data.url) || label,
        subtitle: hostOf(data.url),
      };
    }
    case 'memo': {
      const body = firstLine((widget.data as unknown as MemoData).content ?? '');
      return { title: body.split(' ').slice(0, 8).join(' ') || 'Empty note', subtitle: body || label };
    }
    case 'todo': {
      const items = (widget.data as unknown as TodoData).items ?? [];
      const left = items.filter((item) => !item.done).length;
      return {
        title: items[0]?.text || 'Empty list',
        subtitle: `${left} left of ${items.length}`,
      };
    }
    case 'bookmarks': {
      const items = (widget.data as unknown as BookmarksData).items ?? [];
      return { title: label, subtitle: `${items.length} links` };
    }
    case 'column': {
      const data = widget.data as unknown as ColumnData;
      return { title: data.title || label, subtitle: `${data.children.length} cards` };
    }
    default:
      return { title: label, subtitle: '' };
  }
}
