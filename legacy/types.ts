

export type WidgetType = 'MEMO' | 'TODO' | 'TIMER' | 'BOOKMARKS' | 'EDITOR' | 'BROWSER' | 'CANVAS' | 'READER' | 'PHOTO' | 'NEW_MEMO' | 'NEW_EDITOR' | 'CALENDAR' | 'CLOCK' | 'KANBAN' | 'YOUTUBE_MUSIC';

export interface WidgetPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface BaseWidget {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
  zIndex: number;
}

export interface MemoWidgetData extends BaseWidget {
  type: 'MEMO';
  content: string;
}

export interface NewMemoWidgetData extends BaseWidget {
  type: 'NEW_MEMO';
  content: string;
  theme?: 'LIGHT' | 'DARK';
}

export interface EditorWidgetData extends BaseWidget {
  type: 'EDITOR';
  title: string;
  content: string;
}

export interface NewEditorWidgetData extends BaseWidget {
  type: 'NEW_EDITOR';
  title: string;
  content: string;
  theme?: 'LIGHT' | 'DARK';
}

export interface CalendarWidgetData extends BaseWidget {
  type: 'CALENDAR';
  theme?: 'LIGHT' | 'DARK';
}

export interface ClockWidgetData extends BaseWidget {
  type: 'CLOCK';
  theme?: 'LIGHT' | 'DARK';
  timezone?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoWidgetData extends BaseWidget {
  type: 'TODO';
  items: TodoItem[];
  theme?: 'LIGHT' | 'DARK';
  // Focus Mode State
  activeTaskId?: string | null;
  timerDuration?: number; 
  timerElapsed?: number; // Stopwatch mode
  isTimerRunning?: boolean;
}

export interface KanbanItem {
  id: string;
  content: string;
}

export interface KanbanWidgetData extends BaseWidget {
  type: 'KANBAN';
  columns: {
    todo: KanbanItem[];
    doing: KanbanItem[];
    done: KanbanItem[];
  };
  theme?: 'LIGHT' | 'DARK';
}

export interface TimerWidgetData extends BaseWidget {
  type: 'TIMER';
  duration: number; // in seconds (initial setting)
  timeLeft: number; // current state
  isRunning: boolean;
  mode: 'FOCUS' | 'BREAK';
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export interface BookmarksWidgetData extends BaseWidget {
  type: 'BOOKMARKS';
  items: Bookmark[];
}

export interface BrowserWidgetData extends BaseWidget {
  type: 'BROWSER';
  url: string;
}

export interface ReaderWidgetData extends BaseWidget {
  type: 'READER';
  url: string;
  content: string; // Extracted Markdown/Text content
  pdfUrl?: string; // Local PDF Blob URL
  isLoading?: boolean;
}

// Canvas (Easel) Types
export type CanvasTool = 'SELECT' | 'PEN' | 'RECT' | 'CIRCLE' | 'TEXT' | 'IMAGE';

export interface CanvasElement {
  id: string;
  type: CanvasTool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  stroke?: string; // Color
  fill?: string;
  strokeWidth?: number;
  points?: { x: number, y: number }[]; // For pen paths
  content?: string; // For text or image URL
}

export interface CanvasWidgetData extends BaseWidget {
  type: 'CANVAS';
  title: string;
  elements: CanvasElement[];
}

export interface PhotoWidgetData extends BaseWidget {
  type: 'PHOTO';
  url: string;
  caption: string;
  style: 'POLAROID' | 'STICKER';
  frameColor?: string;
}

export interface YoutubeMusicWidgetData extends BaseWidget {
  type: 'YOUTUBE_MUSIC';
}

export type Widget = MemoWidgetData | TodoWidgetData | TimerWidgetData | BookmarksWidgetData | EditorWidgetData | BrowserWidgetData | CanvasWidgetData | ReaderWidgetData | PhotoWidgetData | NewMemoWidgetData | NewEditorWidgetData | CalendarWidgetData | ClockWidgetData | KanbanWidgetData | YoutubeMusicWidgetData;

export interface AmbienceSettings {
  volumeRain: number;
  volumeFire: number;
  volumeCafe: number;
}

export interface Space {
  id: string;
  name: string;
  backgroundUrl: string;
  backgroundType: 'IMAGE' | 'VIDEO' | 'COLOR';
  widgets: Widget[];
  ambience: AmbienceSettings;
  theme: 'LOFI' | 'REALISTIC';
}

export interface FocusSessionState {
  isActive: boolean;
  isPaused: boolean;
  mode: 'FOCUS' | 'BREAK';
  elapsedTime: number; // Count up in seconds (Focus time)
  breakTime: number;   // Count up in seconds (Break time)
  activeTaskName?: string; // Currently focused task name
  activeWidgetId?: string; // ID of the widget that started the session
}

// App Session Timer - tracks time spent in the app
export interface AppSessionState {
  isTracking: boolean;       // Currently tracking time
  sessionStartTime: number;  // Timestamp when session started (ms)
  accumulatedTime: number;   // Accumulated seconds from pauses
}

export interface RadioStation {
    id: string;
    name: string;
    freq: string;
    url: string;
    color: string;
}

export interface RadioState {
    isPlaying: boolean;
    activeStationId: string;
    customUrl: string;
    isCustomPlaying: boolean;
    volume: number;
}

// Analytics Types
export interface DayStats {
    date: string; // YYYY-MM-DD
    focusSeconds: number;
    tasksCompleted: number;
    appSessionSeconds: number; // Total time spent in the app
}

export interface FocusStats {
    [date: string]: DayStats;
}

export const RADIO_STATIONS: RadioStation[] = [
    {
        id: 'lofi',
        name: 'Lofi Beats',
        freq: '88.5 FM',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112762.mp3',
        color: 'bg-indigo-500'
    },
    {
        id: 'piano',
        name: 'Piano Focus',
        freq: '92.1 FM',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=piano-moment-11142.mp3',
        color: 'bg-slate-500'
    },
    {
        id: 'ambient',
        name: 'Deep Space',
        freq: '104.3 FM',
        url: 'https://cdn.pixabay.com/download/audio/2023/04/26/audio_f553245452.mp3?filename=deep-ambient-147320.mp3',
        color: 'bg-purple-600'
    },
    {
        id: 'nature',
        name: 'Forest Sounds',
        freq: '98.9 FM',
        url: 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_67bcf729cb.mp3?filename=forest-lullaby-110624.mp3',
        color: 'bg-emerald-600'
    }
];

// Restored original backgrounds as requested, merged into a single list
export const DEFAULT_BACKGROUNDS = [
    '/wallpapers/lofi_cat.jpeg',
    '/wallpapers/lofi_fireplace.jpeg',
    '/wallpapers/sunset_landscape.png',
    'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=2070&auto=format&fit=crop', // Cozy Room
    'https://images.unsplash.com/photo-1518558997970-4dadc13c87e6?q=80&w=2070&auto=format&fit=crop', // Night City
    'https://images.unsplash.com/photo-1629196911514-cfd8d628b26e?q=80&w=2148&auto=format&fit=crop', // Illustration style
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948&auto=format&fit=crop', // Nature
    'https://images.unsplash.com/photo-1515266591878-5a89fb196856?q=80&w=1974&auto=format&fit=crop', // Rain Glass
    'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?q=80&w=1965&auto=format&fit=crop' // Cafe
];