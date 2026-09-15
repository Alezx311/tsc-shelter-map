import json, os
os.environ['MPLCONFIGDIR']='/tmp/tsc-mpl'
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ws=json.load(open('research/roads.json')); fig,ax=plt.subplots(figsize=(14,14))
colors={'Київська вулиця':'red','Південна вулиця':'blue','Травнева вулиця':'green','вулиця Андрія Малишка':'purple','Микільська вулиця':'orange','Велика Кільцева вулиця':'black','вулиця Лесі Українки':'brown'}
for w in ws:
 c=w['coordinates']; n=w['tags']['name']; x,y=zip(*c)
 ax.plot(x,y,color=colors.get(n,'#ddd'),lw=2 if n in colors else .7)
 if n in colors and len(c)>3:
  m=c[len(c)//2];ax.text(*m,n,fontsize=8,color=colors[n])
ax.set_xlim(30.368,30.397);ax.set_ylim(50.397,50.416);ax.set_aspect(1/.637);ax.grid();fig.savefig('research/roads-reference.png',dpi=130)
