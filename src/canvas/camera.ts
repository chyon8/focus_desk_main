// ZUI camera math. Widgets live in world coordinates; the camera maps them to screen.
// Render contract: world container gets `translate(-x*zoom, -y*zoom) scale(zoom)`.

export interface Camera {
  x: number; // world coordinate at screen origin (top-left)
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function worldToScreen(cam: Camera, p: Point): Point {
  return { x: (p.x - cam.x) * cam.zoom, y: (p.y - cam.y) * cam.zoom };
}

export function screenToWorld(cam: Camera, p: Point): Point {
  return { x: p.x / cam.zoom + cam.x, y: p.y / cam.zoom + cam.y };
}

export function panCamera(cam: Camera, dxScreen: number, dyScreen: number): Camera {
  return { ...cam, x: cam.x - dxScreen / cam.zoom, y: cam.y - dyScreen / cam.zoom };
}

// Zoom keeping the given screen point fixed (zoom-to-cursor).
export function zoomCameraAt(cam: Camera, screenPoint: Point, nextZoom: number): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  const before = screenToWorld(cam, screenPoint);
  const next = { ...cam, zoom };
  const after = screenToWorld(next, screenPoint);
  return { ...next, x: next.x + before.x - after.x, y: next.y + before.y - after.y };
}
