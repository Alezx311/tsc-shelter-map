"""Build auditable local GeoJSON; this does not fetch or invent route geometry."""
from pathlib import Path
import json,re,hashlib,shutil,datetime,math,html
root=Path(__file__).resolve().parent.parent
traces=json.loads((root/'research/traces.json').read_text())
geometries={str(g['number']):g for g in json.loads((root/'research/georeferenced.json').read_text())}
retrieved='2026-09-15'
page='https://hsc.gov.ua/index/poslugi/vidacha-posvidchennya-vodiya/marshruti/kiyivska-obl-kiyevo-svyatoshinskij-r-n-s-sofiyivska-borshhagivka-vul-lva-tolstogo-2-tsts-mvs-3246/'
colors=['#245db1','#b54437','#87549d','#00836b','#bd7400','#5953a3','#cc477d','#517326','#227b9e','#995523','#5c4eb9','#bb392c']
verified={1,2,4,5,7,11,12}
reasons={3:'Послідовність відгалужень і повторних проїздів неоднозначна.',6:'Потрібне уточнення геоприв’язки: залишкове відхилення контрольних точок до 52 м.',8:'Потрібне уточнення повороту Жулянська — Київська й геоприв’язки: до 54 м.',9:'Потрібне уточнення геоприв’язки в районі Європейської: до 59 м.',10:'Послідовність розворотів східного відгалуження неоднозначна.'}
routes=[]; manifest=[]
(root/'public/schemes').mkdir(exist_ok=True)
for n in range(1,13):
 key=str(n);t=traces[key];g=geometries[key];source=f'https://hsc.gov.ua/wp-content/uploads/2025/12/3246-{n}.jpg';file=root/f'research/HSC 3246/3246-{n}.jpg'
 p={'id':f'3246-{n}','number':n,'categories':t['categories'],'approvedAt':'2025-12-17','order':'260','source':source,'sourcePage':page,'localScheme':f'schemes/3246-{n}.jpg','retrievedAt':retrieved,'verification':'scheme-checked' if n in verified else 'needs-review','verified':n in verified,'color':colors[n-1],'notes':t['notes'] if n in verified else reasons[n],'coordinateAccuracy':'Геоприв’язка растрової схеми; орієнтовна точність 30–50 м, не точність смуги руху.','controlResidualMaxMetres':max(g['residualMetres'])}
 routes.append({'type':'Feature','properties':p,'geometry':{'type':'LineString','coordinates':g['coordinates']}})
 manifest.append({**p,'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'originalSizeBytes':file.stat().st_size,'controls':t['controls'],'controlResidualMetres':g['residualMetres'],'traceFile':'research/traces.json','overlay':f'research/qa-{n}.png','checks':{'sourceHeaderRead':True,'geometryOverlayInspected':True,'travelOrderConfirmed':n in verified,'fieldVerified':False}})
 shutil.copyfile(file,root/f'public/schemes/3246-{n}.jpg')
source=(root/'research/shelters-source.html').read_text();raw=json.loads(re.search(r'const shelters = (\[.*?\]);',source).group(1));shelters=[]
koda_map='https://www.google.com/maps/d/viewer?mid=133eWWMRjEzUA1_n5d2Ae28nwvrIP41U';koda_page='https://koda.gov.ua/czyvilnyj-front/zahysni-sporudy-tochky-obigrivu/ukryttya/'
kyiv_layer='https://gisserver-stage.kyivcity.gov.ua/mayno/rest/services/KYIV_API/Public_protection/MapServer/0';kyiv_page='https://gis.kyivcity.gov.ua/shelter/'
shelters_retrieved='2026-09-16';coverage=2000
for s in raw:
 assert 30.25<s['lon']<30.45 and 50.35<s['lat']<50.46
 p={'id':f"brada-{s['id']}",'ref':str(s['id']),'name':s['name'],'settlement':s['settlement'],'address':s['address'],'kind':None,'premises':None,'operator':None,'sourceName':'Борщагівська громада','source':'https://brada.gov.ua/dsns/skhovyshcha-ukryttia-hromady/','coordinateSource':'https://brada.gov.ua/maps/shelters.html','retrievedAt':retrieved,'verification':'official-coordinate; entrance-unverified','notes':'Назва та адреса звірені з переліком громади. Координати дослівно перенесені з її офіційної карти; польова перевірка не проводилася.','coordinateAccuracy':'Точка об’єкта з офіційної карти громади','entranceVerified':False,'access':None,'accessible':None,'capacity':None,'alsoListedIn':[]}
 shelters.append({'type':'Feature','properties':p,'geometry':{'type':'Point','coordinates':[s['lon'],s['lat']]}})

# Extra official registries: every published object (basements of apartment blocks included) within `coverage` metres of any of the 12 scheme lines.
lines=[r['geometry']['coordinates'] for r in routes]
def metres(a,b):
 k=math.cos(math.radians((a[1]+b[1])/2));return math.hypot((a[0]-b[0])*111320*k,(a[1]-b[1])*110574)
def route_distance(p):
 best=math.inf
 for line in lines:
  for a,b in zip(line,line[1:]):
   k=math.cos(math.radians(p[1]));ax,ay,bx,by=(a[0]-p[0])*111320*k,(a[1]-p[1])*110574,(b[0]-p[0])*111320*k,(b[1]-p[1])*110574;dx,dy=bx-ax,by-ay
   t=0 if dx==dy==0 else max(0,min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy)));best=min(best,math.hypot(ax+t*dx,ay+t*dy))
 return best
