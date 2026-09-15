import xml.etree.ElementTree as E,json,glob,collections
nodes={};ways={}
for file in glob.glob('research/osm-*.xml'):
 root=E.parse(file).getroot()
 nodes.update({n.attrib['id']:(float(n.attrib['lon']),float(n.attrib['lat'])) for n in root.findall('node')})
 for w in root.findall('way'):
  t={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}
  if 'highway' in t:ways[w.attrib['id']]={'id':w.attrib['id'],'tags':t,'nodes':[n.attrib['ref'] for n in w.findall('nd')]}
for w in ways.values():w['coordinates']=[nodes[n] for n in w['nodes']]
json.dump(list(ways.values()),open('research/roads.json','w'),ensure_ascii=False)
by=collections.defaultdict(list)
for w in ways.values():
 if 'name' in w['tags']:
  for n in w['nodes']:by[n].append(w['tags']['name'])
for n,names in by.items():
 ns=set(names)
 if len(ns)>1 and any('Київська' in x or 'Святошинська' in x or 'Боголюбова' in x for x in ns):print(n,' / '.join(sorted(ns)),nodes[n])
