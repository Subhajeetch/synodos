const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const DEFAULT_ZOOM = 1;

let zoom = DEFAULT_ZOOM;
const listeners = new Set<() => void>();

export function clampZoom(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function getZoom() {
  return zoom;
}

export function setZoom(nextZoom: number) {
  const clamped = clampZoom(nextZoom);
  if (clamped === zoom) return zoom;
  zoom = clamped;
  listeners.forEach((listener) => listener());
  return zoom;
}

export function subscribeZoom(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function zoomToPercent(value: number) {
  return Math.round(clampZoom(value) * 100);
}

export function percentToZoom(value: number) {
  return clampZoom(value / 100);
}

export function logSliderToZoom(value: number, min = 0.25, max = 3) {
  const safeMin = Math.max(min, Number.EPSILON);
  const safeMax = Math.max(safeMin, max);
  const t = Math.min(1, Math.max(0, value));
  return Math.exp(
    Math.log(safeMin) + t * (Math.log(safeMax) - Math.log(safeMin)),
  );
}

export function zoomToLogSlider(value: number, min = 0.25, max = 3) {
  const safeMin = Math.max(min, Number.EPSILON);
  const safeMax = Math.max(safeMin, max);
  const clamped = clampZoom(value);
  if (safeMin === safeMax) return 0;
  const ratio =
    (Math.log(clamped) - Math.log(safeMin)) /
    (Math.log(safeMax) - Math.log(safeMin));
  return ratio;
}
