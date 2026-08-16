
import React, { useState } from 'react';
import { KanbanWidgetData, KanbanItem } from '../../types';
import { Plus, X, ChevronLeft, ChevronRight, Sun, Moon, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

interface Props {
  data: KanbanWidgetData;
  updateWidget: (id: string, updates: Partial<KanbanWidgetData>) => void;
}

type ColumnType = 'todo' | 'doing' | 'done';

interface KanbanColumnProps {
    title: string;
    type: ColumnType;
    items: KanbanItem[];
    isDark: boolean;
    isAdding: boolean;
    newItemContent: string;
    setNewItemContent: (val: string) => void;
    setAddingTo: (val: ColumnType | null) => void;
    onAdd: (type: ColumnType) => void;
    onDelete: (type: ColumnType, id: string) => void;
    onMove: (from: ColumnType, to: ColumnType, id: string) => void;
    onReorder: (type: ColumnType, newItems: KanbanItem[]) => void;
}

interface KanbanItemCardProps {
    item: any;
    type: any;
    isDark: boolean;
    onMove: (from: any, to: any, id: string) => void;
    onDelete: (type: any, id: string) => void;
}

const KanbanItemCard: React.FC<KanbanItemCardProps> = ({ item, type, isDark, onMove, onDelete }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            id={item.id}
            as="div"
            dragListener={false}
            dragControls={dragControls}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group p-2.5 rounded-lg border shadow-sm relative transition-all hover:shadow-md flex gap-2 ${isDark ? 'bg-zinc-900 border-zinc-700/50 hover:border-zinc-600' : 'bg-white border-slate-200/60 hover:border-indigo-200'}`}
        >
             <div 
                className={`cursor-grab active:cursor-grabbing mt-0.5 -ml-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity touch-none ${isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-slate-300 hover:text-slate-500'}`}
                onPointerDown={(e) => {
                    // CRITICAL FIX: Do NOT call preventDefault(), it breaks framer motion drag start
                    e.stopPropagation();
                    dragControls.start(e);
                }}
            >
                <GripVertical size={12} />
            </div>

            <div className="flex-1">
                <p className={`text-xs leading-relaxed whitespace-pre-wrap mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{item.content}</p>
                
                <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                        {type !== 'todo' && (
                            <button onClick={() => onMove(type, type === 'done' ? 'doing' : 'todo', item.id)} className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`} title="Move Left">
                                <ChevronLeft size={12} />
                            </button>
                        )}
                        {type !== 'done' && (
                                <button onClick={() => onMove(type, type === 'todo' ? 'doing' : 'done', item.id)} className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`} title="Move Right">
                                <ChevronRight size={12} />
                            </button>
                        )}
                    </div>
                    <button onClick={() => onDelete(type, item.id)} className={`p-1 rounded hover:text-red-500 ${isDark ? 'text-zinc-600 hover:bg-zinc-700' : 'text-slate-300 hover:bg-slate-100'}`}>
                        <X size={12} />
                    </button>
                </div>
            </div>
        </Reorder.Item>
    );
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
    title, type, items, isDark, isAdding, 
    newItemContent, setNewItemContent, setAddingTo, 
    onAdd, onDelete, onMove, onReorder 
}) => {
    return (
        <div className={`flex-1 flex flex-col min-w-[140px] h-full rounded-xl transition-colors ${isDark ? 'bg-zinc-800/50' : 'bg-slate-100/50'}`}>
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${type === 'todo' ? 'bg-pink-400' : type === 'doing' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{title}</h4>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-slate-200 text-slate-500'}`}>{items.length}</span>
            </div>
            <button 
                onClick={() => setAddingTo(type)}
                className={`p-1 rounded hover:bg-black/5 transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Plus size={14} />
            </button>
          </div>
    
          <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-current" style={{ color: isDark ? '#3f3f46' : '#cbd5e1' }}>
            {isAdding && (
                <div className={`p-2 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-2 mb-2 ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-slate-200'}`}>
                    <textarea
                        autoFocus
                        value={newItemContent}
                        onChange={(e) => setNewItemContent(e.target.value)}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                onAdd(type);
                            }
                        }}
                        placeholder="Type..."
                        className={`w-full bg-transparent resize-none text-xs outline-none ${isDark ? 'text-zinc-200 placeholder-zinc-600' : 'text-slate-700 placeholder-slate-400'}`}
                        rows={2}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end gap-1 mt-1">
                        <button onClick={() => setAddingTo(null)} className={`text-[10px] px-2 py-1 rounded ${isDark ? 'text-zinc-500 hover:bg-zinc-700' : 'text-slate-400 hover:bg-slate-100'}`}>Cancel</button>
                        <button onClick={() => onAdd(type)} className={`text-[10px] px-2 py-1 rounded font-medium ${isDark ? 'bg-indigo-600 text-zinc-100' : 'bg-indigo-500 text-white'}`}>Add</button>
                    </div>
                </div>
            )}
    
            <Reorder.Group axis="y" values={items} onReorder={(newItems) => onReorder(type, newItems)} className="space-y-2">
                {(items || []).map(item => (
                    <KanbanItemCard 
                        key={item.id}
                        item={item}
                        type={type}
                        isDark={isDark}
                        onMove={onMove}
                        onDelete={onDelete}
                    />
                ))}
            </Reorder.Group>
          </div>
        </div>
    );
};

