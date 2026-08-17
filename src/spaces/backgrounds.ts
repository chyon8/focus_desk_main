/**
 * Bundled wallpapers are stored as `/wallpapers/…`, but the packaged app loads
 * from `file://`, where a leading slash means the root of the disk. Addressing
 * them relative to the document works in both the dev server and the build.
 */
export function assetUrl(src: string) {
  return src.startsWith('/') ? `.${src}` : src;
}

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
