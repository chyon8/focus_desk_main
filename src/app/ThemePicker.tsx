import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, CloudRain, Flame, Snowflake, Sparkles, Upload, type LucideIcon } from 'lucide-react';
import { assetUrl, SOLID_COLORS } from '../spaces/backgrounds';
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

const BASE_THEMES = ['swiss', 'rainy-night', 'snowfall'].map(getTheme);

/** A theme-owned picture appears in the picker once, but still selects its theme. */
const THEME_FOR_WALLPAPER = new Map(
  THEMES.flatMap((theme) =>
    theme.scene.kind === 'image' ? [[theme.scene.src, theme.id] as const] : [],
  ),
);

/** The first row follows the order chosen for the wallpaper picker. */
const WALLPAPER_HEAD = [
  'midnight-observatory.webp',
  'quiet-snow.webp',
  'geometric-relief.png',
  'summer-meadow.webp',
  'anime-coastal-platform.png',
];

/** Keep quieter secondary scenes at the end, in the order chosen for the picker. */
const WALLPAPER_TAIL = [
  'anime-maple-veranda.png',
  'ghibli-night-tram.png',
  'ghibli-old-cinema.png',
  'amber-lake.webp',
  'afternoon-records.webp',
];

function orderedWallpapers(urls: string[]): string[] {
  return [...new Set(urls)].sort((a, b) => {
    const aHeadRank = WALLPAPER_HEAD.findIndex((name) => a.endsWith(`/${name}`));
    const bHeadRank = WALLPAPER_HEAD.findIndex((name) => b.endsWith(`/${name}`));
    if (aHeadRank !== -1 || bHeadRank !== -1) {
      if (aHeadRank === -1) return 1;
      if (bHeadRank === -1) return -1;
      return aHeadRank - bHeadRank;
    }
    const aRank = WALLPAPER_TAIL.findIndex((name) => a.endsWith(`/${name}`));
    const bRank = WALLPAPER_TAIL.findIndex((name) => b.endsWith(`/${name}`));
    if (aRank === -1 && bRank === -1) return 0;
    if (aRank === -1) return -1;
    if (bRank === -1) return 1;
    return aRank - bRank;
  });
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="t-soft text-micro font-semibold uppercase tracking-[0.14em] mb-2">{children}</div>
);

