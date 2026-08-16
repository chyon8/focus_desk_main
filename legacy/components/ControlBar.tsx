

import React, { useState } from 'react';
import { Space, WidgetType } from '../types';
import { 
  Plus, Maximize2, StickyNote, ListTodo, Timer, Link, Share2, FileText, Globe, LayoutGrid, Grid3x3, Grid2X2, Sparkles, PenTool, BookOpen, Image as ImageIcon, FileSignature, Scroll, Calendar, Clock, Trello, BarChart2, Keyboard, Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';

interface Props {
  space: Space;
  addWidget: (type: WidgetType) => void;
  toggleFocus: () => void;
  isFocusMode: boolean;
  onArrangeWidgets: (cols: number | 'AUTO') => void;
  onOpenInsights: () => void;
  onOpenShortcuts: () => void;
  onShare: () => void;
}

export const ControlBar: React.FC<Props> = ({ space, addWidget, toggleFocus, isFocusMode, onArrangeWidgets, onOpenInsights, onOpenShortcuts, onShare }) => {
  const [activeMenu, setActiveMenu] = useState<'NONE' | 'WIDGETS' | 'LAYOUT'>('NONE');

  const toggleMenu = (menu: 'WIDGETS' | 'LAYOUT') => {
    setActiveMenu(activeMenu === menu ? 'NONE' : menu);
  };



  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[5500] transition-all duration-500 no-capture ${isFocusMode ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
      
      {/* Widget Menu */}
      <AnimatePresence>
        {activeMenu === 'WIDGETS' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex gap-2 shadow-2xl origin-bottom z-50 flex-wrap justify-center w-[520px]"
          >
            {[
              { type: 'NEW_MEMO', icon: Scroll, label: 'Note' },
              { type: 'NEW_EDITOR', icon: FileSignature, label: 'Docs' },
              { type: 'TODO', icon: ListTodo, label: 'Todo' },
              { type: 'KANBAN', icon: Trello, label: 'Kanban' },
              { type: 'CALENDAR', icon: Calendar, label: 'Calendar' },
              { type: 'CLOCK', icon: Clock, label: 'Clock' },
              { type: 'PHOTO', icon: ImageIcon, label: 'Photo' },
              { type: 'CANVAS', icon: PenTool, label: 'Easel' },
              { type: 'READER', icon: BookOpen, label: 'Reader' },
              { type: 'TIMER', icon: Timer, label: 'Timer' },
              { type: 'BROWSER', icon: Globe, label: 'Browse' },
              { type: 'YOUTUBE_MUSIC', icon: Music, label: 'Music' },
              { type: 'BOOKMARKS', icon: Link, label: 'Links' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  addWidget(item.type as WidgetType);
                  setActiveMenu('NONE');
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all w-20"
              >
                <item.icon size={24} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout Menu */}
      <AnimatePresence>
        {activeMenu === 'LAYOUT' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex gap-2 shadow-2xl origin-bottom z-50"
          >
             <button
                onClick={() => { onArrangeWidgets('AUTO'); setActiveMenu('NONE'); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all w-20"
              >
                <Sparkles size={24} />
                <span className="text-[10px] font-medium">Smart</span>
              </button>
              <button
                onClick={() => { onArrangeWidgets(2); setActiveMenu('NONE'); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all w-20"
              >
                <Grid2X2 size={24} />
                <span className="text-[10px] font-medium">2 Cols</span>
              </button>
              <button
                onClick={() => { onArrangeWidgets(3); setActiveMenu('NONE'); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all w-20"
              >
                <Grid3x3 size={24} />
                <span className="text-[10px] font-medium">3 Cols</span>
              </button>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard className="px-4 py-3 flex items-center gap-4">
        
        {/* Main Controls */}
        <div className="flex items-center gap-2">
           
           <button 
            onClick={() => toggleMenu('WIDGETS')}
            className={`p-2 rounded-xl transition-all hover:bg-white/20 ${activeMenu === 'WIDGETS' ? 'bg-white/20 text-white' : 'text-white/70'}`}
            title="Add Widget"
          >
            <Plus size={20} />
          </button>

          <button 
            onClick={() => toggleMenu('LAYOUT')}
            className={`p-2 rounded-xl transition-all hover:bg-white/20 ${activeMenu === 'LAYOUT' ? 'bg-white/20 text-white' : 'text-white/70'}`}
            title="Arrange Widgets"
          >
            <LayoutGrid size={20} />
          </button>

          <button 
            onClick={onOpenInsights}
            className="p-2 rounded-xl text-white/70 hover:bg-white/20 transition-all"
            title="Focus Insights"
          >
            <BarChart2 size={20} />
          </button>

          <button 
            onClick={onOpenShortcuts}
            className="p-2 rounded-xl text-white/70 hover:bg-white/20 transition-all group relative"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard size={20} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-[10px] text-white/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Press ? for shortcuts
            </span>
          </button>



          <button 
            onClick={onShare}
            className="p-2 rounded-xl text-white/70 hover:bg-white/20 transition-all"
            title="Share Desk Snapshot"
          >
            <Share2 size={20} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <button 
            onClick={toggleFocus}
            className="p-2 rounded-xl text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-all"
            title="Enter Focus Mode"
          >
            <Maximize2 size={20} />
          </button>
        </div>

      </GlassCard>
    </div>
  );
};
