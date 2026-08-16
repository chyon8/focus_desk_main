
import React, { useState, useRef, useEffect } from 'react';
import { CanvasWidgetData, CanvasElement, CanvasTool } from '../../types';
import { MousePointer2, Pen, Square, Circle, Type, Image as ImageIcon, Trash2, Undo2 } from 'lucide-react';

interface Props {
  data: CanvasWidgetData;
  updateWidget: (id: string, updates: Partial<CanvasWidgetData>) => void;
}

export const CanvasWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [activeTool, setActiveTool] = useState<CanvasTool>('SELECT');
  const [activeColor, setActiveColor] = useState('#1e1e24');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);
  const [currentStart, setCurrentStart] = useState<{ x: number, y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data.elements]);

  const getCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (activeTool === 'SELECT') return;
    
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    setCurrentStart({ x, y });

    if (activeTool === 'PEN') {
      setCurrentPoints([{ x, y }]);
    } else if (activeTool === 'TEXT') {
        const text = prompt("Enter text:");
        if (text) {
            const newElement: CanvasElement = {
                id: crypto.randomUUID(),
                type: 'TEXT',
                x, y,
                stroke: activeColor,
                content: text
            };
            updateWidget(data.id, { elements: [...data.elements, newElement] });
        }
        setIsDrawing(false);
    } else if (activeTool === 'IMAGE') {
        const url = prompt("Enter Image URL:");
        if (url) {
            const newElement: CanvasElement = {
                id: crypto.randomUUID(),
                type: 'IMAGE',
                x, y,
                width: 150,
                height: 150,
                content: url
            };
            updateWidget(data.id, { elements: [...data.elements, newElement] });
        }
        setIsDrawing(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.stopPropagation();
    const { x, y } = getCoords(e);

    if (activeTool === 'PEN') {
      setCurrentPoints(prev => [...prev, { x, y }]);
    } else if (activeTool === 'RECT' || activeTool === 'CIRCLE') {
      if (currentStart) {
        setCurrentRect({
            x: Math.min(x, currentStart.x),
            y: Math.min(y, currentStart.y),
            w: Math.abs(x - currentStart.x),
            h: Math.abs(y - currentStart.y)
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.stopPropagation();
    setIsDrawing(false);

    if (activeTool === 'PEN' && currentPoints.length > 1) {
      const newElement: CanvasElement = {
        id: crypto.randomUUID(),
        type: 'PEN',
        x: 0, y: 0,
        stroke: activeColor,
        strokeWidth: 3,
        points: currentPoints
      };
      updateWidget(data.id, { elements: [...data.elements, newElement] });
    } else if ((activeTool === 'RECT' || activeTool === 'CIRCLE') && currentRect) {
        if (currentRect.w > 5 && currentRect.h > 5) {
            const newElement: CanvasElement = {
                id: crypto.randomUUID(),
                type: activeTool,
                x: currentRect.x,
                y: currentRect.y,
                width: currentRect.w,
                height: currentRect.h,
                stroke: activeColor,
                strokeWidth: 3,
                fill: 'transparent'
            };
            updateWidget(data.id, { elements: [...data.elements, newElement] });
        }
    }

    setCurrentPoints([]);
    setCurrentRect(null);
    setCurrentStart(null);
  };

  const clearCanvas = () => {
    if (confirm("Clear canvas?")) {
        updateWidget(data.id, { elements: [] });
    }
  };

  const undo = () => {
    if (data.elements.length === 0) return;
    updateWidget(data.id, { elements: data.elements.slice(0, -1) });
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#F9F9FB]">
      <div className="flex items-center gap-2 p-2 pr-20 border-b border-gray-200 bg-white shadow-sm z-10 overflow-x-auto scrollbar-hide"
           onPointerDown={(e) => e.stopPropagation()} 
      >
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          {[
            { id: 'SELECT', icon: MousePointer2 },
            { id: 'PEN', icon: Pen },
            { id: 'RECT', icon: Square },
            { id: 'CIRCLE', icon: Circle },
            { id: 'TEXT', icon: Type },
            { id: 'IMAGE', icon: ImageIcon },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as CanvasTool)}
              className={`p-1.5 rounded transition-all ${
                activeTool === tool.id 
                  ? 'bg-white shadow text-indigo-600' 
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              <tool.icon size={18} />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <div className="flex items-center gap-1">
          {['#1e1e24', '#ef4444', '#22c55e', '#3b82f6'].map(color => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${activeColor === color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={undo} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Undo (Ctrl+Z)">
            <Undo2 size={18} />
        </button>
        <button onClick={clearCanvas} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Clear All">
            <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden cursor-crosshair touch-none">
        <svg
          ref={svgRef}
          className="w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {data.elements.map(el => {
             if (el.type === 'PEN' && el.points) {
                 const d = el.points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
                 return <path key={el.id} d={d} stroke={el.stroke} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
             }
             if (el.type === 'RECT') {
                 return <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} stroke={el.stroke} strokeWidth={el.strokeWidth} fill={el.fill} />;
             }
             if (el.type === 'CIRCLE') {
                 return <ellipse key={el.id} cx={el.x + (el.width!/2)} cy={el.y + (el.height!/2)} rx={el.width!/2} ry={el.height!/2} stroke={el.stroke} strokeWidth={el.strokeWidth} fill={el.fill} />;
             }
             if (el.type === 'TEXT') {
                 return <text key={el.id} x={el.x} y={el.y} fill={el.stroke} fontSize="16" fontFamily="sans-serif">{el.content}</text>;
             }
             if (el.type === 'IMAGE') {
                 return <image key={el.id} href={el.content} x={el.x} y={el.y} width={el.width} height={el.height} />;
             }
             return null;
          })}

          {isDrawing && activeTool === 'PEN' && currentPoints.length > 1 && (
             <path 
                d={currentPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')}
                stroke={activeColor}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.6}
             />
          )}
          {isDrawing && (activeTool === 'RECT' || activeTool === 'CIRCLE') && currentRect && (
             activeTool === 'RECT' 
             ? <rect x={currentRect.x} y={currentRect.y} width={currentRect.w} height={currentRect.h} stroke={activeColor} strokeWidth={3} fill="none" opacity={0.6} />
             : <ellipse cx={currentRect.x + currentRect.w/2} cy={currentRect.y + currentRect.h/2} rx={currentRect.w/2} ry={currentRect.h/2} stroke={activeColor} strokeWidth={3} fill="none" opacity={0.6} />
          )}
        </svg>

        {data.elements.length === 0 && !isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <span className="text-4xl font-bold text-gray-300">Easel</span>
            </div>
        )}
      </div>
    </div>
  );
};
