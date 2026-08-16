
import React from 'react';

interface Props {
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'COLOR';
  dimmed: boolean;
}

export const BackgroundLayer: React.FC<Props> = ({ url, type, dimmed }) => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black transition-all duration-700">
      
      {/* Image Mode */}
      {type === 'IMAGE' && (
        <img
          key={url}
          src={url}
          alt="background"
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out transform scale-105`}
          onError={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        />
      )}

      {/* Color Mode - Arc Aesthetic (Solid color with subtle noise) */}
      {type === 'COLOR' && (
        <div 
            className="w-full h-full transition-colors duration-700 relative"
            style={{ backgroundColor: url }}
        >
            {/* Subtle top-down gradient to give depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/20 pointer-events-none mix-blend-overlay" />
            
            {/* Grain Texture - Essential for that premium Arc feel */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
        </div>
      )}
      
      {/* Dim Overlay (Focus Mode) */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-700 pointer-events-none ${
          dimmed ? 'opacity-70' : 'opacity-0'
        }`} 
      />
    </div>
  );
};
