
import React from 'react';
import { FocusStats } from '../types';
import { motion } from 'framer-motion';
import { X, TrendingUp, CheckCircle, Clock, Calendar } from 'lucide-react';

interface Props {
    stats: FocusStats;
    onClose: () => void;
}

export const FocusInsights: React.FC<Props> = ({ stats, onClose }) => {
    
    // Helper: Local Date Key (YYYY-MM-DD)
    const getLocalDayKey = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 10);
        return localISOTime;
    };

    // Helper: Format Seconds to Hours/Mins
    const formatDuration = (seconds: number) => {
        if (!seconds) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Current Stats
    const todayKey = getLocalDayKey(new Date());
    const todayStats = stats[todayKey] || { focusSeconds: 0, tasksCompleted: 0, appSessionSeconds: 0 };
    
    // Last 7 Days for Bar Chart
    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getLocalDayKey(d);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            days.push({
                date: dateStr,
                day: dayName,
                data: stats[dateStr] || { focusSeconds: 0, tasksCompleted: 0 }
            });
        }
        return days;
    };
    const weeklyData = getLast7Days();
    const maxFocusTime = Math.max(...weeklyData.map(d => d.data.focusSeconds), 60 * 60); // Min scale 1 hour

    // Heatmap (Last 28 days - 4 Weeks)
    const getLast28Days = () => {
        const days = [];
        // We want to start from 4 weeks ago
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getLocalDayKey(d);
            days.push({
                date: dateStr,
                data: stats[dateStr] || { focusSeconds: 0, tasksCompleted: 0 }
            });
        }
        return days;
    };
    const monthData = getLast28Days();

    // Get Intensity Color
    const getHeatmapColor = (seconds: number) => {
        if (seconds === 0) return 'bg-white/5';
        if (seconds < 15 * 60) return 'bg-indigo-500/20'; // < 15m
        if (seconds < 45 * 60) return 'bg-indigo-500/40'; // < 45m
        if (seconds < 90 * 60) return 'bg-indigo-500/70'; // < 1.5h
        return 'bg-indigo-500'; // > 1.5h
    };

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-2xl bg-[#0F0F12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Focus Insights</h2>
                            <p className="text-xs text-white/40 font-medium">Productivity Analytics</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-6 rounded-2xl bg-[#18181b] border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Clock size={12} /> Today's Focus
                            </div>
                            <div className="text-4xl font-mono font-bold text-white mb-1 tracking-tight">
                                {formatDuration(todayStats.focusSeconds)}
                            </div>
                            <div className="text-xs text-white/30 font-medium">
                                Total time focused
                            </div>
                        </div>
                        <div className="p-6 rounded-2xl bg-[#18181b] border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                <CheckCircle size={12} /> Tasks Done
                            </div>
                            <div className="text-4xl font-mono font-bold text-white mb-1 tracking-tight">
                                {todayStats.tasksCompleted}
                            </div>
                            <div className="text-xs text-white/30 font-medium">
                                Completed today
                            </div>
                        </div>
                        <div className="p-6 rounded-2xl bg-[#18181b] border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Clock size={12} /> Time in App
                            </div>
                            <div className="text-4xl font-mono font-bold text-white mb-1 tracking-tight">
                                {formatDuration(todayStats.appSessionSeconds)}
                            </div>
                            <div className="text-xs text-white/30 font-medium">
                                Session time today
                            </div>
                        </div>
                    </div>

                    {/* Weekly Chart */}
                    <div className="bg-[#18181b] p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 mb-6 text-sm font-medium text-white/90">
                            <Calendar size={14} className="text-indigo-400" /> Weekly Activity
                        </div>
                        <div className="h-40 flex items-end gap-3 px-2">
                            {weeklyData.map((d, i) => {
                                const heightPercent = Math.max(4, (d.data.focusSeconds / maxFocusTime) * 100);
                                const isToday = d.date === todayKey;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                                         <div className="w-full relative flex items-end h-[85%] bg-white/5 rounded-t-lg overflow-hidden">
                                             <div 
                                                className={`w-full rounded-t-lg transition-all duration-700 relative ${isToday ? 'bg-indigo-500' : 'bg-indigo-500/40 group-hover:bg-indigo-500/60'}`}
                                                style={{ height: `${heightPercent}%` }}
                                             />
                                             {/* Tooltip */}
                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black font-bold rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl transform translate-y-1 group-hover:translate-y-0 duration-200">
                                                {formatDuration(d.data.focusSeconds)}
                                             </div>
                                        </div>
                                        <span className={`text-[10px] font-bold tracking-wider ${isToday ? 'text-white' : 'text-white/30'}`}>
                                            {d.day}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Heatmap (Github Style) */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="text-sm font-medium text-white/70">Consistency (Last 4 Weeks)</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-medium">
                                <span>Less</span>
                                <div className="w-3 h-3 rounded bg-white/5" />
                                <div className="w-3 h-3 rounded bg-indigo-500/20" />
                                <div className="w-3 h-3 rounded bg-indigo-500/40" />
                                <div className="w-3 h-3 rounded bg-indigo-500" />
                                <span>More</span>
                            </div>
                        </div>
                        {/* Fixed Grid Layout: 7 Columns for Days of Week */}
                        <div className="grid grid-cols-7 gap-2">
                            {monthData.map((d, i) => (
                                <div 
                                    key={i} 
                                    className={`aspect-square rounded-md ${getHeatmapColor(d.data.focusSeconds)} transition-all hover:scale-110 hover:ring-2 hover:ring-white/20 relative group`}
                                >
                                     {/* Tooltip */}
                                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black font-bold rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
                                        {d.date}: {formatDuration(d.data.focusSeconds)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
