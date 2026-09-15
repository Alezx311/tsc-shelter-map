import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {validateCollection, SHELTER_COVERAGE_METRES} from './data';
import {lineDistance, type Coord} from './geo';
const read=(file:string)=>JSON.parse(readFileSync(new URL(`../public/data/${file}`,import.meta.url),'utf8'));
describe('published data integrity',()=>{
 it('keeps all twelve source inventories and excludes unresolved routes',()=>{
  const routes=validateCollection(read('routes.geojson'),'routes').features;
  expect(routes).toHaveLength(12);
  expect(routes.filter(r=>r.properties!.verified).map(r=>r.properties!.number)).toEqual([1,2,4,5,7,11,12]);
  for(const r of routes){expect(r.properties!.source).toContain(`/3246-${r.properties!.number}.jpg`);expect(r.properties!.approvedAt).toBe('2025-12-17');expect(r.properties!.order).toBe('260');}
 });
 it('preserves official community coordinates and never marks entrances as verified',()=>{
  const shelters=validateCollection(read('shelters.geojson'),'shelters').features;
  const source=readFileSync(new URL('../research/shelters-source.html',import.meta.url),'utf8');
  const original=JSON.parse(source.match(/const shelters = (\[.*?\]);/)![1]);
  const community=shelters.filter(s=>s.properties!.sourceName==='Борщагівська громада');
  expect(community).toHaveLength(13);
  community.forEach((s,i)=>{expect(s.geometry).toEqual({type:'Point',coordinates:[original[i].lon,original[i].lat]});expect(s.properties!.ref).toBe(String(original[i].id));});
  shelters.forEach(s=>{expect(s.properties!.entranceVerified).toBe(false);expect(s.properties!.capacity).toBeNull();});
  expect(new Set(shelters.map(s=>s.properties!.ref)).size).toBe(shelters.length);
 });
 it('adds the simplest shelters from official registries only near the scheme lines',()=>{
  const shelters=validateCollection(read('shelters.geojson'),'shelters').features;
  const lines=read('routes.geojson').features.map((r:{geometry:{coordinates:Coord[]}})=>r.geometry.coordinates);
  const kyiv=shelters.filter(s=>s.properties!.sourceName.startsWith('КМДА')), koda=shelters.filter(s=>s.properties!.sourceName==='Київська ОВА');
  expect(kyiv.length).toBeGreaterThan(100);expect(koda.length).toBeGreaterThan(50);
  expect(shelters.filter(s=>/Підвал|житловий будинок/i.test(`${s.properties!.premises}`)).length).toBeGreaterThan(100);
  for(const s of [...kyiv,...koda.filter(s=>!/Борщагівка|Чайки/.test(s.properties!.settlement))]) expect(lineDistance((s.geometry as {coordinates:Coord}).coordinates,lines)).toBeLessThanOrEqual(SHELTER_COVERAGE_METRES+5);
 });
 it('rejects duplicate identifiers and non-finite coordinates',()=>{
  const shelters=read('shelters.geojson');shelters.features[1].properties.id=shelters.features[0].properties.id;expect(()=>validateCollection(shelters,'shelters')).toThrow();
  const invalid=read('shelters.geojson');invalid.features[0].geometry.coordinates=[NaN,50];expect(()=>validateCollection(invalid,'shelters')).toThrow();
 });
});
