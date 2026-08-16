
import React, { useState } from 'react';
import { TodoWidgetData, FocusSessionState, RadioState } from '../../types';
import { Plus, Trash2, Check, Sun, Moon, CalendarDays, Play, Pause, Square, Coffee, Briefcase, Volume2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup, Reorder, useDragControls } from 'framer-motion';

interface Props {
  data: TodoWidgetData;
  updateWidget: (id: string, updates: Partial<TodoWidgetData>) => void;
  onFocusTask?: (taskName: string) => void;
  focusSession?: FocusSessionState;
  onStopSession?: () => void;
  onCompleteTask?: (taskId: string) => void;
  updateSession?: (updates: Partial<FocusSessionState>) => void;
  radioState?: RadioState;
  radioControls?: {
    toggleRadio: () => void;
    setRadioVolume: (vol: number) => void;
    nextStation: () => void;
  };
}

interface TodoItemProps {
    item: any;
    isActive: boolean;
    isPaused: any;
    isDark: boolean;
    activeTime: any;
    toggleItem: (itemId: string) => void;
    handlePlayTask: (item: any) => void;
    deleteItem: (itemId: string) => void;
    updateItem: (itemId: string, newText: string) => void;
    formatTime: (totalSeconds: number) => string;
}

const TodoItem: React.FC<TodoItemProps> = ({ item, isActive, isPaused, isDark, activeTime, toggleItem, handlePlayTask, deleteItem, updateItem, formatTime }) => {
    const dragControls = useDragControls();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(item.text);

    const handleSave = () => {
        if (editText.trim()) {
            updateItem(item.id, editText);
        } else {
            setEditText(item.text);
        }
        setIsEditing(false);
    };

    return (
        <Reorder.Item
            value={item}
            id={item.id}
            dragListener={false}
            dragControls={dragControls}
            as="div"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`
                group flex items-center gap-3 p-3 rounded-xl transition-all border relative
                ${isActive ? (isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100') : (isDark ? 'bg-transparent hover:bg-zinc-800/50 border-transparent' : 'bg-transparent hover:bg-slate-50 border-transparent')} 
                ${item.completed ? 'opacity-50' : 'opacity-100'}
            `}
        >
            {/* Drag Handle */}
            <div 
                className={`cursor-grab active:cursor-grabbing p-2 -ml-2.5 opacity-0 group-hover:opacity-100 transition-opacity touch-none ${isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-slate-300 hover:text-slate-500'}`}
                onPointerDown={(e) => {
                    // CRITICAL FIX: Do NOT call preventDefault(), it breaks framer motion drag start on some devices
                    e.stopPropagation(); // Stop parent window from dragging
                    dragControls.start(e);
                }}
            >
                <GripVertical size={14} />
            </div>

            <button 
                onClick={() => toggleItem(item.id)}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0 ${item.completed ? 'bg-indigo-500 border-indigo-500 text-white' : (isDark ? 'border-zinc-600 hover:border-zinc-400 bg-transparent' : 'border-slate-300 hover:border-indigo-400 bg-white')}`}
            >
                {item.completed && <Check size={12} strokeWidth={3} />}
            </button>
            
            {isEditing ? (
                <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                             handleSave();
                        }
                        if (e.key === 'Escape') {
                             setEditText(item.text);
                             setIsEditing(false);
                        }
                    }}
                    className={`flex-1 text-sm font-medium bg-transparent outline-none border-b border-indigo-500/50 ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}
                    onMouseDown={(e) => e.stopPropagation()}
                 />
            ) : (
                <span 
                    onDoubleClick={() => {
                        if(!item.completed) {
                            setIsEditing(true);
                            setEditText(item.text);
                        }
                    }}
                    className={`flex-1 text-sm font-medium transition-all duration-300 truncate cursor-text ${item.completed ? 'line-through decoration-2 decoration-current' : ''} ${isDark ? (item.completed ? 'text-zinc-600' : 'text-zinc-300') : (item.completed ? 'text-slate-300' : 'text-slate-700')}`}
                    title="Double click to edit"
                >
                    {item.text}
                </span>
            )}

            {isActive && isPaused && (
                <span className="text-[10px] font-mono opacity-50 tabular-nums">
                    {formatTime(activeTime)}
                </span>
            )}

            {!item.completed && !isEditing && (
                <button 
                    onClick={() => handlePlayTask(item)}
                    className={`
                        p-1.5 rounded-full transition-all shrink-0
                        ${isActive 
                            ? (isPaused 
                                ? 'opacity-100 bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm' 
                                : 'opacity-100 bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm' 
                              ) 
                            : 'opacity-0 group-hover:opacity-100 bg-transparent text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-zinc-700'
                        }
                    `}
                    title={isActive ? (isPaused ? "Resume" : "Pause") : "Focus on this task"}
                >
                    {isActive ? (
                        isPaused ? <Play size={10} fill="currentColor" className="ml-0.5" /> : <Pause size={10} fill="currentColor" />
                    ) : (
                        <Play size={10} fill="currentColor" className="ml-0.5" />
                    )}
                </button>
            )}

            <button 
                onClick={() => deleteItem(item.id)}
                className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all shrink-0 ${isDark ? 'text-zinc-600 hover:bg-red-500/10 hover:text-red-400' : 'text-slate-300 hover:bg-red-50 hover:text-red-500'}`}
            >
                <Trash2 size={14} />
            </button>
        </Reorder.Item>
    );
}

export const TodoWidget: React.FC<Props> = ({ 
    data, 
    updateWidget, 
    onFocusTask, 
    focusSession, 
    onStopSession, 
    onCompleteTask,
    updateSession,
    radioState,
    radioControls
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const isDark = data.theme === 'DARK';

  const toggleTheme = () => {
    updateWidget(data.id, { theme: isDark ? 'LIGHT' : 'DARK' });
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem = {
      id: crypto.randomUUID(),
      text: newItemText,
      completed: false
    };
    updateWidget(data.id, { items: [...data.items, newItem] });
    setNewItemText('');
  };

  const toggleItem = (itemId: string) => {
    const updatedItems = data.items.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateWidget(data.id, { items: updatedItems });
  };
  
  const updateItem = (itemId: string, newText: string) => {
    const updatedItems = data.items.map(item => 
      item.id === itemId ? { ...item, text: newText } : item
    );
    updateWidget(data.id, { items: updatedItems });
  };

  const deleteItem = (itemId: string) => {
    const updatedItems = data.items.filter(item => item.id !== itemId);
    if (data.activeTaskId === itemId) {
        updateWidget(data.id, { items: updatedItems, activeTaskId: null });
        if (focusSession?.isActive && focusSession.activeWidgetId === data.id) {
            onStopSession?.();
        }
    } else {
        updateWidget(data.id, { items: updatedItems });
    }
  };

  const handleReorder = (newItems: any[]) => {
      updateWidget(data.id, { items: newItems });
  };

  const handlePlayTask = (item: { id: string, text: string }) => {
      if (data.activeTaskId === item.id && focusSession?.isPaused) {
          updateSession?.({ isPaused: false });
          return;
      }
      if (data.activeTaskId === item.id && !focusSession?.isPaused) {
          updateSession?.({ isPaused: true });
          return;
      }

      updateWidget(data.id, { activeTaskId: item.id });
      if (onFocusTask) {
          onFocusTask(item.text);
      }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');
    return hours > 0 ? `${hours}:${minsStr}:${secsStr}` : `${minsStr}:${secsStr}`;
  };

  const isSessionActive = focusSession?.isActive && focusSession?.activeWidgetId === data.id;
  const isPaused = isSessionActive && focusSession?.isPaused;
  const activeTime = focusSession ? (focusSession.mode === 'BREAK' ? focusSession.breakTime : focusSession.elapsedTime) : 0;
  const isBreak = focusSession?.mode === 'BREAK';

  if (isSessionActive && !isPaused) {
    return (
        <div 
            className="h-full w-full flex items-center px-1.5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence mode='wait'>
                {!isHovered ? (
                    <motion.div 
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.8 } }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 w-full justify-center"
                    >
                         <div className="relative flex items-center justify-center w-6 h-6">
                            <div className={`absolute inset-0 rounded-full animate-pulse opacity-50 ${isBreak ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                            <div className={`relative w-2.5 h-2.5 rounded-full shadow-lg ${isBreak ? 'bg-emerald-400' : 'bg-indigo-500'}`} />
                         </div>
                         <span className="text-lg font-mono font-medium text-white tracking-widest tabular-nums">
                             {formatTime(activeTime)}
                         </span>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="expanded"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.5 } }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-between w-full px-2"
                    >
                        <div className="flex flex-col">
                            <span className={`text-[9px] font-bold tracking-widest ${isBreak ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                {isBreak ? 'BREAK' : 'FOCUS'}
                            </span>
                            <span className="text-sm font-mono text-white tabular-nums">
                                {formatTime(activeTime)}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                             <button 
                                onClick={() => updateSession?.({ mode: isBreak ? 'FOCUS' : 'BREAK' })}
                                className={`p-1.5 rounded-lg transition-colors ${isBreak ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-indigo-300 hover:bg-indigo-500/20'}`}
                                title={isBreak ? "Back to Work" : "Take Break"}
                             >
                                {isBreak ? <Briefcase size={14} /> : <Coffee size={14} />}
                             </button>
                             <button 
                                onClick={() => updateSession?.({ isPaused: true })}
                                className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                             >
                                <Pause size={14} fill="currentColor" />
                             </button>
                             
                             {radioState && radioControls && (
                                <div className="w-px h-3 bg-white/10 mx-1" />
                             )}
                             
                             {radioState && radioControls && (
                                <button 
                                    onClick={radioControls.toggleRadio} 
                                    className={`p-1.5 rounded-lg transition-colors ${radioState.isPlaying ? 'text-white' : 'text-white/50 hover:text-white'}`}
                                >
                                    {radioState.isPlaying ? <Volume2 size={14} /> : <Play size={14} />}
                                </button>
                             )}

                             <button 
                                onClick={onStopSession}
                                className="p-1.5 rounded-lg text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-colors ml-1"
                             >
                                <Square size={14} fill="currentColor" />
                             </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
  }

  const total = data.items.length;
  const completed = data.items.filter(i => i.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const radius = 22; // Adjusted radius
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div 
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={`h-full w-full flex flex-col p-6 transition-colors duration-300 relative overflow-hidden ${isDark ? 'bg-[#18181b] text-zinc-200' : 'bg-white text-slate-800'}`}
    >
      <LayoutGroup>
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {isPaused ? (
                            <span className="flex items-center gap-1 text-white/60 animate-pulse">
                                <Pause size={10} fill="currentColor"/> RESUME TASK
                            </span>
                        ) : (
                            <>
                                <CalendarDays size={10} />
                                <span>Today's Plan</span>
                            </>
                        )}
                    </div>
                    <h2 className="text-xl font-bold font-serif">Tasks</h2>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r={radius} className={isDark ? 'stroke-zinc-800' : 'stroke-slate-100'} strokeWidth="4" fill="transparent" />
                            <circle cx="24" cy="24" r={radius} className={`transition-all duration-500 ease-out ${isDark ? 'stroke-indigo-500' : 'stroke-indigo-500'}`} strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold opacity-60">{percentage}%</span>
                    </div>
                    <button onClick={toggleTheme} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`}>
                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                </div>
            </div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className={`flex-1 overflow-y-auto mb-4 pr-1 scrollbar-thin ${isDark ? 'scrollbar-thumb-zinc-700' : 'scrollbar-thumb-slate-200'}`}
            >
            
            <Reorder.Group axis="y" values={data.items} onReorder={handleReorder} className="space-y-1">
                {data.items.map(item => (
                    <TodoItem
                        key={item.id}
                        item={item}
                        isActive={data.activeTaskId === item.id}
                        isPaused={isPaused}
                        isDark={isDark}
                        activeTime={activeTime}
                        toggleItem={toggleItem}
                        updateItem={updateItem}
                        handlePlayTask={handlePlayTask}
                        deleteItem={deleteItem}
                        formatTime={formatTime}
                    />
                ))}
            </Reorder.Group>
            
            {data.items.length === 0 && (
                <div className={`flex flex-col items-center justify-center h-24 text-center italic text-xs ${isDark ? 'text-zinc-700' : 'text-slate-300'}`}>
                <span>No tasks for today.</span>
                </div>
            )}
            </motion.div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-2 pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}
            >
            <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        addItem();
                    }
                }}
                className={`flex-1 bg-transparent text-sm outline-none placeholder:transition-colors ${isDark ? 'text-zinc-200 placeholder-zinc-700' : 'text-slate-800 placeholder-slate-300'}`}
                placeholder="Add a new task..."
                onMouseDown={(e) => e.stopPropagation()}
            />
            <button 
                onClick={addItem}
                className={`p-2 rounded-lg transition-all active:scale-95 ${newItemText.trim() ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : (isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-slate-100 text-slate-300')}`}
            >
                <Plus size={16} />
            </button>
            </motion.div>
        </div>
      </LayoutGroup>
    </motion.div>
  );
};
