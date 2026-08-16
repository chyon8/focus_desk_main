/**
 * A theme bundles everything that makes a space feel like a place: the backdrop,
 * the light and weather on top of it, and the colours the UI borrows from it.
 */

/**
 * The backdrop. It is a tagged union so a renderer can be swapped in per kind —
 * a 3D scene later becomes one more variant plus one more branch in SceneLayer.
 */
export type SceneSpec =
  | { kind: 'image'; src: string }
  | { kind: 'gradient'; value: string }
  | { kind: 'color'; value: string };

export type ParticleKind = 'rain' | 'snow' | 'embers' | 'dust';

/** A soft light washing over the scene — a lamp, a hearth, the moon. */
export interface Glow {
  /** Colour including its alpha; it fades to transparent at the edge of the radius. */
  color: string;
  /** Centre, 0–1 across the screen. */
  x: number;
  y: number;
  /** Radius as a fraction of the screen's larger side. */
  radius: number;
  /** Firelight jitters instead of breathing. */
  flicker?: boolean;
}

/** Everything painted between the scene and the widgets. */
export interface Atmosphere {
  /** 0–1. How much the scene is veiled so text stays readable on top of it. */
  scrim: number;
  /** The colour that veil tints toward, as `r, g, b` — warm rooms veil warm. */
  scrimTint: string;
  glow?: Glow;
  /** Slow Ken Burns push, so a photo backdrop is never quite still. */
  drift?: boolean;
}

export interface ThemeTokens {
  /** Body text. */
  ink: string;
  /** Labels and secondary text. */
  inkSoft: string;
  /** Widget glass fill. */
  panel: string;
  panelBorder: string;
  /** Selection, focus rings, active states. */
  accent: string;
  font: 'sans' | 'serif' | 'hand';
}

export interface Theme {
  id: string;
  name: string;
  /** Light themes get a gentler vignette; dark ones can take a heavy one. */
  mood: 'dark' | 'light';
  scene: SceneSpec;
  atmosphere: Atmosphere;
  /** Density is 0–1; omitted means still air. */
  particles?: { kind: ParticleKind; density: number };
  tokens: ThemeTokens;
}
