import { getTheme } from '../themes/themes';
import type { Theme } from '../themes/types';
import type { AmbienceLevels } from '../ambience/engine';

/**
 * The rooms offered on the first run (D-097).
 *
 * Picking one is the first thing the app asks, because it is the app: a space is
 * somewhere you are, and six scenes say that faster than a sentence about
 * workspaces. It settles the wallpaper and the sound in the same tap, and the
 * choice is the user's rather than a default they inherit.
 *
 * A room is a theme for its colours plus, sometimes, a wallpaper of its own —
 * the same two settings a space already carries separately, so nothing here is a
 * special case the rest of the app has to know about.
 */
export interface Room {
  id: string;
  name: string;
  /** Where the palette comes from. */
  theme: Theme;
  /** A wallpaper over the theme's own scene, or null to use the theme's. */
  background: string | null;
  /** Quiet: it plays the moment the room is picked. */
  ambience: AmbienceLevels;
  /** The hours it suits, for putting the likely one first. */
  hours: [number, number];
}

const silent = { rain: 0, fire: 0, cafe: 0 };

/**
 * Levels are quiet by the time they reach the speakers — the engine maps them to
 * `level / 100 * 0.25` — so anything under about 30 is not a soft room, it is a
 * room somebody will call broken. Every room gets something audible.
 */

interface RoomSpec {
  id: string;
  name: string;
  themeId: string;
  background: string | null;
  ambience: AmbienceLevels;
  hours: [number, number];
}

/**
 * The five. One uses its theme's own scene; four borrow a palette and bring a
 * wallpaper.
 */
const SPECS: RoomSpec[] = [
  {
    id: 'snowfall',
    name: 'Snowfall',
    themeId: 'snowfall',
    background: null,
    ambience: { ...silent, fire: 24 },
    hours: [21, 24],
  },
  {
    id: 'midnight-observatory',
    name: 'Midnight Observatory',
    themeId: 'golden-hour',
    background: '/wallpapers/midnight-observatory.webp',
    ambience: { ...silent },
    hours: [19, 24],
  },
  {
    id: 'meadow',
    name: 'Meadow',
    themeId: 'golden-hour',
    background: '/wallpapers/summer-meadow.webp',
    ambience: { ...silent, cafe: 26 },
    hours: [6, 15],
  },
  {
    id: 'rainy-attic',
    name: 'Rainy Attic',
    themeId: 'rainy-night',
    background: '/wallpapers/rainy-attic.webp',
    ambience: { ...silent, rain: 46 },
    hours: [18, 24],
  },
  {
    id: 'quiet-snow',
    name: 'Quiet Snow',
    themeId: 'snowfall',
    background: '/wallpapers/quiet-snow.webp',
    ambience: { ...silent },
    hours: [6, 12],
  },
];

export const ROOMS: Room[] = SPECS.map((spec) => ({
  ...spec,
  theme: getTheme(spec.themeId),
}));

/** The onboarding order stays fixed; only the greeting changes with the hour. */
export function roomsForHour(_hour: number): Room[] {
  return [...ROOMS];
}

/** The line above the rooms, which is different at eleven at night. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Still up.';
  if (hour < 11) return 'Morning.';
  if (hour < 17) return 'Afternoon.';
  if (hour < 21) return 'Evening.';
  return 'Late one.';
}
