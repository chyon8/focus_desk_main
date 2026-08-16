import React, { useState, useEffect, useRef } from 'react';
import { Space, Widget, WidgetType, DEFAULT_BACKGROUNDS, FocusSessionState, RadioState, RADIO_STATIONS, FocusStats, AppSessionState } from './types';
import { BackgroundLayer } from './components/BackgroundLayer';
import { DraggableWidget } from './components/DraggableWidget';
import { Sidebar } from './components/Sidebar';
import { ControlBar } from './components/ControlBar';
import { AmbienceDock } from './components/AmbienceDock';
import { FocusInsights } from './components/FocusInsights';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { ShortcutCheatsheet } from './components/ShortcutCheatsheet';
import { Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';

// Optimized "Fluid" Transition (Slightly faster than before, but still smooth)
const FLUID_TRANSITION: any = {
  duration: 0.8, // Reduced from 1.2s to 0.8s
  ease: [0.2, 0.8, 0.2, 1] // Slightly snappier bezier curve
};

const INITIAL_SPACES: Space[] = [
  {
    id: 'default-1',
    name: 'Morning Focus',
    backgroundUrl: '#1e1e24',
    backgroundType: 'COLOR',
    theme: 'REALISTIC',
    ambience: { volumeRain: 0, volumeFire: 0, volumeCafe: 0 },
    widgets: [
      { 
        id: 'w2', type: 'TODO', zIndex: 2, 
        position: { x: 450, y: 100, width: 320, height: 450 }, 
        theme: 'LIGHT',
        items: [
            { id: 't1', text: 'Check emails', completed: true },
            { id: 't2', text: 'Plan the day', completed: false }
        ] 
      }
    ]
  },
  {
    id: 'default-2',
    name: 'Deep Work',
    backgroundUrl: DEFAULT_BACKGROUNDS[1],
    backgroundType: 'IMAGE',
    theme: 'LOFI',
    ambience: { volumeRain: 50, volumeFire: 20, volumeCafe: 0 },
    widgets: []
  }
];

// Helper to get local YYYY-MM-DD
const getTodayKey = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 10);
    return localISOTime;
};

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES);
  
  const [activeSpaceId, setActiveSpaceId] = useState<string>(INITIAL_SPACES[0].id);

  // Focus Stats Logic
  const [focusStats, setFocusStats] = useState<FocusStats>({});

  // App Session Timer - tracks total time spent in app
  const [appSession, setAppSession] = useState<AppSessionState>({
    isTracking: false,
    sessionStartTime: 0,
    accumulatedTime: 0
  });

  const [showInsights, setShowInsights] = useState(false);

  // Global Focus Session State (Stopwatch Logic)
  const [focusSession, setFocusSession] = useState<FocusSessionState>({
    isActive: false,
    isPaused: false,
    mode: 'FOCUS',
    elapsedTime: 0,
    breakTime: 0,
    activeTaskName: undefined,
    activeWidgetId: undefined
  });

  // Global Radio State
  const [radioState, setRadioState] = useState<RadioState>({
    isPlaying: false,
    activeStationId: 'lofi',
    customUrl: '',
    isCustomPlaying: false,
    volume: 50
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [maximizedWidgetId, setMaximizedWidgetId] = useState<string | null>(null);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      if (window.store) {
        try {
          const savedSpaces = await window.store.get('focus-window-spaces-v13');
          const savedActiveId = await window.store.get('focus-window-active-id-v13');
          const savedStats = await window.store.get('focus-window-stats');

          if (savedSpaces) setSpaces(savedSpaces);
          if (savedActiveId) setActiveSpaceId(savedActiveId);
          if (savedStats) setFocusStats(savedStats);
        } catch (e) {
          console.error("Failed to load from store", e);
        }
      } else {
        // Fallback for browser dev (keep using localStorage if window.store is missing)
        try {
           const savedSpaces = localStorage.getItem('focus-window-spaces-v13');
           const savedActiveId = localStorage.getItem('focus-window-active-id-v13');
           const savedStats = localStorage.getItem('focus-window-stats');
           
           if (savedSpaces) setSpaces(JSON.parse(savedSpaces));
           if (savedActiveId) setActiveSpaceId(savedActiveId);
           if (savedStats) setFocusStats(JSON.parse(savedStats));
        } catch(e) { console.error(e); }
      }
      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (window.store) {
      window.store.set('focus-window-spaces-v13', spaces);
    } else {
      localStorage.setItem('focus-window-spaces-v13', JSON.stringify(spaces));
    }
  }, [spaces, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (window.store) {
      window.store.set('focus-window-active-id-v13', activeSpaceId);
    } else {
      localStorage.setItem('focus-window-active-id-v13', activeSpaceId);
    }
  }, [activeSpaceId, isLoaded]);

  useEffect(() => {
      if (!isLoaded) return;
      if (window.store) {
        window.store.set('focus-window-stats', focusStats);
      } else {
        localStorage.setItem('focus-window-stats', JSON.stringify(focusStats));
      }
  }, [focusStats, isLoaded]);

  // Auto-start app session tracking when app loads
  useEffect(() => {
    if (!isLoaded) return;
    // Start tracking immediately when app loads (only if window is focused)
    setAppSession({
      isTracking: document.hasFocus(),
      sessionStartTime: Date.now(),
      accumulatedTime: 0
    });
  }, [isLoaded]);

  // Pause/Resume session tracking on window focus/blur
  useEffect(() => {
    const handleFocus = () => {
      // Resume tracking: start new session period
      setAppSession(prev => ({
        ...prev,
        isTracking: true,
        sessionStartTime: Date.now()
      }));
    };

    const handleBlur = () => {
      // Pause tracking: save accumulated time
      setAppSession(prev => {
        if (!prev.isTracking) return prev;
        const elapsed = Math.floor((Date.now() - prev.sessionStartTime) / 1000);
        return {
          ...prev,
          isTracking: false,
          accumulatedTime: prev.accumulatedTime + elapsed
        };
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Calculate current session time
  const getCurrentSessionTime = () => {
    if (!appSession.isTracking) return appSession.accumulatedTime;
    const elapsed = Math.floor((Date.now() - appSession.sessionStartTime) / 1000);
    return appSession.accumulatedTime + elapsed;
  };

  // Save session time on app close (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const totalSeconds = getCurrentSessionTime();
      if (totalSeconds > 0) {
        // Synchronously save to storage before app closes
        const today = getTodayKey();
        const statsStr = window.store ? null : localStorage.getItem('focus-window-stats');
        const currentStats: FocusStats = statsStr ? JSON.parse(statsStr) : focusStats;
        const current = currentStats[today] || { focusSeconds: 0, tasksCompleted: 0, appSessionSeconds: 0, date: today };
        const updatedStats = {
          ...currentStats,
          [today]: {
            ...current,
            appSessionSeconds: current.appSessionSeconds + totalSeconds
          }
        };
        if (window.store) {
          window.store.set('focus-window-stats', updatedStats);
        } else {
          localStorage.setItem('focus-window-stats', JSON.stringify(updatedStats));
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [appSession, focusStats]);

  // Periodic save every minute (for crash protection) - saves delta only
  const lastSavedTimeRef = useRef(0);
  useEffect(() => {
    if (!appSession.isTracking && appSession.accumulatedTime === 0) return;
    
    const interval = setInterval(() => {
      const currentTotal = getCurrentSessionTime();
      const delta = currentTotal - lastSavedTimeRef.current;
      if (delta > 0) {
        recordAppSessionTime(delta);
        lastSavedTimeRef.current = currentTotal;
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, [appSession.isTracking]);

  // Real-time session timer display (updates every second)
  const [displaySessionTime, setDisplaySessionTime] = useState(0);
  useEffect(() => {
    const updateDisplay = () => {
      setDisplaySessionTime(getCurrentSessionTime());
    };
    
    updateDisplay(); // Initial update
    const interval = setInterval(updateDisplay, 1000);
    
    return () => clearInterval(interval);
  }, [appSession.isTracking, appSession.sessionStartTime, appSession.accumulatedTime]);

  // Sync Focus Mode with Session
  // REVISED LOGIC: If session is active BUT paused, exit focus mode (show UI).
  // If session is active AND running, enter focus mode (hide UI).
  useEffect(() => {
    if (focusSession.isActive) {
        setIsFocusMode(!focusSession.isPaused);
    } else {
        setIsFocusMode(false);
    }
  }, [focusSession.isActive, focusSession.isPaused]);

  // Global Timer Logic (Count Up for Focus, Count Up for Break)
  useEffect(() => {
    let interval: number;
    if (focusSession.isActive && !focusSession.isPaused) {
        interval = window.setInterval(() => {
            setFocusSession(prev => {
                if (prev.mode === 'BREAK') {
                    return { ...prev, breakTime: prev.breakTime + 1 };
                }
                return { ...prev, elapsedTime: prev.elapsedTime + 1 };
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusSession.isActive, focusSession.isPaused, focusSession.mode]);

  // Global Audio Logic
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = radioState.volume / 100;
    }
  }, [radioState.volume]);

  useEffect(() => {
    if (!audioRef.current) return;

    const playAudio = async () => {
        try {
            if (radioState.isPlaying) {
                let source = '';
                if (radioState.activeStationId === 'custom') {
                    source = radioState.customUrl;
                } else {
                    const station = RADIO_STATIONS.find(s => s.id === radioState.activeStationId);
                    source = station ? station.url : '';
                }

                if (source && audioRef.current && audioRef.current.src !== source) {
                    audioRef.current.src = source;
                    audioRef.current.load();
                }
                
                await audioRef.current?.play();
            } else {
                audioRef.current?.pause();
            }
        } catch (e) {
            console.error("Audio playback error", e);
            setRadioState(prev => ({ ...prev, isPlaying: false }));
        }
    };

    playAudio();
  }, [radioState.isPlaying, radioState.activeStationId, radioState.customUrl]);

  // Radio Controls
  const toggleRadio = () => {
    setRadioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const setRadioVolume = (vol: number) => {
    setRadioState(prev => ({ ...prev, volume: vol }));
  };

  const setStation = (id: string) => {
    if (radioState.activeStationId === id && radioState.isPlaying) {
        setRadioState(prev => ({ ...prev, isPlaying: false }));
    } else {
        setRadioState(prev => ({ ...prev, activeStationId: id, isCustomPlaying: false, isPlaying: true }));
    }
  };

  const nextStation = () => {
      const currentIndex = RADIO_STATIONS.findIndex(s => s.id === radioState.activeStationId);
      const nextIndex = (currentIndex + 1) % RADIO_STATIONS.length;
      setStation(RADIO_STATIONS[nextIndex].id);
  };
  
  const setCustomRadio = (url: string) => {
      if(!url) return;
      setRadioState(prev => ({ ...prev, customUrl: url, activeStationId: 'custom', isCustomPlaying: true, isPlaying: true }));
  };

  const activeSpace = spaces.find(s => s.id === activeSpaceId) || spaces[0];

  const updateActiveSpace = (id: string, updates: Partial<Space>) => {
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addWidget = (type: WidgetType) => {
    const maxZ = Math.max(...activeSpace.widgets.map(w => w.zIndex || 0), 0);

    const newWidget: Widget = {
      id: crypto.randomUUID(),
      type,
      position: { 
        x: window.innerWidth / 2 - 200 + (Math.random() * 40 - 20), 
        y: window.innerHeight / 2 - 200 + (Math.random() * 40 - 20), 
        width: type === 'CANVAS' || type === 'NEW_EDITOR' || type === 'KANBAN' ? 500 : type === 'READER' ? 450 : type === 'BROWSER' ? 600 : type === 'PHOTO' || type === 'CLOCK' ? 250 : type === 'CALENDAR' ? 320 : type === 'YOUTUBE_MUSIC' ? 375 : 350, 
        height: type === 'EDITOR' || type === 'NEW_EDITOR' || type === 'CANVAS' ? 600 : type === 'KANBAN' ? 400 : type === 'READER' ? 480 : type === 'BROWSER' ? 480 : type === 'PHOTO' || type === 'CLOCK' ? 300 : type === 'CALENDAR' ? 340 : type === 'YOUTUBE_MUSIC' ? 667 : 400 
      },
      zIndex: maxZ + 1,
      ...getDefaultWidgetData(type)
    };
    updateActiveSpace(activeSpaceId, { widgets: [...activeSpace.widgets, newWidget] });
  };

  const updateWidget = (widgetId: string, data: any) => {
    const updatedWidgets = activeSpace.widgets.map(w => 
      w.id === widgetId ? { ...w, ...data } : w
    );
    updateActiveSpace(activeSpaceId, { widgets: updatedWidgets });
  };

  const updateWidgetPosition = (widgetId: string, pos: { x: number, y: number, width?: number, height?: number }) => {
     const updatedWidgets = activeSpace.widgets.map(w => 
      w.id === widgetId ? { ...w, position: { ...w.position, ...pos } } : w
    );
    updateActiveSpace(activeSpaceId, { widgets: updatedWidgets });
  };

  const removeWidget = (widgetId: string) => {
    updateActiveSpace(activeSpaceId, { widgets: activeSpace.widgets.filter(w => w.id !== widgetId) });
    if (maximizedWidgetId === widgetId) setMaximizedWidgetId(null);
  };

  const bringToFront = (widgetId: string) => {
    const maxZ = Math.max(...activeSpace.widgets.map(w => w.zIndex || 0), 0);
    updateWidget(widgetId, { zIndex: maxZ + 1 });
    setActiveWidgetId(widgetId); // Set as active when brought to front
  };

  const toggleMaximize = (widgetId: string) => {
    setMaximizedWidgetId(prev => prev === widgetId ? null : widgetId);
  };

  const arrangeWidgets = (cols: number | 'AUTO') => {
    const allWidgets = [...activeSpace.widgets];
    if (allWidgets.length === 0) return;

    // Filter out widgets that should NOT be arranged (Photos stay put)
    const arrangeableWidgets = allWidgets.filter(w => w.type !== 'PHOTO');
    const staticWidgets = allWidgets.filter(w => w.type === 'PHOTO');

    if (arrangeableWidgets.length === 0) return;

    const sidebarWidth = (isSidebarOpen && !isFocusMode) ? 256 : 0;
    const availableWidth = window.innerWidth - sidebarWidth;
    const availableHeight = window.innerHeight;
    const padding = 24;
    const gap = 20;

    let columns = typeof cols === 'number' ? cols : Math.ceil(Math.sqrt(arrangeableWidgets.length));
    if (availableWidth / columns < 300) columns = Math.floor(availableWidth / 300) || 1;

    const widgetWidth = (availableWidth - (padding * 2) - (gap * (columns - 1))) / columns;
    const widgetHeight = Math.max(300, (availableHeight - (padding * 2) - (gap * Math.ceil(arrangeableWidgets.length / columns))) / Math.ceil(arrangeableWidgets.length / columns));

    const repositionedWidgets = arrangeableWidgets.map((w, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      
      return {
        ...w,
        position: {
          x: sidebarWidth + padding + (col * (widgetWidth + gap)),
          y: padding + (row * (widgetHeight + gap)),
          width: widgetWidth,
          height: widgetHeight
        }
      };
    });

    updateActiveSpace(activeSpaceId, { widgets: [...repositionedWidgets, ...staticWidgets] });
  };

  const addSpace = (name: string, theme: 'LOFI' | 'REALISTIC') => {
    const newSpace: Space = {
      id: crypto.randomUUID(),
      name,
      theme,
      backgroundUrl: '#1e1e24',
      backgroundType: 'COLOR',
      ambience: { volumeRain: 0, volumeFire: 0, volumeCafe: 0 },
      widgets: []
    };
    setSpaces([...spaces, newSpace]);
    setActiveSpaceId(newSpace.id);
  };

  const removeSpace = (id: string) => {
    const newSpaces = spaces.filter(s => s.id !== id);
    if (newSpaces.length === 0) return;
    setSpaces(newSpaces);
    if (activeSpaceId === id) setActiveSpaceId(newSpaces[0].id);
  };

  function getDefaultWidgetData(type: WidgetType): any {
    switch (type) {
      case 'MEMO': return { content: '' };
      case 'EDITOR': return { title: '', content: '' };
      case 'NEW_MEMO': return { content: '', theme: 'LIGHT' };
      case 'NEW_EDITOR': return { title: '', content: '', theme: 'LIGHT' };
      case 'CALENDAR': return { theme: 'LIGHT' };
      case 'CLOCK': return { theme: 'LIGHT' };
      case 'TODO': return { items: [], activeTaskId: null, timerElapsed: 0, isTimerRunning: false, theme: 'LIGHT' };
      case 'KANBAN': return { columns: { todo: [], doing: [], done: [] }, theme: 'LIGHT' };
      case 'TIMER': return { duration: 25 * 60, timeLeft: 25 * 60, isRunning: false, mode: 'FOCUS' };
      case 'BOOKMARKS': return { items: [] };
      case 'BROWSER': return { url: '' };
      case 'CANVAS': return { title: 'Untitled Easel', elements: [] };
      case 'READER': return { url: '', content: '', isLoading: false };
      case 'PHOTO': return { url: '', caption: '', style: 'POLAROID', frameColor: '#ffffff' };
      case 'YOUTUBE_MUSIC': return {};
      default: return {};
    }
  }

  // --- STATS LOGIC (UPDATED WITH LOCAL DATES) ---
  const recordFocusTime = (seconds: number) => {
      if (seconds <= 0) return;
      const today = getTodayKey();
      setFocusStats(prev => {
          const current = prev[today] || { focusSeconds: 0, tasksCompleted: 0, appSessionSeconds: 0, date: today };
          return {
              ...prev,
              [today]: {
                  ...current,
                  focusSeconds: current.focusSeconds + seconds
              }
          };
      });
  };

  const recordTaskCompletion = () => {
      const today = getTodayKey();
      setFocusStats(prev => {
          const current = prev[today] || { focusSeconds: 0, tasksCompleted: 0, appSessionSeconds: 0, date: today };
          return {
              ...prev,
              [today]: {
                  ...current,
                  tasksCompleted: current.tasksCompleted + 1
              }
          };
      });
  };

  // Record app session time to stats
  const recordAppSessionTime = (seconds: number) => {
      if (seconds <= 0) return;
      const today = getTodayKey();
      setFocusStats(prev => {
          const current = prev[today] || { focusSeconds: 0, tasksCompleted: 0, appSessionSeconds: 0, date: today };
          return {
              ...prev,
              [today]: {
                  ...current,
                  appSessionSeconds: current.appSessionSeconds + seconds
              }
          };
      });
  };

  const handleStopSession = () => {
    // Record time when stopping
    // IMPORTANT: Capture the latest elapsed time
    // In this scope, focusSession is the one from the render where handleStopSession was created
    // Since App re-renders on timer tick, this should be up-to-date.
    if (focusSession.elapsedTime > 0) {
        recordFocusTime(focusSession.elapsedTime);
    }

    setFocusSession(prev => ({ ...prev, isActive: false, isPaused: false, elapsedTime: 0, breakTime: 0, mode: 'FOCUS', activeTaskName: undefined, activeWidgetId: undefined }));
    setIsFocusMode(false);
  };

  // Called when a user clicks "Play" on a specific Todo Item
  const handleFocusTask = (taskName: string, widgetId: string) => {
    setFocusSession(prev => ({
        ...prev,
        isActive: true,
        isPaused: false,
        activeTaskName: taskName,
        activeWidgetId: widgetId,
        mode: 'FOCUS'
    }));
    // Note: Effect hook handles setting isFocusMode based on this state
  };

  const handleCompleteTask = (widgetId: string, taskId: string) => {
      // 1. Find the widget and mark item complete
      const widget = activeSpace.widgets.find(w => w.id === widgetId);
      if (widget && widget.type === 'TODO') {
          const items = (widget as any).items.map((i: any) => 
            i.id === taskId ? { ...i, completed: true } : i
          );
          updateWidget(widgetId, { items, activeTaskId: null });
      }

      // 2. Record Stat
      recordTaskCompletion();

      // 3. Stop Session (records time internally)
      handleStopSession();
  };

  // Keyboard shortcut handlers
  const handleFocusWidgetByIndex = (index: number) => {
    if (index < activeSpace.widgets.length) {
      const widget = activeSpace.widgets[index];
      setActiveWidgetId(widget.id);
      bringToFront(widget.id);
    }
  };

  const handleCloseActiveWidget = () => {
    if (activeWidgetId) {
      removeWidget(activeWidgetId);
      setActiveWidgetId(null);
    }
  };

  const handleToggleActiveMaximize = () => {
    if (activeWidgetId) {
      toggleMaximize(activeWidgetId);
    }
  };

  const handleArrangeGrid = () => {
    arrangeWidgets('AUTO');
  };



  const handleShareDesk = async () => {
      // Create a temporary watermark element
      const watermark = document.createElement('div');
      watermark.innerText = "Focus Desk";
      watermark.style.position = 'fixed';
      watermark.style.bottom = '20px';
      watermark.style.right = '20px';
      watermark.style.color = 'rgba(255, 255, 255, 0.5)';
      watermark.style.fontSize = '24px';
      watermark.style.fontWeight = 'bold';
      watermark.style.fontFamily = 'sans-serif';
      watermark.style.zIndex = '9999';
      watermark.style.pointerEvents = 'none';
      document.body.appendChild(watermark);

      try {
          const canvas = await html2canvas(document.body, {
              useCORS: true,
              backgroundColor: null, // Transparent background if possible, though body has background
              ignoreElements: (element) => {
                  // Ignore elements with specific class or data attribute
                  if (element.classList.contains('no-capture')) return true;
                  return false;
              }
          });

          // Download
          const link = document.createElement('a');
          link.download = `focus-desk-${new Date().toISOString().slice(0,10)}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      } catch (err) {
          console.error("Capture failed:", err);
      } finally {
          document.body.removeChild(watermark);
      }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white font-sans selection:bg-indigo-500/30">
      {/* Keyboard Shortcuts Handler */}
      <KeyboardShortcuts
        activeWidgetId={activeWidgetId}
        widgets={activeSpace.widgets}
        onAddWidget={addWidget}
        onCloseActiveWidget={handleCloseActiveWidget}
        onToggleMaximize={handleToggleActiveMaximize}
        onFocusWidget={handleFocusWidgetByIndex}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        onClearFocus={() => setActiveWidgetId(null)}
        onToggleCheatsheet={() => setShowCheatsheet(!showCheatsheet)}
        onArrangeGrid={handleArrangeGrid}
        isFocusMode={isFocusMode}
      />

      {/* Custom Draggable Title Bar Region (Top 24px) */}
      <div className="fixed top-0 left-0 right-0 h-6 z-[9000] titlebar-drag-region" />
      
      {/* Global Audio Element */}
      <audio 
        ref={audioRef} 
        loop={true}
        onEnded={() => {
            if(audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
        }}
      />

      <BackgroundLayer 
        url={activeSpace.backgroundUrl} 
        type={activeSpace.backgroundType} 
        dimmed={maximizedWidgetId !== null} 
      />
      
      <div 
        ref={containerRef}
        className="absolute inset-0 z-10 overflow-hidden"
      >
        {activeSpace.widgets.map(widget => (
          <DraggableWidget
              key={widget.id}
              widget={widget}
              isMaximized={maximizedWidgetId === widget.id}
              isActive={activeWidgetId === widget.id}
              onToggleMaximize={() => toggleMaximize(widget.id)}
              containerRef={containerRef}
              updateWidget={updateWidget}
              removeWidget={removeWidget}
              updatePosition={updateWidgetPosition}
              bringToFront={bringToFront}
              onFocusTask={handleFocusTask}
              focusSession={focusSession}
              onStopSession={handleStopSession}
              onCompleteTask={handleCompleteTask}
              updateSession={(updates) => setFocusSession(prev => ({ ...prev, ...updates }))}
              radioState={radioState}
              radioControls={{ toggleRadio, setRadioVolume, nextStation }}
              isCovered={!!maximizedWidgetId && maximizedWidgetId !== widget.id}
          />
        ))}
      </div>

      <AnimatePresence>
        {!isFocusMode && !maximizedWidgetId && (
            <motion.div
                initial={false}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={FLUID_TRANSITION}
                className="fixed left-0 top-0 bottom-0 z-[50]"
            >
                <Sidebar 
                    spaces={spaces}
                    activeSpaceId={activeSpaceId}
                    setActiveSpace={setActiveSpaceId}
                    addSpace={addSpace}
                    removeSpace={removeSpace}
                    isHidden={false}
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    sessionTime={displaySessionTime}
                    onOpenInsights={() => setShowInsights(true)}
                />
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isFocusMode && !maximizedWidgetId && (
            <motion.div
                initial={false}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 350, opacity: 0 }}
                transition={FLUID_TRANSITION}
                className="fixed top-6 right-6 z-[50]"
            >
                <AmbienceDock 
                    space={activeSpace} 
                    updateSpace={updateActiveSpace}
                    visible={true}
                    radioState={radioState}
                    radioControls={{ toggleRadio, setRadioVolume, setStation, setCustomRadio }}
                />
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isFocusMode && !maximizedWidgetId && (
            <motion.div
                initial={false}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 200, opacity: 0 }}
                transition={FLUID_TRANSITION}
                className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[50]"
            >
                <ControlBar 
                    space={activeSpace} 
                    addWidget={addWidget}
                    toggleFocus={() => setIsFocusMode(!isFocusMode)}
                    isFocusMode={isFocusMode}
                    onArrangeWidgets={arrangeWidgets}
                    onOpenInsights={() => setShowInsights(true)}
                    onOpenShortcuts={() => setShowCheatsheet(true)}
                    onShare={handleShareDesk}
                />
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInsights && (
            <FocusInsights 
                stats={focusStats}
                onClose={() => setShowInsights(false)}
            />
        )}
      </AnimatePresence>

      {(isFocusMode && !maximizedWidgetId && !focusSession.isActive) && (
        <button 
          onClick={() => { setIsFocusMode(false); if(focusSession.isActive) handleStopSession(); }}
          className="fixed top-6 right-6 z-50 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all group"
        >
          <Minimize2 size={24} />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-black/80 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Exit Focus
          </span>
        </button>
      )}

      <ShortcutCheatsheet 
        isOpen={showCheatsheet}
        onClose={() => setShowCheatsheet(false)}
      />

    </div>
  );
};

export default App;