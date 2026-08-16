export const WALLPAPERS = [
  '/wallpapers/lofi_cat.jpeg',
  '/wallpapers/lofi_fireplace.jpeg',
  '/wallpapers/sunset_landscape.png',
];

export const SOLID_COLORS = [
  '#1e1e24', // charcoal
  '#12131a', // ink
  '#232135', // plum
  '#1a2420', // moss
  '#f1f5f9', // mist
  '#fdf6e3', // sand
];

/** Text on a light background needs dark ink; used to flip the shell's chrome. */
export function isLightBackground(value: string) {
  return value === '#f1f5f9' || value === '#fdf6e3';
}
