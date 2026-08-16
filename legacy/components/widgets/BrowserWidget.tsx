
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserWidgetData } from '../../types';
import { Search, RotateCw, ArrowLeft, ArrowRight, Lock, Globe, ShieldCheck, Compass, X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  data: BrowserWidgetData;
  updateWidget: (id: string, updates: Partial<BrowserWidgetData>) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  removeWidget?: () => void;
  isCovered?: boolean;
}

// Window augmentation for TypeScript
declare global {
  interface Window {
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export const BrowserWidget: React.FC<Props> = ({ data, updateWidget, isMaximized, onToggleMaximize, removeWidget, isCovered }) => {
  const [inputUrl, setInputUrl] = useState(data.url);
  const webviewRef = useRef<any>(null); // Use any because standard type defs for webview methods are tricky
  
  // Zoom State
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0 = 100%

  // Setup Webview Listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidNavigate = (e: any) => {
        if (e.url !== data.url) {
            updateWidget(data.id, { url: e.url });
            setInputUrl(e.url);
        }
    };

    // Wait for ready
    const handleDomReady = () => {
        // Apply zoom
        webview.setZoomFactor(zoomLevel);
    };

    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate); // Handle hash changes
    webview.addEventListener('dom-ready', handleDomReady);

    return () => {
        webview.removeEventListener('did-navigate', handleDidNavigate);
        webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
        webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [data.id, updateWidget, zoomLevel]); // Re-bind on ID or zoom change

  // Update URL from Props
  useEffect(() => {
    if (data.url !== inputUrl) {
        setInputUrl(data.url);
    }
    // Note: We don't force webview SRC update here to avoid reloading on every keystroke/external change
    // unless it's a completely different navigation initiated externally.
  }, [data.url]);

  // Handle Zoom Effect
  useEffect(() => {
      if (webviewRef.current) {
          // Check if ready
          try {
             webviewRef.current.setZoomFactor(zoomLevel);
          } catch(e) {/* ignore if not ready */}
      }
  }, [zoomLevel]);


  // Navigate Handler
  const handleNavigate = (urlOverride?: string) => {
    let url = urlOverride || inputUrl.trim();
    if (!url) return;
    
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    setInputUrl(url);
    updateWidget(data.id, { url });
    
    if (webviewRef.current) {
        webviewRef.current.src = url;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  const handleControl = (action: 'back' | 'forward' | 'reload' | 'stop') => {
      const webview = webviewRef.current;
      if (!webview) return;
      
      switch (action) {
        case 'back': if (webview.canGoBack()) webview.goBack(); break;
        case 'forward': if (webview.canGoForward()) webview.goForward(); break;
        case 'reload': webview.reload(); break;
        case 'stop': webview.stop(); break;
      }
  };

  const handleZoom = (delta: number) => {
      setZoomLevel(prev => {
          const next = Math.min(Math.max(prev + delta, 0.25), 3.0); // 25% to 300%
          return parseFloat(next.toFixed(1));
      });
  };

  // Quick Link Component
  const QuickLink = ({ name, url, icon }: { name: string, url: string, icon: React.ReactNode }) => (
    <button 
        onClick={() => handleNavigate(url)}
        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
    >
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 group-hover:text-white group-hover:scale-110 transition-all">
            {icon}
        </div>
        <span className="text-xs font-medium text-white/60 group-hover:text-white">{name}</span>
    </button>
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#1E1E24] overflow-hidden">
      {/* Modern Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-white/5 bg-black/20 backdrop-blur-md relative z-10 drag-handle">
        {/* Window Controls (Red/Yellow/Green style) */}
        <div className="flex items-center gap-1.5 mr-2">
             <button 
                onClick={(e) => { e.stopPropagation(); removeWidget?.(); }} 
                className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center group"
             >
                <X size={8} className="text-black/50 opacity-0 group-hover:opacity-100" />
             </button>
             <button 
                onClick={(e) => { e.stopPropagation(); onToggleMaximize?.(); }} 
                className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors flex items-center justify-center group"
             >
                <Minimize2 size={8} className="text-black/50 opacity-0 group-hover:opacity-100" />
             </button>
             <button 
                onClick={(e) => { e.stopPropagation(); onToggleMaximize?.(); }}
                className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors flex items-center justify-center group"
             >
                <Maximize2 size={8} className="text-black/50 opacity-0 group-hover:opacity-100" />
             </button>
        </div>
        
        {/* Navigation Controls */}
        <div className="flex items-center">
            <button onClick={() => handleControl('back')} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
                <ArrowLeft size={14} />
            </button>
            <button onClick={() => handleControl('forward')} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
                <ArrowRight size={14} />
            </button>
            <button onClick={() => handleControl('reload')} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                <RotateCw size={12} />
            </button>
        </div>
        
        {/* Address Bar */}
        <div className="flex-1 flex items-center justify-center mx-1">
            <div className="flex items-center w-full max-w-md bg-black/40 hover:bg-black/50 transition-colors rounded-full px-3 py-1 border border-white/5 focus-within:border-white/20 focus-within:bg-black/60 shadow-inner group h-7">
                <div className="mr-2 text-white/30 group-focus-within:text-indigo-400 transition-colors">
                     {data.url.startsWith('https') ? <Lock size={10} /> : <Globe size={10} />}
                </div>
                
                <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-[11px] text-center group-focus-within:text-left text-white/90 placeholder-white/30 font-medium tracking-wide"
                    placeholder="Search or enter website"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.target.select()}
                />
            </div>
        </div>

        {/* Zoom & Extras */}
        <div className="flex items-center gap-1">
             <div className="flex items-center bg-white/5 rounded-lg px-1 h-7 border border-white/5">
                <button onClick={() => handleZoom(-0.1)} className="p-1 text-white/40 hover:text-white transition-colors">
                    <ZoomOut size={12} />
                </button>
                <span className="text-[10px] w-8 text-center text-white/60 font-mono">
                    {Math.round(zoomLevel * 100)}%
                </span>
                <button onClick={() => handleZoom(0.1)} className="p-1 text-white/40 hover:text-white transition-colors">
                    <ZoomIn size={12} />
                </button>
             </div>
        </div>
      </div>

      {/* Content Area - Using <webview> tag */}
      <div className="flex-1 relative bg-[#0F0F12] w-full h-full">
         
         {/* Start Page Overlay - Visible only when NO URL is set */}
         {!data.url && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F0F12] z-50 pointer-events-auto">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0F0F12] to-[#0F0F12] pointer-events-none" />

                <div className="mb-8 flex flex-col items-center relative z-10">
                    <Compass size={56} className="text-indigo-500 mb-4 opacity-80 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]" />
                    <h2 className="text-xl font-medium text-white/90 tracking-tight">Focus Browser</h2>
                </div>
                
                <div className="w-full max-w-sm px-6 mb-10 relative z-10">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search the web..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-xl placeholder-white/20"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleNavigate(`https://www.bing.com/search?q=${e.currentTarget.value}`);
                                }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 relative z-10">
                    <QuickLink name="Notion" url="https://notion.so" icon={<Compass size={20} />} />
                    <QuickLink name="Google" url="https://google.com" icon={<Search size={20} />} />
                    <QuickLink name="YouTube" url="https://youtube.com" icon={<Globe size={20} />} />
                </div>
             </div>
         )}
         
         {/* Webview Element */}
         {/* Only render if we have a URL (or render hidden, but start page handles 'no url' state) */}
         <webview 
             ref={webviewRef}
             src={data.url}
             // @ts-ignore
             allowpopups="true" 
             className={`w-full h-full ${!data.url ? 'hidden' : ''}`}
             style={{ display: 'inline-flex', width: '100%', height: '100%' }}
         />
      </div>

      {/* Footer Status Bar - Ensures Resize Handle (bottom-right) is always accessible */}
      <div className="h-6 bg-[#18181b] border-t border-white/5 flex items-center px-3 gap-2 relative z-20 shrink-0">
         <div className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
            <div className={`w-1.5 h-1.5 rounded-full ${data.url.startsWith('https') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[10px] text-white/50 font-medium">
                {data.url.startsWith('https') ? 'Secure' : 'Not Secure'}
            </span>
         </div>

         <div className="flex-1" />

         {/* Spacer for Resize Handle */}
         <div className="w-4" />
      </div>
    </div>
  );
};
