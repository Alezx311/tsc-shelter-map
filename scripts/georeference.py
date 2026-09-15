import json, os, math
from pathlib import Path
import numpy as np
os.environ['MPLCONFIGDIR']='/tmp/tsc-mpl'
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image
traces=json.load(open('research/traces.json')); roads=json.load(open('research/roads.json')); out=[]
for key,t in traces.items():
 a=np.array([[p[0],p[1],1] for p,g in t['controls']]); b=np.array([g for p,g in t['controls']]); transform=np.linalg.lstsq(a,b,rcond=None)[0]; pts=np.array([[*p,1] for p in t['pixels']])@transform
 residual=(a@transform-b)*[71000,111195];print(key,'control residual m',np.round(np.linalg.norm(residual,axis=1),1),'endpoints',pts[0],pts[-1])
 t['transform']=transform.tolist();t['residualMetres']=np.linalg.norm(residual,axis=1).round(1).tolist()
 inv=np.linalg.inv(np.vstack((transform.T,[0,0,1])))
 fig,ax=plt.subplots(figsize=(15,11));ax.imshow(Image.open(f'research/HSC 3246/3246-{key}.jpg'))
 for w in roads:
  if w['tags']['highway'] in ['footway','path','steps','cycleway','pedestrian']:continue
  cs=np.array([[*c,1] for c in w['coordinates']])@inv.T
  ax.plot(cs[:,0],cs[:,1],color='#00aa00',alpha=.5,lw=.8)
 p=np.array(t['pixels']);ax.plot(p[:,0],p[:,1],color='#ff00ee',lw=1.2)
 for i,(px,geo) in enumerate(t['controls']):ax.scatter(*px,c='yellow',s=40);ax.text(*px,str(i),color='red')
 im=Image.open(f'research/HSC 3246/3246-{key}.jpg');ax.set_xlim(0,im.width);ax.set_ylim(im.height,190);fig.savefig(f'research/qa-{key}.png',dpi=110);plt.close(fig)
 out.append({'number':int(key),'coordinates':pts.round(7).tolist(),'residualMetres':t['residualMetres']})
json.dump(out,open('research/georeferenced.json','w'),ensure_ascii=False,indent=2)
json.dump(traces,open('research/traces.json','w'),ensure_ascii=False,indent=2)
