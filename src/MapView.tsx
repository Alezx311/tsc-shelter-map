import {useEffect, useRef, useState} from 'react';
import L from 'leaflet';
import {isProtective, type Route, type Shelter} from './data';
import type {Coord} from './geo';
const latlng = (c: number[]): L.LatLngTuple => [c[1], c[0]];
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
interface Props {routes: Route[]; shelters: Shelter[]; hidden: boolean; restore: () => void; labels: boolean; weight: number; markerSize: number; fitToken: number}
export function MapView({routes,shelters,hidden,restore,labels,weight,markerSize,fitToken}: Props) {
  const host = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null), tiles = useRef<L.TileLayer | null>(null);
  const [tileError,setTileError] = useState(false);
  const hiddenRef = useRef(hidden), restoreRef = useRef(restore);
  hiddenRef.current = hidden; restoreRef.current = restore;
  useEffect(() => {
    const m = L.map(host.current!, {zoomControl:false}).setView([50.405,30.383],14);
    map.current = m;
    L.control.scale({imperial:false,position:'bottomleft'}).addTo(m);
    tiles.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);
    tiles.current.on('tileerror', () => setTileError(true));
    layer.current = L.layerGroup().addTo(m);
    m.on('click', () => {if (hiddenRef.current) restoreRef.current();});
    const resize = new ResizeObserver(() => m.invalidateSize({pan:false})); resize.observe(host.current!);
    return () => {resize.disconnect();m.remove();map.current=null;};
  }, []);
  useEffect(() => {if(hidden) map.current?.closePopup();},[hidden]);
  useEffect(() => {
    const m=map.current!, group=layer.current!; group.clearLayers();
    function drawArrows() {
      const arrows: L.Layer[]=[];
      for (const r of routes) {
        const cs=r.geometry.coordinates; let carry=45;
        for(let i=1;i<cs.length;i++) {
          const a=m.latLngToLayerPoint(latlng(cs[i-1])), b=m.latLngToLayerPoint(latlng(cs[i])); const len=a.distanceTo(b);
          if (len<1) continue;
          while(carry<len) {
            const p=a.add(b.subtract(a).multiplyBy(carry/len)); const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
            const icon=L.divIcon({className:'direction-icon',html:`<span style="color:${r.properties.color};transform:rotate(${angle}deg)">➤</span>`,iconSize:[20,20],iconAnchor:[10,10]});
            arrows.push(L.marker(m.layerPointToLatLng(p),{icon,interactive:false,keyboard:false}));carry+=110;
          } carry-=len;
        }
      }
      return L.layerGroup(arrows).addTo(group);
    }
    for(const r of routes) {
      const p=r.properties, cs=r.geometry.coordinates;
      L.polyline(cs.map(latlng),{color:'white',weight:weight+3,opacity:.9}).addTo(group);
      const line=L.polyline(cs.map(latlng),{color:p.color,weight,opacity:.88}).addTo(group);
      line.bindPopup(`<strong>Маршрут №${p.number}</strong><br>Категорії: ${escape(p.categories.join(', '))}<br>Наказ ${escape(p.approvedAt)} №${escape(p.order)}<br>${escape(p.notes)}<br><a href="${escape(p.source)}" target="_blank" rel="noopener">Офіційна схема</a>`);
      if(labels) line.bindTooltip(`№${p.number}`,{permanent:true,direction:'center',className:'route-label'});
      [cs[0],cs[cs.length-1]].forEach((c,i)=>L.circleMarker(latlng(c),{radius:5,color:p.color,fillColor:i?'white':p.color,fillOpacity:1,weight:2}).bindTooltip(`${i?'Кінець':'Початок'} №${p.number}`).addTo(group));
    }
    let arrows=drawArrows(); const redraw=()=>{group.removeLayer(arrows);arrows=drawArrows();};m.on('zoomend',redraw);
    for(const s of shelters) {
      const p=s.properties;
      const icon=L.divIcon({className:isProtective(p)?'shelter-icon protective':'shelter-icon',html:`<span style="width:${markerSize}px;height:${markerSize}px;font-size:${p.ref.length>2?Math.round(markerSize*.32):11}px">${escape(p.ref)}</span>`,iconSize:[markerSize,markerSize],iconAnchor:[markerSize/2,markerSize/2]});
      const marker=L.marker(latlng(s.geometry.coordinates),{icon,title:p.name}).addTo(group);
      const details=[p.premises,p.operator&&p.operator!==p.name?`Балансоутримувач: ${p.operator}`:null].filter(Boolean).map(x=>escape(x!)).join('<br>');
      const accessible=p.accessible===null?'':`<br>Доступ для маломобільних: ${p.accessible?'є':'немає'} (за джерелом).`;
      marker.bindPopup(`<div class="shelter-popup"><small>${escape((p.kind??'Укриття').toUpperCase())} · №${escape(p.ref)}</small><h3>${escape(p.name)}</h3><p>${escape(p.settlement)}, ${escape(p.address)}${details?`<br>${details}`:''}</p><p>${escape(p.access??'Графік не вказано.')} Поточна доступність не перевірялася.${accessible}<br>Місткість: ${p.capacity??'немає даних'}.</p><p>${escape(p.coordinateAccuracy)}. ${p.entranceVerified?'Вхід підтверджено.':'Точний вхід не підтверджено.'}</p><a href="${escape(p.source)}" target="_blank" rel="noopener">Джерело: ${escape(p.sourceName)} ↗</a><p class="muted">Отримано ${escape(p.retrievedAt)} · ${escape(p.verification)}</p></div>`,{maxWidth:310});
      if(labels) marker.bindTooltip(p.name,{permanent:true,direction:'right',offset:[markerSize/2,0],className:'shelter-label'});
    }
    return()=>{m.off('zoomend',redraw);};
  },[routes,shelters,labels,weight,markerSize]);
  useEffect(() => {if(!fitToken)return; const coords: Coord[]=routes.length?routes.flatMap(r=>r.geometry.coordinates as Coord[]):shelters.map(s=>s.geometry.coordinates as Coord);if(coords.length)map.current!.fitBounds(L.latLngBounds(coords.map(latlng)),{padding:[50,50],maxZoom:16});},[fitToken]); // Deliberately fit only on explicit request.
  return <><div ref={host} className="map" aria-label="Карта маршрутів та укриттів"/>{!hidden&&<div className="zoom-tools"><button aria-label="Збільшити карту" onClick={()=>map.current?.zoomIn()}>+</button><button aria-label="Зменшити карту" onClick={()=>map.current?.zoomOut()}>−</button></div>}{tileError&&<div className="tile-error" role="alert">Картографічна основа не завантажилась повністю. Перевірте інтернет. <button onClick={()=>{setTileError(false);tiles.current?.redraw();}}>Повторити</button></div>}</>;
}
