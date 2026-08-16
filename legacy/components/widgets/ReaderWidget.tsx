
import React, { useState, useRef } from 'react';
import { ReaderWidgetData } from '../../types';
import { BookOpen, Sparkles, FileUp, X, Type, Search, Settings2, Minus, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  data: ReaderWidgetData;
  updateWidget: (id: string, updates: Partial<ReaderWidgetData>) => void;
}

type ReaderTheme = 'LIGHT' | 'SEPIA' | 'DARK';

export const ReaderWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [inputUrl, setInputUrl] = useState(data.url);
  const [theme, setTheme] = useState<ReaderTheme>('LIGHT');
  const [fontSize, setFontSize] = useState(16);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContent = async () => {
    let url = inputUrl.trim();
    if (!url) return;
    
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    setInputUrl(url);
    updateWidget(data.id, { url, isLoading: true, pdfUrl: undefined });

    try {
      const response = await fetch(`https://r.jina.ai/${url}`);
      if (!response.ok) throw new Error('Failed to fetch content');
      
      const text = await response.text();
      updateWidget(data.id, { content: text, isLoading: false, pdfUrl: undefined });
    } catch (error) {
      updateWidget(data.id, { 
        content: "# Error\nCould not extract content from this URL. The site might be blocking automated access.", 
        isLoading: false,
        pdfUrl: undefined
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const fileUrl = URL.createObjectURL(file);
      updateWidget(data.id, { 
        pdfUrl: fileUrl, 
        content: '', 
        url: file.name,
        isLoading: false 
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchContent();
    }
  };

  // Styles based on theme
  const themeStyles = {
    LIGHT: {
      bg: 'bg-white',
      text: 'text-slate-900',
      border: 'border-slate-100',
      prose: 'prose-slate',
      input: 'bg-slate-50 text-slate-800 focus:bg-white border-transparent focus:border-slate-200 placeholder-slate-400',
      icon: 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
    },
    SEPIA: {
      bg: 'bg-[#FDFBF7]',
      text: 'text-[#433422]',
      border: 'border-[#EBE6D9]',
      prose: 'prose-stone',
      input: 'bg-[#F2EFE9] text-[#5C4B37] focus:bg-[#FDFBF7] border-transparent focus:border-[#E6E0D0] placeholder-[#A89F91]',
      icon: 'text-[#A89F91] hover:text-[#5C4B37] hover:bg-[#F2EFE9]'
    },
    DARK: {
      bg: 'bg-[#18181b]',
      text: 'text-zinc-300',
      border: 'border-zinc-800',
      prose: 'prose-invert prose-zinc',
      input: 'bg-zinc-800 text-zinc-200 focus:bg-zinc-900 border-zinc-700 focus:border-zinc-600 placeholder-zinc-500',
      icon: 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
    }
  };

  const t = themeStyles[theme];

  return (
    <div className={`h-full w-full flex flex-col transition-colors duration-300 ${t.bg} ${t.text}`}>
      
      {/* Refined Navigation Bar */}
      <div className={`flex items-center gap-2 p-3 ${t.border} border-b transition-colors z-20`}>
        <div className={`p-1.5 rounded-lg ${t.icon}`}>
            <BookOpen size={16} />
        </div>
        
        {/* URL Input */}
        <div className="flex-1 relative group">
            <input
            type="text"
            className={`w-full rounded-lg px-3 py-1.5 text-xs outline-none border transition-all ${t.input} font-medium`}
            placeholder={data.pdfUrl ? data.url : "https://..."}
            value={data.pdfUrl ? '' : inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!!data.pdfUrl}
            />
            {!data.pdfUrl && !data.isLoading && inputUrl && (
                <button 
                    onClick={fetchContent}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-indigo-500 hover:bg-indigo-50/50 transition-colors"
                    title="Parse Article"
                >
                    <Sparkles size={12} />
                </button>
            )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
            {data.pdfUrl ? (
                <button 
                    onClick={() => updateWidget(data.id, { pdfUrl: undefined, url: '', content: '' })}
                    className={`p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-500 hover:bg-red-500/10`}
                >
                    <X size={16} />
                </button>
            ) : (
                <>
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-1.5 rounded-lg transition-colors ${t.icon} ${showSettings ? 'bg-black/5' : ''}`}
                    title="Appearance"
                >
                    <Type size={16} />
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-1.5 rounded-lg transition-colors ${t.icon}`}
                    title="Upload PDF"
                >
                    <FileUp size={16} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf" 
                    onChange={handleFileUpload} 
                />
                </>
            )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && !data.pdfUrl && (
          <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between animate-in slide-in-from-top-2`}>
              <div className="flex items-center gap-1 bg-black/5 rounded-lg p-0.5">
                  <button onClick={() => setTheme('LIGHT')} className={`p-1.5 rounded-md ${theme === 'LIGHT' ? 'bg-white shadow-sm text-black' : 'text-slate-400 hover:text-slate-600'}`}><div className="w-3 h-3 rounded-full bg-white border border-slate-200" /></button>
                  <button onClick={() => setTheme('SEPIA')} className={`p-1.5 rounded-md ${theme === 'SEPIA' ? 'bg-[#FDFBF7] shadow-sm text-[#5C4B37]' : 'text-slate-400 hover:text-slate-600'}`}><div className="w-3 h-3 rounded-full bg-[#F5F1E4] border border-[#E6E0D0]" /></button>
                  <button onClick={() => setTheme('DARK')} className={`p-1.5 rounded-md ${theme === 'DARK' ? 'bg-zinc-800 shadow-sm text-white' : 'text-slate-400 hover:text-slate-600'}`}><div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-700" /></button>
              </div>

              <div className="flex items-center gap-2">
                  <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className={`p-1.5 rounded-lg ${t.icon}`}><Minus size={14} /></button>
                  <span className={`text-xs font-mono w-6 text-center ${t.text}`}>{fontSize}</span>
                  <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} className={`p-1.5 rounded-lg ${t.icon}`}><Plus size={14} /></button>
              </div>
          </div>
      )}

      {/* Content Area */}
      <div 
        className={`flex-1 overflow-y-auto px-8 py-8 scrollbar-thin transition-colors duration-300 ${isDarkScroll(theme) ? 'scrollbar-thumb-zinc-700' : 'scrollbar-thumb-slate-200'}`}
        onMouseDown={(e) => e.stopPropagation()} 
        style={{ fontSize: `${fontSize}px` }}
      >
        {data.isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
             <div className="relative">
                 <div className={`w-12 h-12 rounded-full border-2 ${theme === 'DARK' ? 'border-zinc-700 border-t-indigo-500' : 'border-slate-200 border-t-indigo-500'} animate-spin`} />
                 <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={16} />
             </div>
             <p className="text-xs font-medium tracking-wide animate-pulse">Distilling Knowledge...</p>
          </div>
        ) : data.pdfUrl ? (
          <iframe 
            src={data.pdfUrl} 
            className="w-full h-full border-none rounded-lg bg-white" 
            title="PDF Viewer"
          />
        ) : data.content ? (
          <div className={`mx-auto max-w-2xl transition-colors duration-300 ${t.prose}`}>
            <h1 className="text-3xl font-serif font-bold mb-8 !leading-tight tracking-tight border-b pb-6 opacity-90 border-current">
                {data.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
            </h1>
            <ReactMarkdown 
                components={{
                    p: ({node, ...props}) => <p {...props} className="font-serif leading-loose mb-6 opacity-90" />,
                    h1: ({node, ...props}) => <h1 {...props} className="font-sans font-bold mt-8 mb-4 opacity-95" />,
                    h2: ({node, ...props}) => <h2 {...props} className="font-sans font-bold mt-8 mb-4 opacity-95" />,
                    h3: ({node, ...props}) => <h3 {...props} className="font-sans font-semibold mt-6 mb-3 opacity-95" />,
                    li: ({node, ...props}) => <li {...props} className="font-serif my-1" />,
                    blockquote: ({node, ...props}) => <blockquote {...props} className={`border-l-4 pl-4 italic my-6 opacity-80 ${theme === 'DARK' ? 'border-zinc-700' : 'border-indigo-200'}`} />,
                    img: ({node, ...props}) => (
                        <div className="my-8 rounded-lg overflow-hidden shadow-sm">
                            <img {...props} className="w-full h-auto object-cover m-0" />
                            {props.alt && <div className="text-xs opacity-50 p-2 text-center font-sans mt-2">{props.alt}</div>}
                        </div>
                    ),
                    code: ({node, ...props}) => <code {...props} className={`px-1 py-0.5 rounded text-sm font-mono ${theme === 'DARK' ? 'bg-zinc-800' : 'bg-slate-100'}`} />
                }}
            >
                {data.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
            <BookOpen size={64} strokeWidth={1} className="mb-6" />
            <p className="text-lg font-serif italic">"Reading is dreaming with open eyes."</p>
          </div>
        )}
      </div>
    </div>
  );
};

function isDarkScroll(theme: ReaderTheme) {
    return theme === 'DARK';
}
