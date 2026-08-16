
import React, { useRef, useState, useEffect } from 'react';
import { YoutubeMusicWidgetData } from '../../types';
import { X, Minimize2, Maximize2, RotateCw, ArrowLeft, ArrowRight, Music, Home } from 'lucide-react';

interface Props {
  data: YoutubeMusicWidgetData;
  updateWidget: (id: string, updates: Partial<YoutubeMusicWidgetData>) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  removeWidget?: () => void;
  isCovered?: boolean;
}

export const YoutubeMusicWidget: React.FC<Props> = ({ data, updateWidget, isMaximized, onToggleMaximize, removeWidget, isCovered }) => {
  const webviewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Custom CSS to inject for a cleaner "App-like" look
  const customCss = `
    /* Hide scrollbars */
    ::-webkit-scrollbar {
      width: 0px;
      background: transparent;
    }
    
    /* Hide top bar in some views if needed, though usually YT Music header is fine */
    /* ytmusic-nav-bar { display: none !important; } */

    /* Ensure dark mode background */
    body {
        background-color: #000 !important;
    }
  `;

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      webview.insertCSS(customCss);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handleDidNavigate = () => {
       setCanGoBack(webview.canGoBack());
       setCanGoForward(webview.canGoForward());
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
    };
  }, []);

  const handleControl = (action: 'back' | 'forward' | 'reload' | 'home') => {
      const webview = webviewRef.current;
      if (!webview) return;
      
      switch (action) {
        case 'back': if (webview.canGoBack()) webview.goBack(); break;
        case 'forward': if (webview.canGoForward()) webview.goForward(); break;
        case 'reload': webview.reload(); break;
        case 'home': webview.loadURL('https://music.youtube.com'); break;
      }
  };

  return (
    <div className="h-full w-full flex flex-col bg-black overflow-hidden relative group">
      {/* Header Bar - Auto hides when maximized to give full immersive feel, or stays for control */}
      <div className={`flex items-center gap-2 p-2 border-b border-white/5 bg-black/40 backdrop-blur-md relative z-10 drag-handle transition-all duration-300 ${isMaximized ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        
        <div className="flex items-center gap-1.5 mr-2">
             <button 
                onClick={(e) => { e.stopPropagation(); removeWidget?.(); }} 
                className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center group/btn"
             >
                <X size={8} className="text-black/50 opacity-0 group-hover/btn:opacity-100" />
             </button>
             <button 
                onClick={(e) => { e.stopPropagation(); onToggleMaximize?.(); }} 
                className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors flex items-center justify-center group/btn"
             >
                <Minimize2 size={8} className="text-black/50 opacity-0 group-hover/btn:opacity-100" />
             </button>
             <button 
                onClick={(e) => { e.stopPropagation(); onToggleMaximize?.(); }}
                className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors flex items-center justify-center group/btn"
             >
                <Maximize2 size={8} className="text-black/50 opacity-0 group-hover/btn:opacity-100" />
             </button>
        </div>

        <div className="flex items-center gap-1">
             <button 
                onClick={() => handleControl('home')} 
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Google Home"
             >
                <Home size={14} />
             </button>
             <div className="w-px h-3 bg-white/10 mx-1" />
             <button 
                onClick={() => handleControl('back')} 
                disabled={!canGoBack}
                className={`p-1.5 rounded-lg transition-colors ${canGoBack ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-white/10 cursor-not-allowed'}`}
             >
                <ArrowLeft size={14} />
             </button>
             <button 
                onClick={() => handleControl('forward')} 
                disabled={!canGoForward}
                className={`p-1.5 rounded-lg transition-colors ${canGoForward ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-white/10 cursor-not-allowed'}`}
             >
                <ArrowRight size={14} />
             </button>
             <button 
                onClick={() => handleControl('reload')} 
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
             >
                <RotateCw size={12} />
             </button>
        </div>

        <div className="flex-1 flex justify-center items-center pointer-events-none">
             <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                <Music size={10} className="text-red-500" />
                <span className="text-[10px] font-medium text-white/50">YouTube Music</span>
             </div>
        </div>
        
        {/* Spacer for balance */}
        <div className="w-20" />
      </div>

      <div className="flex-1 relative bg-black w-full h-full">
         <webview 
             ref={webviewRef}
             src="https://music.youtube.com"
             // @ts-ignore
             allowpopups="true" 
             // Important: Persist partition to save login state
             partition="persist:youtube-music"
             className="w-full h-full"
             style={{ display: 'inline-flex', width: '100%', height: '100%' }}
         />
      </div>
    </div>
  );
};
