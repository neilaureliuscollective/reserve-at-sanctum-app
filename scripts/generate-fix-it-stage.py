from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
import hashlib,json
root=Path(__file__).resolve().parents[1]/'public/fix-it-shop-app/materials'
root.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(28102026)
w,h=1200,1600
noise=np.zeros((h,w),np.float32)
for gw,gh,amp in [(7,10,.45),(25,34,.28),(90,120,.17),(300,400,.10)]:
 a=Image.fromarray(rng.integers(0,256,(gh,gw),dtype=np.uint8)).resize((w,h),Image.Resampling.BICUBIC)
 noise+=(np.asarray(a,dtype=np.float32)/255-.5)*amp
fine=rng.normal(0,2.6,(h,w))
y,x=np.mgrid[0:h,0:w];X=x/w;Y=y/h
key=np.exp(-(((X-.79)/.24)**2+((Y-.25)/.33)**2))
spill=np.exp(-(((X-.62)/.48)**2+((Y-.73)/.4)**2))*.3
# Original abstract ink-blue material only: no logo, text, object or premises.
shade=np.clip(.48+noise*1.3,0,1)
light=(key*.75+spill)*(shade*.6+.4)
base=np.zeros((h,w,3),np.float32)
base[:,:,0]=1.5+noise*1.5+light*4+fine*.15
base[:,:,1]=13+noise*15+light*42+fine*.85
base[:,:,2]=26+noise*21+light*59+fine*1.2
# Irregular microrelief, localized cool grazing light; not repeated stripes.
dy,dx=np.gradient(noise);relief=np.clip((dx*.4-dy)*350,-5,5)*(.2+light)
base+=relief[:,:,None]*np.array([.12,.7,1.0])
image=Image.fromarray(np.uint8(np.clip(base,0,255)))
records=[]
for name,size,box in [('stage-phone.webp',(640,880),(160,0,1200,1430)),('stage-wide.webp',(900,1100),(0,0,1200,1466))]:
 out=root/name;image.crop(box).resize(size,Image.Resampling.LANCZOS).save(out,'WEBP',quality=92,method=6)
 data=out.read_bytes();records.append({'file':str(out.relative_to(root.parent)),'width':size[0],'height':size[1],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(root/'stage-provenance.json').write_text(json.dumps({'origin':'Original deterministic abstract material generation using existing NumPy/Pillow, seed 28102026. No paid APIs, external image, reference crop, logo, lettering, photography or people. Two art-directed crops from one material master. Gold sweep remains a separate CSS layer; useful text and controls are HTML.','assets':records},indent=2)+'\n')
print(records)