export const KanbanWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [newItemContent, setNewItemContent] = useState('');
  const [addingTo, setAddingTo] = useState<ColumnType | null>(null);
  const isDark = data.theme === 'DARK';

  const columns = data.columns || { todo: [], doing: [], done: [] };

  const toggleTheme = () => {
    updateWidget(data.id, { theme: isDark ? 'LIGHT' : 'DARK' });
  };

  const addItem = (column: ColumnType) => {
    if (!newItemContent.trim()) {
        setAddingTo(null);
        return;
    }
    const newItem: KanbanItem = {
      id: crypto.randomUUID(),
      content: newItemContent
    };
    
    const currentColumns = data.columns || { todo: [], doing: [], done: [] };
    const targetColumn = currentColumns[column] || [];

    updateWidget(data.id, {
      columns: {
        ...currentColumns,
        [column]: [...targetColumn, newItem]
      }
    });
    setNewItemContent('');
    setAddingTo(null);
  };

  const deleteItem = (column: ColumnType, itemId: string) => {
    const currentColumns = data.columns || { todo: [], doing: [], done: [] };
    updateWidget(data.id, {
      columns: {
        ...currentColumns,
        [column]: currentColumns[column].filter(i => i.id !== itemId)
      }
    });
  };

  const moveItem = (from: ColumnType, to: ColumnType, itemId: string) => {
    const currentColumns = data.columns || { todo: [], doing: [], done: [] };
    const item = currentColumns[from].find(i => i.id === itemId);
    if (!item) return;

    updateWidget(data.id, {
      columns: {
        ...currentColumns,
        [from]: currentColumns[from].filter(i => i.id !== itemId),
        [to]: [...currentColumns[to], item]
      }
    });
  };

  const handleReorder = (column: ColumnType, newItems: KanbanItem[]) => {
      const currentColumns = data.columns || { todo: [], doing: [], done: [] };
      updateWidget(data.id, {
          columns: {
              ...currentColumns,
              [column]: newItems
          }
      });
  };

  return (
    <div className={`h-full w-full flex flex-col p-4 transition-colors duration-300 ${isDark ? 'bg-[#18181b] text-zinc-200' : 'bg-white text-slate-900'}`}>
        <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-bold font-serif tracking-tight">Project Board</h3>
            <button onClick={toggleTheme} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
        </div>
        <div className="flex-1 flex gap-3 overflow-x-auto pb-1 scrollbar-hide" onMouseDown={(e) => e.stopPropagation()}>
            <KanbanColumn 
                title="To Do" 
                type="todo" 
                items={columns.todo} 
                isDark={isDark}
                isAdding={addingTo === 'todo'}
                newItemContent={newItemContent}
                setNewItemContent={setNewItemContent}
                setAddingTo={setAddingTo}
                onAdd={addItem}
                onDelete={deleteItem}
                onMove={moveItem}
                onReorder={handleReorder}
            />
            <KanbanColumn 
                title="In Progress" 
                type="doing" 
                items={columns.doing} 
                isDark={isDark}
                isAdding={addingTo === 'doing'}
                newItemContent={newItemContent}
                setNewItemContent={setNewItemContent}
                setAddingTo={setAddingTo}
                onAdd={addItem}
                onDelete={deleteItem}
                onMove={moveItem}
                onReorder={handleReorder}
            />
            <KanbanColumn 
                title="Done" 
                type="done" 
                items={columns.done} 
                isDark={isDark}
                isAdding={addingTo === 'done'}
                newItemContent={newItemContent}
                setNewItemContent={setNewItemContent}
                setAddingTo={setAddingTo}
                onAdd={addItem}
                onDelete={deleteItem}
                onMove={moveItem}
                onReorder={handleReorder}
            />
        </div>
    </div>
  );
};