clean=lambda s:re.sub(r'\s+',' ',html.unescape(re.sub(r'<!\[CDATA\[(.*?)\]\]>',r'\1',s or '',flags=re.S))).strip()
kinds={'Найпростіші укриття':'Найпростіше укриття','Укриття':'Захисна споруда','ПРУ':'Протирадіаційне укриття','Споруди подвійного призначення':'Споруда подвійного призначення'}
sentence=lambda s:s[:1].lower()+s[1:]
homes={'Житловий будинок','Багатоквартирний будинок','Гуртожиток'}
generic=re.compile(r'^(багато\w*\s+)?(житловий|багатоквартирний|багатоповерховий)?\s*(\w+\s+)?(житловий|житровий)\s+будинок$|^вул\.',re.I)
# KODA objects that are the same community facilities as the brada list (checked by name, address and <250 m distance).
koda_to_brada={'3208439dbd07dfde':1,'3208c5fb14767e8f':1,'320869dfe0d5b9fc':2,'3208dfdbda59a1fb':3,'32081018db3d997b':4,'32085870d30c7fee':5,'3208bef4476b6a81':6,'320817147b1e9534':7,'320859320967a4e7':8,'3208d721c1ad0da4':9,'320847b325b90108':10,'3208a99519b6e573':11,'32083bbf995beeae':12,'3208e0f01d2f05de':13}
koda=[]
for pm in re.findall(r'<Placemark>(.*?)</Placemark>',(root/'research/shelters-koda.kml').read_text(),re.S):
 d={k:clean(v) for k,v in re.findall(r'<Data name="([^"]+)">\s*<value>(.*?)</value>',pm,re.S)};d['name']=clean(re.search(r'<name>(.*?)</name>',pm,re.S).group(1))
 lon,lat=map(float,re.search(r'<coordinates>\s*([-\d.]+),([-\d.]+)',pm).groups());d['coord']=[lon,lat];koda.append(d)
by_ref={s['properties']['ref']:s for s in shelters};extra=[]
for d in koda:
 if d['id'] in koda_to_brada:
  p=by_ref[str(koda_to_brada[d['id']])]['properties'];assert metres(d['coord'],by_ref[str(koda_to_brada[d['id']])]['geometry']['coordinates'])<250,d
  p['kind']=', '.join(sorted({*filter(None,(p['kind'] or '').split(', ')),kinds.get(d['Тип'],d['Тип'])}));p['alsoListedIn'].append({'source':koda_map,'id':d['id'],'schedule':d['Графік роботи']})
  if p['access'] is None:p['access']=f"За даними КОВА: {sentence(d['Графік роботи'])}."
  if p['accessible'] is None:p['accessible']={'Так':True,'Ні':False}.get(d['Інклюзивне'])
  continue
 if d.get('Громада')!='Борщагівська сільська' and route_distance(d['coord'])>coverage:continue
 building=not generic.search(d['name'])
 extra.append({'sid':f"koda-{d['id']}",'coord':d['coord'],'name':d['name'] if building else f"Укриття в житловому будинку",'settlement':re.sub(r'^С\s*\.\s*','',d['Населений пункт'][:1].upper()+d['Населений пункт'][1:]),'address':re.sub(r'^[cм]\.\s*(С\.?\s*)?[^,]+,\s*','',d['Адреса']),'kind':kinds.get(d['Тип'],d['Тип']),'premises':None if building else d['name'].capitalize(),'operator':None,'access':f"За даними КОВА: {sentence(d['Графік роботи'])}.",'accessible':{'Так':True,'Ні':False}.get(d['Інклюзивне']),'sourceName':'Київська ОВА','source':koda_page,'coordinateSource':koda_map,'sourceId':d['id']})
