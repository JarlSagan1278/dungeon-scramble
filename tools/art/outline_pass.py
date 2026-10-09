#!/usr/bin/env python3
"""Give every exported art PNG the same near-black outline.

usage: python3 tools/art/outline_pass.py <dir> [--dry]

For each PNG it measures how thick the existing dark outline is (px of near-black hugging the silhouette), compares that with
the category's standard (as a % of image height), and, only when an image falls clearly short, grows the silhouette outward by
the missing amount and fills it with the shared ink colour. Images that already have an outline at least that thick are left
alone (this never thins anything), so it is safe to re-run after importing hand-painted art.
"""
import sys, glob, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
INK=(10,6,4)
# standard outline thickness, % of image height (about the current median of each category)
STD={'MONSTER_ART':2.9,'LOOT_ART':5.0,'DWARF_PORTRAITS':3.0,'GNOME_PORTRAITS':3.0,'HALFLING_PORTRAITS':3.0,'PIXIE_PORTRAITS':3.0,'GNOME_SILHOUETTE':3.0,'CAT_SILHOUETTE':3.0}
def thickness(a):
    m=a[...,3]>128; lum=a[...,:3].max(axis=2); cur=m.copy(); t=0
    for _ in range(30):
        er=ndi.binary_erosion(cur); ring=cur&~er
        if ring.sum()==0 or (lum[ring]<75).mean()<=0.6: break
        t+=1; cur=er
    return t
def seal(a,T):
    # Fill thin tinted lines left inside the black band (e.g. a dark-green old outline sitting just inside the new ink):
    # close the ink mask across gaps up to ~3px, but only near the silhouette edge and only over dark-ish pixels.
    op=a[...,3]>200; lum=a[...,:3].max(axis=2)
    dist=ndi.distance_transform_edt(np.pad(op,1))[1:-1,1:-1]
    band=op&(dist<=T+4)
    ink=op&(lum<85)&band
    closed=ndi.binary_closing(np.pad(ink,4),structure=np.ones((3,3)),iterations=2)[4:-4,4:-4]
    fill=closed&~ink&band&(lum<190)
    snap=(ink|fill)&(a[...,3]>200)
    a[snap,:3]=INK; a[snap,3]=255
    return int(snap.sum())
def main():
    d=sys.argv[1]; dry='--dry' in sys.argv; n=0
    for f in sorted(glob.glob(os.path.join(d,'*.png'))):
        cat=os.path.basename(f).split('__')[0]
        if cat not in STD: continue
        im=Image.open(f).convert('RGBA'); a=np.array(im); H=im.size[1]
        T=max(2,round(STD[cat]/100*H)); t=thickness(a)
        if t>=round(T*0.7): continue
        # Old, coloured outlines (dark green, brown...) would otherwise show as a thin tinted line between themselves and the new
        # ink ring, so first walk inward from the silhouette edge and repaint any dark-ish rim as ink.
        m0=a[...,3]>128; lum=a[...,:3].max(axis=2); cur=m0.copy(); darkened=0
        for _ in range(16):
            er=ndi.binary_erosion(cur); ring=cur&~er
            if ring.sum()==0 or (lum[ring]<150).mean()<=0.55: break
            sel=ring
            a[sel,:3]=INK; a[sel,3]=255
            darkened+=1; cur=er
        # semi-transparent edge pixels keep a light tint of the old fill: make them solid ink too
        fr=(a[...,3]>0)&(a[...,3]<250)&(a[...,:3].max(axis=2)>=60)&ndi.binary_dilation(~m0,iterations=2)
        a[fr,:3]=INK; a[fr,3]=255
        t=max(t,darkened)
        add=T-t
        if add<=0:
            seal(a,T)
            print(f'recoloured rim of {os.path.basename(f)}')
            if not dry: Image.fromarray(a,'RGBA').save(f)
            n+=1; continue
        # grow the silhouette by `add` px using a round structuring element (keeps corners soft)
        m=a[...,3]>40
        r=np.arange(-add,add+1); se=(r[:,None]**2+r[None,:]**2)<=add*add+add
        grown=ndi.binary_dilation(m,structure=se)
        new=grown&~m
        if not new.any(): continue
        a[new,:3]=INK; a[new,3]=255
        # soften the outer edge by one pixel of partial alpha
        edge=ndi.binary_dilation(grown,iterations=1)&~grown
        a[edge,:3]=INK; a[edge,3]=np.maximum(a[edge,3],110)
        # stray faint specks beyond the new outline: clear them
        stray=(a[...,3]>0)&(a[...,3]<=40)&~ndi.binary_dilation(grown,iterations=1)
        a[stray,3]=0
        seal(a,T)
        print(('would add ' if dry else 'added ')+f'{add}px to {os.path.basename(f)} (had {t}, standard {T})')
        if not dry: Image.fromarray(a,'RGBA').save(f)
        n+=1
    print(n,'file(s)', 'would change' if dry else 'changed')
if __name__=='__main__': main()
