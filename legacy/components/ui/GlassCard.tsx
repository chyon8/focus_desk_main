import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, style }) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        bg-black/40 backdrop-blur-xl 
        border border-white/10 
        shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
        rounded-2xl
        text-white
        ${className}
      `}
    >
      {children}
    </div>
  );
};