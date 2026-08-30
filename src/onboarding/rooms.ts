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
 * The five. Three are the themes' own scenes; two borrow a palette and bring a
 * wallpaper.
 *
 * Left out: the cosy-room pictures, which read as stock art next to the drawn
 * scenes, and `loficafe.jpg`, which has "© 2020 Lo-Fi Geek. All rights reserved"
 * printed into the image itself. **No wallpaper here has a licence anybody has
 * checked** — see STATUS.
 */
const SPECS: RoomSpec[] = [
  {
    id: 'meadow',
    name: 'Meadow',
    themeId: 'golden-hour',
    background: '/wallpapers/ghibli.jpg',
    ambience: { ...silent, cafe: 26 },
    hours: [6, 15],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    themeId: 'golden-hour',
    background: null,
    ambience: { ...silent, cafe: 32 },
    hours: [15, 20],
  },
  {
    id: 'rainy-night',
    name: 'Rainy Night',
    themeId: 'rainy-night',
    background: null,
    ambience: { ...silent, rain: 46 },
    hours: [19, 24],
  },
  {
    id: 'cabin',
    name: 'Cabin',
    themeId: 'snowfall',
    background: '/wallpapers/winterhut.jpg',
    ambience: { ...silent, fire: 42 },
    hours: [20, 24],
  },
  {
    id: 'snowfall',
    name: 'Snowfall',
    themeId: 'snowfall',
    background: null,
    ambience: { ...silent, fire: 24 },
    hours: [21, 24],
  },
];

export const ROOMS: Room[] = SPECS.map((spec) => ({
  ...spec,
  theme: getTheme(spec.themeId),
}));

/**
 * The rooms with the one that suits the hour first.
 *
 * Nobody is asked what time it is — the app already knows, and opening on a
 * lit cabin at eleven at night is the kind of thing a person notices without
 * being able to say why.
 *
 * Among the rooms that suit the hour, a painted one comes before a gradient: the
 * first card is shown wide, and a wide empty gradient is a worse first thing to
 * see than a small one.
 */
export function roomsForHour(hour: number): Room[] {
  const suits = (room: Room) => hour >= room.hours[0] && hour < room.hours[1];
  const rank = (room: Room) => Number(suits(room)) * 2 + Number(!!room.background);
  return [...ROOMS].sort((a, b) => rank(b) - rank(a));
}

/** The line above the rooms, which is different at eleven at night. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Still up.';
  if (hour < 11) return 'Morning.';
  if (hour < 17) return 'Afternoon.';
  if (hour < 21) return 'Evening.';
  return 'Late one.';
}
