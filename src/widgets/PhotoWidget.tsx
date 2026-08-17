import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { PhotoData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

export const PhotoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<PhotoData>(id);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Images are copied into the app's own folder and referenced by URL, so a
  // space document never carries megabytes of base64.
  const store = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (url) update({ url });
  };

  return (
    <div
      className="photo-paper h-full w-full flex flex-col p-3"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        const file = e.dataTransfer.files[0];
        if (file) void store(file);
      }}
    >
      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-sm transition-all"
        style={{
          background: 'color-mix(in srgb, var(--ink) 8%, transparent)',
          boxShadow: isDropTarget ? '0 0 0 2px var(--accent)' : undefined,
        }}
      >
        {data.url ? (
          <img src={data.url} alt={data.caption} className="w-full h-full object-cover" />
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="t-faint hover:opacity-70 flex flex-col items-center gap-2 transition-opacity"
          >
            <ImagePlus size={28} />
            <span className="text-xs">Drop or choose a photo</span>
          </button>
        )}
      </div>

      {/* Polaroid-style caption strip below the image. */}
      <input
        value={data.caption}
        onChange={(e) => update({ caption: e.target.value })}
        placeholder="Write a caption"
        className="field mt-3 mb-1 shrink-0 !bg-transparent text-center text-sm outline-none"
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void store(file);
        }}
      />
    </div>
  );
};
