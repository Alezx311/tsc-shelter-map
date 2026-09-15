import type {Feature, FeatureCollection, LineString, Point} from 'geojson';
export interface Provenance {source: string; retrievedAt: string; verification: string; notes: string}
export interface RouteProperties extends Provenance {id: string; number: number; categories: string[]; approvedAt: string; order: string; color: string; verified: boolean}
export interface ShelterProperties extends Provenance {id: string; ref: string; name: string; address: string; settlement: string; kind: string | null; premises: string | null; operator: string | null; sourceName: string; coordinateAccuracy: string; entranceVerified: boolean; access: string | null; accessible: boolean | null; capacity: number | null}
export const SHELTER_COVERAGE_METRES = 2000;
/** Purpose-built civil-protection structures, as opposed to the simplest shelters (basements, parkings, passages). */
export const isProtective = (p: ShelterProperties) => !!p.kind && !/^Найпростіше укриття$/.test(p.kind);
export type Route = Feature<LineString, RouteProperties>;
export type Shelter = Feature<Point, ShelterProperties>;
export interface Dataset {routes: Route[]; shelters: Shelter[]}
function validCoord(p: unknown): boolean {return Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= -180 && p[0] <= 180 && p[1] >= -90 && p[1] <= 90;}
export function validateCollection(value: unknown, kind: 'routes' | 'shelters') {
  const c = value as FeatureCollection;
  if (c?.type !== 'FeatureCollection' || !Array.isArray(c.features)) throw new Error(`Некоректний GeoJSON: ${kind}`);
  const ids = new Set<string>();
  for (const f of c.features) {
    const p = f.properties;
    if (f.type !== 'Feature' || !p || typeof p.id !== 'string' || ids.has(p.id) || !p.source || !p.retrievedAt || !p.verification) throw new Error(`Відсутні метадані або повторний ID: ${kind}`);
    ids.add(p.id);
    if (kind === 'routes') {
      if (f.geometry?.type !== 'LineString' || f.geometry.coordinates.length < 2 || !f.geometry.coordinates.every(validCoord) || !Array.isArray(p.categories) || typeof p.verified !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(p.color)) throw new Error('Некоректна геометрія або властивості маршруту');
    } else if (f.geometry?.type !== 'Point' || !validCoord(f.geometry.coordinates) || !p.name || !p.address || typeof p.entranceVerified !== 'boolean') throw new Error('Некоректне укриття');
  }
  return c;
}
export async function loadData(signal: AbortSignal): Promise<Dataset> {
  const [routes, shelters] = await Promise.all(['routes', 'shelters'].map(async kind => {
    const r = await fetch(`${import.meta.env.BASE_URL}data/${kind}.geojson`, {signal});
    if (!r.ok) throw new Error(`Не вдалося завантажити ${kind}: HTTP ${r.status}`);
    return validateCollection(await r.json(), kind as 'routes' | 'shelters');
  }));
  return {routes: routes.features as Route[], shelters: shelters.features as Shelter[]};
}
