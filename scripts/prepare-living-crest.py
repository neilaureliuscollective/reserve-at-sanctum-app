"""Reproducible bas-relief data from Neil's supplied crest; never regenerate the mark.

Requires Pillow, numpy and scipy. Output is geometry/material data, not a new logo.
Gold segmentation preserves source silhouettes; distance creates a rounded bevel.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import distance_transform_edt, gaussian_filter, label

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'scripts/assets/living-crest-source.png').convert('RGBA')
out = root / 'public/brand/legacy-reserve/living-crest'
out.mkdir(parents=True, exist_ok=True)
# Locate the main contiguous seal, ignoring isolated transparent-edge flecks.
a = np.asarray(source)
components, _ = label(a[:, :, 3] > 180)
counts = np.bincount(components.ravel()); counts[0] = 0
y, x = np.where(components == counts.argmax())
cx, cy = (x.min()+x.max())/2, (y.min()+y.max())/2
side = int(max(x.max()-x.min(), y.max()-y.min()) + 18)
source = source.crop((round(cx-side/2), round(cy-side/2), round(cx+side/2), round(cy+side/2)))
source = source.resize((1024,1024), Image.Resampling.LANCZOS)
source.save(out / 'poster.webp', quality=90, method=6)
rgb = np.asarray(source).astype(float)/255
r,g,b = rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
# Gold is warm; emerald remains low, even where its baked reflection is bright.
gold = (r > g*1.035) & (g > b*1.12) & (r > .17) & (rgb[:,:,3] > .4)
bevel = np.clip(distance_transform_edt(gold)/7,0,1)
height = gaussian_filter(gold * (.30 + .70*np.sqrt(bevel)),1.0)
height_img = Image.fromarray((height*255).astype('uint8'))
height_img.resize((256,256),Image.Resampling.LANCZOS).save(out / 'height.png',optimize=True)
mask = gaussian_filter(gold.astype(float),.65)
# Material mask: metallic gold, darker and rougher emerald backing.
material = np.stack([np.ones_like(mask), np.where(gold,.38,.82), mask],axis=2)
Image.fromarray(np.uint8(material*255)).save(out / 'material.webp',quality=94,method=6)
# Keep original engravings/colors. Live specular
# lighting is added at runtime over this faithful source-derived texture.
source.save(out / 'color.webp',quality=92,method=6)
print({p.name:p.stat().st_size for p in out.iterdir()})
