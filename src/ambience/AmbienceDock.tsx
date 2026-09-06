import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudRain, Coffee, Flame } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { RAIL_INSET, RAIL_TOP, RAIL_WIDTH, useUiStore } from '../stores/uiStore';
import { AmbienceEngine, AmbienceLayer, SILENT_AMBIENCE } from './engine';

/** 패널이 화면 밖으로 나가는지 재는 데만 쓴다 — 라벨 + 페이더 3개 + 여백. */
const PANEL_HEIGHT = 190;

const LAYERS: { key: AmbienceLayer; label: string; icon: typeof CloudRain }[] = [
  { key: 'rain', label: 'Rain', icon: CloudRain },
  { key: 'fire', label: 'Fire', icon: Flame },
  { key: 'cafe', label: 'Cafe', icon: Coffee },
];

/**
 * 소리를 내는 쪽. 화면에는 아무것도 안 그린다.
 *
 * 페이더는 Atmosphere 패널 안에 있고 그 패널은 닫혀 있을 때 언마운트되는데,
 * 엔진이 거기 붙어 있으면 패널을 닫는 순간 소리가 끊긴다. 그래서 엔진만 떼어
 * App에 상시로 붙여 둔다.
 */
export const AmbienceEngineHost: React.FC = () => {
  const ambience = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.ambience ?? SILENT_AMBIENCE);
  const engineRef = useRef<AmbienceEngine | null>(null);

  useEffect(() => {
    engineRef.current ??= new AmbienceEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // 활성 공간을 따라간다 — 공간을 바꾸면 소리도 바뀐다.
  useEffect(() => {
    engineRef.current?.setLevels(ambience);
  }, [ambience]);

  return null;
};

/** 페이더 세 개. 패널이 이걸 감싼다. */
const AmbienceFaders: React.FC = () => {
  const ambience = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.ambience ?? SILENT_AMBIENCE);
  const setAmbience = useSpaceStore((s) => s.setAmbience);
  const isPlaying = ambience.rain + ambience.fire + ambience.cafe > 0;

  return (
    <div className="space-y-3">
      {LAYERS.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex items-center gap-3">
          <Icon size={16} className="t-soft shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            value={ambience[key]}
            onChange={(e) => setAmbience({ ...ambience, [key]: Number(e.target.value) })}
            className="ambience-slider flex-1 h-1 rounded-control appearance-none cursor-pointer"
            title={label}
            aria-label={label}
          />
          <span className="t-faint w-7 text-right text-micro tabular-nums">{ambience[key]}</span>
        </div>
      ))}

      {isPlaying && (
        <button
          onClick={() => setAmbience({ ...SILENT_AMBIENCE })}
          className="row w-full py-1.5 rounded-control text-micro font-medium"
        >
          Silence
        </button>
      )}
    </div>
  );
};

/**
 * 소리 패널. 배경 패널과 따로 뜬다.
 *
 * 한 패널에 합쳐봤더니 배경 스와치·테마·날씨를 지나 한참 스크롤해야 페이더가
 * 나왔다. 소리는 배경을 고르는 것과 달리 쓰는 도중에 만지는 것이라 바로 닿아야 한다.
 *
 * 최대화 중에는 레일이 가려지므로 위젯 헤더의 버튼이 입구이고, 패널은 그 아래 붙는다.
 */
export const SoundPanel: React.FC = () => {
  const isOpen = useUiStore((s) => s.openDock === 'sound');
  const dockTop = useUiStore((s) => s.dockTop);
  const isMaximized = useUiStore((s) => s.maximizedWidgetId !== null);

  // 누른 버튼 옆에 선다. 레일 아래쪽 버튼이라 그대로 두면 패널이 창 밖으로 나가므로
  // 바닥에서 밀어 올린다.
  const top = Math.max(
    RAIL_TOP,
    Math.min(dockTop ?? RAIL_TOP, window.innerHeight - PANEL_HEIGHT - RAIL_INSET),
  );

  return (
    <div
      className={`fixed z-50 ${isMaximized ? 'top-10 right-3' : ''}`}
      style={isMaximized ? undefined : { left: RAIL_WIDTH, top }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: isMaximized ? 0 : -8, y: isMaximized ? -8 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isMaximized ? 0 : -8, y: isMaximized ? -8 : 0 }}
            className={`glass-panel absolute w-64 p-4 rounded-surface ${
              isMaximized ? 'right-0 mt-2' : 'left-0 top-0'
            }`}
          >
            <div className="t-soft mb-3 text-micro font-semibold uppercase tracking-[0.14em]">
              Sound
            </div>
            <AmbienceFaders />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
