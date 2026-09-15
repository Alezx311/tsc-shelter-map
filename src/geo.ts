/** Great-circle distance to every segment, including its interior. WGS84 lon/lat input. */
export type Coord = [number, number];
const R = 6371008.8;
const rad = Math.PI / 180;
const clamp = (x: number) => Math.max(-1, Math.min(1, x));
export function angular(a: Coord, b: Coord) {
  const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  return 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2)));
}
function bearing(a: Coord, b: Coord) {
  const dl = (b[0] - a[0]) * rad;
  return Math.atan2(Math.sin(dl) * Math.cos(b[1] * rad), Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos(dl));
}
export function segmentDistance(p: Coord, a: Coord, b: Coord) {
  const ab = angular(a, b), ap = angular(a, p);
  if (ab < 1e-12) return ap * R;
  const angle = bearing(a, p) - bearing(a, b);
  const along = Math.atan2(Math.sin(ap) * Math.cos(angle), Math.cos(ap));
  if (along < 0 || along > ab) return Math.min(ap, angular(b, p)) * R;
  return Math.abs(Math.asin(clamp(Math.sin(ap) * Math.sin(angle)))) * R;
}
export function lineDistance(p: Coord, lines: Coord[][]) {
  let min = Infinity;
  for (const line of lines) for (let i = 1; i < line.length; i++) min = Math.min(min, segmentDistance(p, line[i - 1], line[i]));
  return min;
}
export function withinRadius(p: Coord, lines: Coord[][], radius: number) {
  return Number.isFinite(radius) && radius >= 0 && lineDistance(p, lines) <= radius + 1e-6;
}
