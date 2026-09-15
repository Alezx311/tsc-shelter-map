import {describe, it, expect} from 'vitest';
import {segmentDistance, withinRadius, lineDistance, type Coord} from './geo';
describe('geographic corridor', () => {
  const line: Coord[] = [[-1, 0], [1, 0]];
  const latitude500m = 500 / 6371008.8 * 180 / Math.PI;
  it('uses the middle of a long segment, not just vertices', () => expect(segmentDistance([0, latitude500m], ...line as [Coord, Coord])).toBeCloseTo(500, 5));
  it('includes boundary and inside, excludes outside', () => {
    expect(withinRadius([0, latitude500m], [line], 500)).toBe(true);
    expect(withinRadius([0, latitude500m * .99], [line], 500)).toBe(true);
    expect(withinRadius([0, latitude500m * 1.01], [line], 500)).toBe(false);
  });
  it('clamps to endpoints', () => expect(segmentDistance([2, 0], [-1, 0], [1, 0])).toBeCloseTo(111195.08, 1));
  it('handles duplicate points, empty selection, zero radius', () => {
    expect(segmentDistance([30, 50], [30, 50], [30, 50])).toBe(0);
    expect(lineDistance([30, 50], [])).toBe(Infinity);
    expect(withinRadius([0, 0], [line], 0)).toBe(true);
    expect(withinRadius([0, 0], [], 500)).toBe(false);
    expect(withinRadius([0, 0], [line], NaN)).toBe(false);
  });
  it('selection changes results and repeated/reversed passes are preserved', () => {
    expect(withinRadius([0, 0], [[[4, 0], [5, 0]]], 500)).toBe(false);
    expect(withinRadius([0, 0], [line, [...line].reverse()], 500)).toBe(true);
  });
});
