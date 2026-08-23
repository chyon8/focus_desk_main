import React, { useState } from 'react';
import type { WebAppIcon } from '../spaces/types';

/**
 * A web app's icon, at whatever size the caller needs: on its tile, in the
 * picker, in the sidebar palette.
 *
 * A favicon that fails to load falls back to the first letter rather than a
 * broken image — sites move their icons, and a tile should stay recognisable
 * offline.
 */
export const WebAppMark: React.FC<{
  icon: WebAppIcon | null;
  name: string;
  size: number;
  className?: string;
}> = ({ icon, name, size, className = '' }) => {
  const [broken, setBroken] = useState(false);

  if (icon?.kind === 'emoji') {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.82 }}
      >
        {icon.char}
      </span>
    );
  }

  if (icon?.kind === 'image' && !broken) {
    return (
      <img
        src={icon.src}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
        className={`object-contain rounded-[22%] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`glass t-ink inline-flex items-center justify-center rounded-[22%] uppercase ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {name.trim()[0] ?? '?'}
    </span>
  );
};
