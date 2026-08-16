import React, { useRef, useState } from 'react';
import { PhotoWidgetData } from '../../types';
import { Image as ImageIcon, Upload, Link, Type, StickyNote, Palette } from 'lucide-react';

interface Props {
  data: PhotoWidgetData;
  updateWidget: (id: string, updates: Partial<PhotoWidgetData>) => void;
}

const FRAME_COLORS = ['#ffffff', '#fdfbf7', '#fecaca', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#18181b'];

export const PhotoWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800; // Limit max dimension to 800px to save storage

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality to reduce base64 string size
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          updateWidget(data.id, { url: compressedDataUrl });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlInput = () => {
    const url = prompt("Enter Image URL:");
    if (url) {
      updateWidget(data.id, { url });
    }
  };

  if (!data.url) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl gap-4 shadow-2xl">
        <div className="text-white font-medium flex items-center gap-2">
            <ImageIcon size={18} />
            <span>Add Photo</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 w-24 group"
          >
            <div className="p-2 rounded-full bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <Upload size={20} />
            </div>
            <span className="text-xs text-white/80 group-hover:text-white font-medium">Upload</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
          
          <button 
            onClick={handleUrlInput}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 w-24 group"
          >
            <div className="p-2 rounded-full bg-pink-500/20 text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-all">
                <Link size={20} />
            </div>
            <span className="text-xs text-white/80 group-hover:text-white font-medium">URL</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`h-full w-full flex flex-col relative group transition-all duration-300 ${data.style === 'POLAROID' ? 'p-3 pb-8 shadow-[0_4px_24px_rgba(0,0,0,0.5)]' : ''}`}
      style={{ 
        backgroundColor: data.style === 'POLAROID' ? (data.frameColor || '#ffffff') : 'transparent',
      }}
    >
      
      {/* Pin - Top Left */}
      <div className="absolute -top-3 left-4 z-30 drop-shadow-md pointer-events-none">
        <div className="w-3 h-3 rounded-full bg-red-500 border border-red-700 shadow-sm relative">
            <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white/50 rounded-full" />
        </div>
      </div>

      {/* Controls Overlay - Bottom Right of Image */}
      <div className="absolute bottom-12 right-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        
        {data.style === 'POLAROID' && (
           <div className="relative">
             <button
               onClick={() => setShowColorPicker(!showColorPicker)}
               className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border border-white/20"
               title="Frame Color"
             >
                <Palette size={14} />
             </button>
             {showColorPicker && (
               <div className="absolute bottom-full right-0 mb-2 p-2 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 flex gap-1 shadow-xl">
                 {FRAME_COLORS.map(color => (
                   <button
                     key={color}
                     onClick={() => { updateWidget(data.id, { frameColor: color }); setShowColorPicker(false); }}
                     className={`w-4 h-4 rounded-full border ${data.frameColor === color ? 'border-white scale-110' : 'border-white/20 hover:scale-105'}`}
                     style={{ backgroundColor: color }}
                   />
                 ))}
               </div>
             )}
           </div>
        )}

        <button 
          onClick={() => updateWidget(data.id, { style: data.style === 'POLAROID' ? 'STICKER' : 'POLAROID' })}
          className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border border-white/20"
          title={data.style === 'POLAROID' ? "Switch to Sticker" : "Switch to Polaroid"}
        >
           {data.style === 'POLAROID' ? <StickyNote size={14} /> : <ImageIcon size={14} />}
        </button>
        <button 
          onClick={() => updateWidget(data.id, { url: '', caption: '' })}
          className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/70 backdrop-blur-md border border-white/20"
          title="Change Image"
        >
          <Upload size={14} />
        </button>
      </div>

      {/* Image Area */}
      <div className={`relative flex-1 overflow-hidden ${data.style === 'POLAROID' ? 'mb-3 border border-black/5' : 'h-full'}`}>
        <img 
          src={data.url} 
          alt="Widget" 
          className="w-full h-full object-cover select-none pointer-events-none" 
        />
      </div>

      {/* Caption (Polaroid Only) */}
      {data.style === 'POLAROID' && (
        <div className="h-8 flex items-end">
          <input
            type="text"
            value={data.caption || ''}
            onChange={(e) => updateWidget(data.id, { caption: e.target.value })}
            placeholder="Write a caption..."
            className="w-full text-center font-serif text-gray-800/80 placeholder-gray-400 bg-transparent border-none outline-none text-sm"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ color: data.frameColor === '#18181b' ? 'rgba(255,255,255,0.8)' : undefined }}
          />
        </div>
      )}
    </div>
  );
};