kyiv_seen=set()
for f in json.loads((root/'research/shelters-kyiv.geojson').read_text())['features']:
 k=f['properties'];c=f['geometry']['coordinates']
 if k.get('actual')!=1 or route_distance(c)>coverage:continue
 key=(k['address'],round(c[0],5),round(c[1],5),k['kind'])
 if key in kyiv_seen:continue
 kyiv_seen.add(key);owner=clean(k.get('owner'))
 extra.append({'sid':f"kyiv-{k['objectid']}",'coord':c,'name':'Укриття в житловому будинку' if k['type_building'] in homes or not owner or owner=='-' else owner,'operator':owner if owner and owner!='-' else None,'settlement':f"Київ, {k['district']} р-н",'address':k['address'],'kind':kinds.get(k['type'],k['type']),'premises':', '.join(filter(None,[k['kind'],k['type_building']])),'access':f"За даними КМДА: {sentence(clean(k['working_time']))}." if k.get('working_time') else None,'accessible':{'В наявності':True,'Відсутній':False}.get(k.get('invalid')),'sourceName':'КМДА, мапа укриттів Києва','source':kyiv_page,'coordinateSource':kyiv_layer,'sourceId':str(k['objectid'])})
assert sum(len(by_ref[str(n)]['properties']['alsoListedIn'])>0 for n in range(1,14))==13,'every brada facility must be matched in the KODA map'
extra.sort(key=lambda e:(e['sourceName'],-e['coord'][1],e['coord'][0]))
for i,e in enumerate(extra,start=len(shelters)+1):
 p={'id':e['sid'],'ref':str(i),'name':e['name'],'settlement':e['settlement'],'address':e['address'],'kind':e['kind'],'premises':e['premises'],'operator':e['operator'],'sourceName':e['sourceName'],'source':e['source'],'coordinateSource':e['coordinateSource'],'sourceId':e['sourceId'],'retrievedAt':shelters_retrieved,'verification':'official-registry-coordinate; entrance-unverified','notes':'Об’єкт з офіційного реєстру; координати перенесені без змін. Польова перевірка не проводилася.','coordinateAccuracy':'Точка об’єкта з офіційної карти','entranceVerified':False,'access':e['access'],'accessible':e['accessible'],'capacity':None,'alsoListedIn':[]}
 shelters.append({'type':'Feature','properties':p,'geometry':{'type':'Point','coordinates':e['coord']}})
for name,features in [('routes',routes),('shelters',shelters)]:
 (root/f'public/data/{name}.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,indent=2)+'\n')
sha=lambda f:hashlib.sha256((root/f).read_bytes()).hexdigest();count=lambda name:sum(x['properties']['sourceName']==name for x in shelters)
shelter_manifest={'count':len(shelters),'coverageMetres':coverage,'coverageRule':f'Усі об’єкти Борщагівської громади, а також об’єкти інших реєстрів у межах {coverage} м від будь-якої з 12 ліній схем (включно з неперевіреними).','entranceVerified':False,'fieldVerified':False,'sources':[
 {'name':'Борщагівська громада','count':count('Борщагівська громада'),'page':'https://brada.gov.ua/dsns/skhovyshcha-ukryttia-hromady/','coordinates':'https://brada.gov.ua/maps/shelters.html','retrievedAt':retrieved,'file':'research/shelters-source.html','sha256':sha('research/shelters-source.html'),'coordinateCheck':'13 пар координат перенесено без змін; діапазон і відповідність імен перевірено. Точність входу не підтверджена.'},
 {'name':'Київська ОВА','count':count('Київська ОВА'),'page':koda_page,'coordinates':koda_map,'retrievedAt':shelters_retrieved,'file':'research/shelters-koda.kml','sha256':sha('research/shelters-koda.kml'),'coordinateCheck':f'Координати перенесено без змін. {len(koda_to_brada)} записів КОВА збігаються з 13 об’єктами громади (назва, адреса, до 250 м) і не дублюються; їхній тип і графік додано до об’єктів громади.'},
 {'name':'КМДА, мапа укриттів Києва','count':count('КМДА, мапа укриттів Києва'),'page':kyiv_page,'coordinates':kyiv_layer+'/query','retrievedAt':shelters_retrieved,'file':'research/shelters-kyiv.geojson','sha256':sha('research/shelters-kyiv.geojson'),'coordinateCheck':'Лише записи з actual=1; повтори з тією самою адресою, координатою та типом приміщення відкинуто. Координати без змін.'}]}
(root/'public/data/verification.json').write_text(json.dumps({'retrievedAt':retrieved,'routes':manifest,'shelters':shelter_manifest},ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(routes)} routes ({len(verified)} scheme-checked), {len(shelters)} shelters: '+', '.join(f"{x['name']} {x['count']}" for x in shelter_manifest['sources']))
