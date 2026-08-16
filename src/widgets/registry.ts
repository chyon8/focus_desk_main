import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  Clock,
  Globe,
  KanbanSquare,
  Image,
  Link2,
  PenLine,
  StickyNote,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { WidgetType } from '../spaces/types';
import { WIDGET_DEFS, WidgetDef } from './defs';
import { TodoWidget } from './TodoWidget';
import { MemoWidget } from './MemoWidget';
import { TimerWidget } from './TimerWidget';
import { ClockWidget } from './ClockWidget';
import { KanbanWidget } from './KanbanWidget';
import { BrowserWidget } from './BrowserWidget';
import { CalendarWidget } from './CalendarWidget';
import { BookmarksWidget } from './BookmarksWidget';
import { PhotoWidget } from './PhotoWidget';
import { CanvasWidget } from './CanvasWidget';

export interface WidgetEntry extends WidgetDef {
  icon: LucideIcon;
  Component: React.FC<{ id: string }>;
}

const PARTS: Record<WidgetType, { icon: LucideIcon; Component: React.FC<{ id: string }> }> = {
  todo: { icon: CheckSquare, Component: TodoWidget },
  memo: { icon: StickyNote, Component: MemoWidget },
  timer: { icon: Timer, Component: TimerWidget },
  clock: { icon: Clock, Component: ClockWidget },
  kanban: { icon: KanbanSquare, Component: KanbanWidget },
  browser: { icon: Globe, Component: BrowserWidget },
  calendar: { icon: CalendarDays, Component: CalendarWidget },
  bookmarks: { icon: Link2, Component: BookmarksWidget },
  photo: { icon: Image, Component: PhotoWidget },
  sketch: { icon: PenLine, Component: CanvasWidget },
};

export const WIDGET_REGISTRY = Object.fromEntries(
  (Object.keys(WIDGET_DEFS) as WidgetType[]).map((type) => [
    type,
    { ...WIDGET_DEFS[type], ...PARTS[type] },
  ])
) as Record<WidgetType, WidgetEntry>;

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY) as WidgetType[];