function wallpaperName(url: string): string {
  const filename = url.split('/').pop() ?? url;
  let name = filename;
  try { name = decodeURIComponent(filename); } catch { /* Keep malformed filenames readable. */ }
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const ThemePicker: React.FC = () => {
  const isOpen = useUiStore((s) => s.openDock === 'atmosphere');
  const setTheme = useSpaceStore((s) => s.setTheme);
  const setBackground = useSpaceStore((s) => s.setBackground);
  const setParticles = useSpaceStore((s) => s.setParticles);
  const themeId = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.themeId);
  const override = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.background);
  const particlesChoice = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.particles);
  const polarity = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.polarity);
  const patternChoice = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.pattern);
  const setPattern = useSpaceStore((s) => s.setPattern);
  const theme = getTheme(themeId);
  // Auto 버튼이 "배경이 무엇으로 읽히는지"를 써야 하므로, 지금 쓰는 값이 아니라
  // 뒤집기 전의 값을 읽는다. 뒤집어 놓고 보면 Auto가 무엇으로 돌아갈지가 궁금하다.
  const { autoLight } = useGround(theme);
  const setPolarity = useSpaceStore((s) => s.setPolarity);
  const fileInput = useRef<HTMLInputElement>(null);
  // null while the folder is being read, so the empty state is not shown to
  // somebody who does have pictures (DESIGN.md 6장).
  const [wallpapers, setWallpapers] = useState<string[] | null>(null);
  const isMaximized = useUiStore((s) => s.maximizedWidgetId !== null);

  // Re-read the folder every time the panel opens, so a picture dropped in
  // while the app is running is there the moment you look for it.
  useEffect(() => {
    if (!isOpen) return;
    setWallpapers(null);
    void window.images?.wallpapers().then(setWallpapers);
  }, [isOpen]);

  const uploadWallpaper = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = await window.images?.save(await file.arrayBuffer(), file.name);
    if (url) setBackground({ type: 'IMAGE', value: url });
  };

  // What is actually falling right now: the space's own choice, or the theme's.
  const weather: ParticlesChoice = particlesChoice ??
    theme.particles ?? { kind: 'none', density: DEFAULT_DENSITY };

  // 무늬는 단색 위에만 얹힌다 — SceneLayer가 거는 조건과 같다.
  const onSolid = override ? override.type === 'COLOR' : theme.scene.kind === 'color';
  const pattern = patternChoice ?? (theme.flat ? 'grid' : 'none');

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
            <Label>Background</Label>
            {/* Plain and weather-backed choices stay compact. Pictures get the
                width they need below, while all of them remain one setting. */}
            <div className="grid grid-cols-3 gap-2">
              {BASE_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  aria-label={theme.name}
                  aria-pressed={themeId === theme.id && !override}
                  className="press group rounded-control overflow-hidden text-left transition-transform hover:scale-[1.04]"
                  style={ring(themeId === theme.id && !override)}
                >
                  <div className="aspect-video w-full flex items-center justify-center" style={thumbStyle(theme.scene)}>
                    {theme.flat && <span style={{
                      fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", sans-serif',
                      fontSize: 20, fontWeight: 900,
                      color: theme.tokens.ink, letterSpacing: '-0.02em',
                    }}>Aa 가</span>}
                  </div>
                  <div
                    className="t-ink truncate px-1 py-0.5 text-micro font-medium"
                    style={{ background: 'color-mix(in srgb, var(--surface) 80%, transparent)' }}
                  >
                    {theme.name}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-hair mt-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                {/* 읽는 동안은 들어올 타일 모양으로 자리를 잡아둔다. 다 읽고 나면
                    같은 자리에 사진이 앉으므로 격자가 안 튄다. */}
                {wallpapers === null
                  ? [0, 1, 2, 3].map((i) => (
                      <div key={i} className="overflow-hidden rounded-control">
                        <div className="skeleton aspect-video" />
                        <div className="skeleton mt-1 h-7" />
                      </div>
                    ))
                  : orderedWallpapers(wallpapers).map((url) => {
                      const ownerThemeId = THEME_FOR_WALLPAPER.get(url);
                      const selected = override?.type === 'IMAGE' && override.value === url ||
                        ownerThemeId === themeId && !override;
                      return (
                        <button
                          key={url}
                          title={wallpaperName(url)}
                          aria-label={wallpaperName(url)}
                          aria-pressed={selected}
                          onClick={() =>
                            ownerThemeId
                              ? setTheme(ownerThemeId)
                              : setBackground({ type: 'IMAGE', value: url })
                          }
                          className="press overflow-hidden rounded-control text-left transition-transform hover:scale-[1.03]"
                          style={ring(selected)}
                        >
                          <div
                            className="aspect-video bg-cover bg-center"
                            style={{ backgroundImage: `url(${assetUrl(url)})` }}
                          />
                          <span
                            className="t-ink block h-7 overflow-hidden px-1 py-0.5 text-micro leading-[12px]"
                            style={{
                              background: 'var(--surface)',
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                            }}
                          >
                            {wallpaperName(url)}
                          </span>
                        </button>
                      );
                    })}
                {wallpapers !== null && (
                  <button
                    onClick={() => fileInput.current?.click()}
                    title="Use your own image"
                    className="press border-hair t-soft overflow-hidden rounded-control border border-dashed text-center transition-colors"
                  >
                    <span className="flex aspect-video items-center justify-center">
                      <Upload size={16} />
                    </span>
                    <span className="block h-7 px-1 py-0.5 text-micro leading-[12px]">
                      Add image
                    </span>
                  </button>
                )}
              </div>
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

            {/* 단색은 전부 여기다. Minimal 테마를 카드로 따로 두었더니 같은 일(배경을
                이 색으로)을 하는 목록이 둘로 나뉘어 있었다.

                네 열 두 줄이다 — 한 열이 한 색 계열, 윗줄이 어두운 쪽, 아랫줄이 같은
                계열의 밝은 짝이다. `SOLID_COLORS`가 그 순서로 들고 있다. */}
            <div className="mt-3 mb-6">
              <div className="grid grid-cols-4 gap-2">
                {SOLID_COLORS.map(({ value, name }) => (
                  <button
                    key={value}
                    onClick={() => setBackground({ type: 'COLOR', value })}
                    title={name}
                    aria-label={name}
                    aria-pressed={override?.value === value}
                    className="press overflow-hidden rounded-control text-left transition-transform hover:scale-[1.06]"
                    style={ring(override?.value === value)}
                  >
                    <span className="border-hair block aspect-square border" style={{ backgroundColor: value }} />
                    <span className="t-ink block truncate px-1 py-0.5 text-micro" style={{ background: 'var(--surface)' }}>
                      {name}
                    </span>
                  </button>
                ))}
              </div>

              {/* 격자는 단색 위에만 깐다. 사진 위에서는 얼룩으로 보여서 고를 수 있게
                  두지 않는다 — 그래서 배경이 단색일 때만 이 줄이 나온다. */}
              {onSolid && (
                <div className="mt-2 flex items-center gap-1">
                  {([
                    ['none', 'Plain'],
                    ['grid', 'Grid'],
                  ] as const).map(([kind, label]) => (
                    <button
                      key={kind}
                      onClick={() => setPattern(kind)}
                      className={`chrome-button flex-1 h-9 flex items-center justify-center rounded-control text-meta ${
                        pattern === kind ? 'chrome-button-on' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
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
            <div className="flex items-center gap-3 mb-6 px-0.5">
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
                {weather.kind === 'none' ? 'off' : Math.round(weather.density * 100)}
              </span>
            </div>

            {/* 배경을 고르면 UI 밝기는 따라온다 — 사진이면 평균 색에서, 단색이면
                그 색에서. 그래서 기본은 Auto이고, Auto가 무엇으로 읽었는지를 버튼에
                써 둔다. 밝은 하늘 + 어두운 지면 같은 사진에서만 손으로 뒤집는다. */}
            <div className="border-hair mt-6 pt-4 border-t">
              <Label>UI brightness</Label>
              {/* 기본은 배경에 맞추는 것이고, 그게 무엇으로 읽혔는지를 버튼에 쓴다.
                  한 줄에 셋을 넣으면 이 문장이 안 들어가서 두 줄로 나눴다. */}
              <button
                onClick={() => setPolarity(null)}
                className={`chrome-button w-full h-9 flex items-center justify-center gap-1.5 mb-1 rounded-control text-meta ${
                  polarity == null ? 'chrome-button-on' : ''
                }`}
              >
                Match the background
                <span className="t-faint">({autoLight ? 'light' : 'dark'})</span>
              </button>
              <div className="flex items-center gap-1">
                {(['light', 'dark'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setPolarity(value)}
                    className={`chrome-button flex-1 h-9 flex items-center justify-center rounded-control text-meta capitalize ${
                      polarity === value ? 'chrome-button-on' : ''
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="t-faint mt-2 px-0.5 text-micro leading-snug">
                Set it by hand only when a picture is read the wrong way.
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
