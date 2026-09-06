import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, CloudRain, Flame, Snowflake, Sparkles, Upload, type LucideIcon } from 'lucide-react';
import { assetUrl, MINIMAL_THEMES, SOLID_COLORS } from '../spaces/backgrounds';
import type { ParticlesChoice } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { RAIL_TOP, RAIL_WIDTH, useUiStore } from '../stores/uiStore';
import { getTheme, THEMES } from '../themes/themes';
import { useGround } from '../themes/useTheme';
import type { SceneSpec } from '../themes/types';

function thumbStyle(scene: SceneSpec): React.CSSProperties {
  switch (scene.kind) {
    case 'image':
      return {
        backgroundImage: `url(${assetUrl(scene.src)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    case 'gradient':
      return { backgroundImage: scene.value };
    case 'color':
      return { backgroundColor: scene.value };
  }
}

/** The weather a space can be given, independent of its theme (D-066). */
const WEATHER: { kind: ParticlesChoice['kind']; label: string; icon: LucideIcon }[] = [
  { kind: 'none', label: 'Clear', icon: Ban },
  { kind: 'rain', label: 'Rain', icon: CloudRain },
  { kind: 'snow', label: 'Snow', icon: Snowflake },
  { kind: 'embers', label: 'Embers', icon: Flame },
  { kind: 'dust', label: 'Dust', icon: Sparkles },
];

// What a kind starts at when the space has no density of its own to carry over.
const DEFAULT_DENSITY = 0.4;

/**
 * 단색 배경 전부. `SOLID_COLORS`는 배경색 하나만, `MINIMAL_THEMES`는 글자·테두리까지
 * 들고 오지만 누르는 쪽에서는 둘 다 "배경을 이 색으로"라 한 줄이다. 같은 색이 두 번
 * 나오지 않게 값으로 거른다.
 */
const SOLID_SWATCHES: { value: string; label: string }[] = [
  ...SOLID_COLORS.map((value) => ({ value, label: value })),
  ...MINIMAL_THEMES.map((t) => ({ value: t.bg, label: t.name })),
].filter((swatch, i, all) => all.findIndex((o) => o.value.toLowerCase() === swatch.value.toLowerCase()) === i);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="t-soft text-micro font-semibold uppercase tracking-[0.14em] mb-2">{children}</div>
);

export const ThemePicker: React.FC = () => {
  const isOpen = useUiStore((s) => s.openDock === 'atmosphere');
  const setTheme = useSpaceStore((s) => s.setTheme);
  const setBackground = useSpaceStore((s) => s.setBackground);
  const setParticles = useSpaceStore((s) => s.setParticles);
  const themeId = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.themeId);
  const override = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const particlesChoice = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.particles);
  const polarity = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.polarity);
  // Auto 버튼이 "배경이 무엇으로 읽히는지"를 써야 하므로, 지금 쓰는 값이 아니라
  // 뒤집기 전의 값을 읽는다. 뒤집어 놓고 보면 Auto가 무엇으로 돌아갈지가 궁금하다.
  const { autoLight } = useGround(getTheme(themeId));
  const setPolarity = useSpaceStore((s) => s.setPolarity);
  const fileInput = useRef<HTMLInputElement>(null);
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const isMaximized = useUiStore((s) => s.maximizedWidgetId !== null);

  // Re-read the folder every time the panel opens, so a picture dropped in
  // while the app is running is there the moment you look for it.
  useEffect(() => {
    if (isOpen) void window.images?.wallpapers().then(setWallpapers);
  }, [isOpen]);

  const uploadWallpaper = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (url) setBackground({ type: 'IMAGE', value: url });
  };

  // What is actually falling right now: the space's own choice, or the theme's.
  const weather: ParticlesChoice = particlesChoice ??
    getTheme(themeId).particles ?? { kind: 'none', density: DEFAULT_DENSITY };

  // A selected card gets a ring in the theme's own accent colour.
  const ring = (selected: boolean) =>
    selected ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined;

  return (
    /* 배경과 소리를 합친 패널 하나. 입구도 하나 — 레일의 Atmosphere 버튼이다.
       우상단에 소리·팔레트 원형 버튼 두 개가 따로 떠 있어서 같은 설정 묶음의
       입구가 세 군데였다.

       최대화 중에는 레일이 가려지므로 위젯 헤더의 버튼이 입구이고, 패널은 그
       헤더 아래에 붙는다. */
    <div
      className={`fixed z-50 ${isMaximized ? 'top-10 right-3' : ''}`}
      style={isMaximized ? undefined : { left: RAIL_WIDTH, top: RAIL_TOP }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: isMaximized ? 0 : -8, y: isMaximized ? -8 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isMaximized ? 0 : -8, y: isMaximized ? -8 : 0 }}
            className={`glass-panel absolute w-72 max-h-[calc(100vh-7rem)] overflow-y-auto p-4 rounded-surface ${
              isMaximized ? 'right-0 mt-2' : 'left-0 top-0'
            }`}
          >
            <Label>Theme</Label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className="group rounded-control overflow-hidden text-left transition-transform hover:scale-[1.03]"
                  style={ring(themeId === theme.id && !override)}
                >
                  <div className="aspect-[4/3] w-full" style={thumbStyle(theme.scene)} />
                  <div
                    className="t-ink px-2 py-1.5 text-meta font-medium"
                    style={{ background: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
                  >
                    {theme.name}
                  </div>
                </button>
              ))}
            </div>

            <Label>Weather</Label>
            <div className="flex items-center gap-1 mb-2">
              {WEATHER.map(({ kind, label, icon: Icon }) => (
                <button
                  key={kind}
                  onClick={() =>
                    setParticles({
                      kind,
                      // Keep the strength you already had when only swapping kind.
                      density: weather.kind === 'none' ? DEFAULT_DENSITY : weather.density,
                    })
                  }
                  title={label}
                  className={`chrome-button flex-1 h-9 flex items-center justify-center rounded-control ${
                    weather.kind === kind ? 'chrome-button-on' : ''
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-5 px-0.5">
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(weather.density * 100)}
                disabled={weather.kind === 'none'}
                onChange={(e) =>
                  setParticles({ kind: weather.kind, density: Number(e.target.value) / 100 })
                }
                title="How much of it"
                className="ambience-slider flex-1 h-1 rounded-control appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-default"
              />
              <span className="t-faint w-7 text-right text-micro tabular-nums">
                {weather.kind === 'none' ? '—' : Math.round(weather.density * 100)}
              </span>
            </div>

            <Label>My wallpaper</Label>
            <div className="grid grid-cols-3 gap-2 mb-4 max-h-40 overflow-y-auto pr-1">
              {wallpapers.map((url) => (
                <button
                  key={url}
                  onClick={() => setBackground({ type: 'IMAGE', value: url })}
                  className="aspect-video rounded-control bg-cover bg-center transition-transform hover:scale-[1.06]"
                  style={{ backgroundImage: `url(${assetUrl(url)})`, ...ring(override?.value === url) }}
                />
              ))}
              <button
                onClick={() => fileInput.current?.click()}
                title="Use your own image"
                className="border-hair t-soft aspect-video rounded-control border border-dashed flex items-center justify-center transition-colors"
              >
                <Upload size={13} />
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadWallpaper(file);
              }}
            />

            {/* 단색은 전부 여기 한 줄이다. Minimal 테마를 카드로 따로 두었더니
                같은 일(배경을 이 색으로)을 하는 목록이 둘로 나뉘어 있었다.
                Minimal은 글자·테두리 색까지 들고 오는데, 그건 고르면 화면이
                말해준다 — 이름표와 점 두 개가 할 일이 아니다. */}
            <Label>Colours</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {SOLID_SWATCHES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setBackground({ type: 'COLOR', value })}
                  title={label}
                  aria-label={label}
                  className="border-hair aspect-square rounded-control border transition-transform hover:scale-[1.12] active:scale-95"
                  style={{ backgroundColor: value, ...ring(override?.value === value) }}
                />
              ))}
            </div>

            {/* 배경을 고르면 UI 밝기는 따라온다 — 사진이면 평균 색에서, 단색이면
                그 색에서. 그래서 기본은 Auto이고, Auto가 무엇으로 읽었는지를 버튼에
                써 둔다. 밝은 하늘 + 어두운 지면 같은 사진에서만 손으로 뒤집는다. */}
            <div className="border-hair mt-5 pt-4 border-t">
              <Label>UI on this background</Label>
              <div className="flex items-center gap-1">
                {(
                  [
                    { value: null, label: `Auto (${autoLight ? 'light' : 'dark'})` },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={label}
                    onClick={() => setPolarity(value)}
                    className={`chrome-button flex-1 h-9 flex items-center justify-center rounded-control text-meta ${
                      (polarity ?? null) === value ? 'chrome-button-on' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="t-faint mt-2 px-0.5 text-micro leading-snug">
                The background decides this. Change it only when a picture is read the wrong way.
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
