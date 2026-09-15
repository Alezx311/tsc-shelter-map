import {StrictMode, useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {loadData, SHELTER_COVERAGE_METRES, type Dataset} from './data';
import {withinRadius, type Coord} from './geo';
import {MapView} from './MapView';
import 'leaflet/dist/leaflet.css';
import './style.css';
function App() {
 const [data,setData]=useState<Dataset|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [selected,setSelected]=useState<string[]>([]),[category,setCategory]=useState('all'),[radius,setRadius]=useState('500');
 const [hidden,setHidden]=useState(false),[labels,setLabels]=useState(false),[weight,setWeight]=useState(5),[markerSize,setMarkerSize]=useState(28),[fitToken,setFitToken]=useState(0);
 useEffect(()=>{const c=new AbortController();setError('');loadData(c.signal).then(d=>{setData(d);const first=d.routes.find(r=>r.properties.verified&&r.properties.number===4)??d.routes.find(r=>r.properties.verified);setSelected(first?[first.properties.id]:[]);}).catch(e=>{if(!c.signal.aborted)setError(String(e.message));});return()=>c.abort();},[retry]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||((e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]')))return;if(e.code==='KeyH'){e.preventDefault();setHidden(h=>!h);}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
 const verified=useMemo(()=>data?.routes.filter(r=>r.properties.verified)??[],[data]);
 const categories=useMemo(()=>[...new Set(verified.flatMap(r=>r.properties.categories))],[verified]);
 const options=useMemo(()=>verified.filter(r=>category==='all'||r.properties.categories.includes(category)),[verified,category]);
 const routes=useMemo(()=>options.filter(r=>selected.includes(r.properties.id)),[options,selected]);
 const validRadius=radius.trim()!==''&&Number.isFinite(Number(radius))&&Number(radius)>=0&&Number(radius)<=10000;
 const shelters=useMemo(()=>{if(!data||!validRadius||!routes.length)return [];const lines=routes.map(r=>r.geometry.coordinates as Coord[]);return data.shelters.filter(s=>withinRadius(s.geometry.coordinates as Coord,lines,Number(radius)));},[data,routes,radius,validRadius]);
 const [showAll,setShowAll]=useState(false);
 const shown=showAll?(data?.shelters??[]):shelters;
 const date=data?.shelters.map(s=>s.properties.retrievedAt).sort().at(-1)??'—';
 return <main className={hidden?'app presentation':'app'}>
  <MapView routes={routes} shelters={shown} hidden={hidden} restore={()=>setHidden(false)} labels={labels} weight={weight} markerSize={markerSize} fitToken={fitToken}/>
  {!hidden&&<aside className="panel" aria-label="Налаштування карти"><header><div className="eyebrow">МАРШРУТИ ТА УКРИТТЯ</div><h1>ТСЦ <span>3246</span></h1><p>Софіївська Борщагівка</p><span className="pilot">Пілотна карта</span></header>
  <div className="panel-content">{error?<div className="notice error" role="alert">{error}<button onClick={()=>setRetry(x=>x+1)}>Повторити завантаження</button></div>:!data?<p role="status">Завантажуємо дані…</p>:<>
  <section><div className="section-heading"><h2>01 / Маршрути</h2><span>{routes.length} вибрано</span></div>
  <label className="field">Категорія<select aria-label="Категорія" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Усі категорії</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
  <div className="row"><button className="text-button" onClick={()=>setSelected(options.map(r=>r.properties.id))}>Вибрати всі</button><button className="text-button" onClick={()=>setSelected([])}>Очистити</button></div>
  <div className="route-grid">{options.map(r=><label key={r.properties.id} className={selected.includes(r.properties.id)?'route-choice selected':'route-choice'} style={{'--route-color':r.properties.color} as React.CSSProperties}><input type="checkbox" checked={selected.includes(r.properties.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,r.properties.id]:s.filter(id=>id!==r.properties.id))}/><i/>№ {r.properties.number}<small>{r.properties.categories.join(', ')}</small></label>)}</div>
  {!verified.length&&<p className="notice">Маршрути ще проходять звірку з офіційними схемами.</p>}
  {!!data.routes.filter(r=>!r.properties.verified).length&&<details><summary>Схеми, що потребують уточнення ({data.routes.filter(r=>!r.properties.verified).length})</summary>{data.routes.filter(r=>!r.properties.verified).map(r=><p key={r.properties.id}><a href={r.properties.source} target="_blank" rel="noreferrer">№{r.properties.number}</a>: {r.properties.notes}</p>)}</details>}
  </section><section><div className="section-heading"><h2>02 / Укриття поруч</h2><strong>{shown.length}</strong></div>
  <label className="field">Відстань від маршруту, м<input type="number" min="0" max="10000" step="50" value={radius} onChange={e=>setRadius(e.target.value)} aria-invalid={!validRadius}/></label>
  {!validRadius&&<p className="error" role="alert">Введіть відстань від 0 до 10 000 м.</p>}
  {validRadius&&Number(radius)>SHELTER_COVERAGE_METRES&&<p className="notice">Укриття за межами {SHELTER_COVERAGE_METRES/1000} км від маршрутів у дані не завантажені — результат може бути неповним.</p>}
  <p className="hint">Найкоротша відстань по прямій до лінії, а не довжина пішого шляху.</p>
  <label className="check"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>Показати всі завантажені укриття</label>
  <p className="results" role="status">{showAll?`Усі ${shown.length} завантажених укриттів · фільтр відстані вимкнено`:!routes.length?'Виберіть маршрут, щоб знайти укриття поруч.':!validRadius?'Виправте відстань для пошуку.':!shelters.length?'У заданій відстані укриттів немає. Збільште відстань або виберіть інший маршрут.':`Знайдено ${shelters.length} з ${data.shelters.length} укриттів у межах ${radius} м.`}</p>
  </section><section><h2>03 / Вигляд для плаката</h2><label className="check"><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/>Показувати підписи</label><label className="range">Товщина ліній <span>{weight} px</span><input type="range" min="2" max="10" value={weight} onChange={e=>setWeight(Number(e.target.value))}/></label><label className="range">Розмір позначок <span>{markerSize} px</span><input type="range" min="20" max="44" value={markerSize} onChange={e=>setMarkerSize(Number(e.target.value))}/></label><button className="secondary" onClick={()=>setFitToken(x=>x+1)}>Умістити вибране в кадр</button></section>
  <details><summary>Дані та джерела</summary><p>Схеми ГСЦ: 17.12.2025, наказ №260. Лінії оцифровані зі схем; не є навігацією по смугах.</p><p>Укриття: захисні споруди та найпростіші укриття (підвали житлових будинків, паркінги, переходи) з офіційних реєстрів — усі об’єкти Борщагівської громади та об’єкти до {SHELTER_COVERAGE_METRES/1000} км від маршрутів. Координати без змін; точні входи й поточна доступність не підтверджені.</p><a href="https://brada.gov.ua/dsns/skhovyshcha-ukryttia-hromady/" target="_blank" rel="noreferrer">Борщагівська громада ↗</a><br/><a href="https://koda.gov.ua/czyvilnyj-front/zahysni-sporudy-tochky-obigrivu/ukryttya/" target="_blank" rel="noreferrer">Київська ОВА — мапа укриттів ↗</a><br/><a href="https://gis.kyivcity.gov.ua/shelter/" target="_blank" rel="noreferrer">КМДА — мапа укриттів Києва ↗</a><br/><a href="data/verification.json" target="_blank">Журнал перевірки даних ↗</a></details>
  </> }</div><footer><button className="primary" onClick={()=>setHidden(true)}>Приховати керування <kbd>H</kbd></button><p>Повернути: H або торкніться карти</p></footer></aside>}
  <div className="legend" aria-label="Легенда карти"><div className="legend-title">ТСЦ №3246 <span>Маршрути та укриття</span></div><div className="legend-routes">{routes.map(r=><span key={r.properties.id}><i style={{background:r.properties.color}}/>№{r.properties.number}</span>)}</div><div className="legend-note"><b className="shelter-key">⌂</b> Укриття · {shown.length} <span>{showAll?'Усі завантажені':`до ${validRadius?radius:'—'} м`}</span></div><div className="legend-kinds"><span><b className="shelter-key"/>Найпростіші (підвали, паркінги)</span><span><b className="shelter-key protective"/>Захисні споруди</span></div><small>Координати об’єктів; входи не підтверджені.<br/>Лінії зі схем: орієнтовна точність 30–50 м.<br/>Дані отримано: {date}{!routes.length?' · Маршрути не вибрано':''}</small></div>
 </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
