import sys
from collections import deque
from PIL import Image

SRC = "/Users/khanh/.claude/image-cache/7bf567fd-1a56-452c-90c8-88608fcac9a4"
OUT = "/Users/khanh/Desktop/AgentSphere/services/frontend/public/assets/mascots"
import os
os.makedirs(OUT, exist_ok=True)

# per-mascot: source file, pre-crop box (l,t,r,b) or None, bg-removal tolerance
JOBS = {
    "toro":      {"f": "5.png", "crop": (165, 230, 560, 695), "tol": 84},
    "navi":      {"f": "4.png", "crop": (55, 175, 360, 501),  "tol": 48},
    "laotter":   {"f": "2.png", "crop": (28, 70, 250, 300),   "tol": 60},
    "greennode": {"f": "6.png", "crop": (4, 4, 150, 192),     "tol": 48},
}

def near(a, b, tol):
    return abs(a[0]-b[0]) + abs(a[1]-b[1]) + abs(a[2]-b[2]) <= tol

def cut(name, job):
    im = Image.open(f"{SRC}/{job['f']}").convert("RGBA")
    if job["crop"]:
        im = im.crop(job["crop"])
    W, H = im.size
    px = im.load()
    tol = job["tol"]
    WHITE = (255, 255, 255)
    # seed colors = the 4 corners
    corners = [px[0,0][:3], px[W-1,0][:3], px[0,H-1][:3], px[W-1,H-1][:3]]
    def is_bg(c):
        if near(c, WHITE, 36):
            return True
        for cc in corners:
            if near(c, cc, tol):
                return True
        return False
    # flood-fill bg from all border pixels
    bg = bytearray(W*H)
    dq = deque()
    for x in range(W):
        for y in (0, H-1):
            if not bg[y*W+x] and is_bg(px[x,y][:3]):
                bg[y*W+x] = 1; dq.append((x,y))
    for y in range(H):
        for x in (0, W-1):
            if not bg[y*W+x] and is_bg(px[x,y][:3]):
                bg[y*W+x] = 1; dq.append((x,y))
    while dq:
        x, y = dq.popleft()
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0<=nx<W and 0<=ny<H and not bg[ny*W+nx] and is_bg(px[nx,ny][:3]):
                bg[ny*W+nx] = 1; dq.append((nx,ny))
    # clear bg pixels
    for i in range(W*H):
        if bg[i]:
            px[i % W, i // W] = (0,0,0,0)
    # keep largest connected opaque component
    comp = bytearray(W*H)
    best = []
    cid = 0
    for sy in range(H):
        for sx in range(W):
            i0 = sy*W+sx
            if comp[i0] or px[sx,sy][3] < 20:
                continue
            cid += 1
            cur = []
            st = [(sx,sy)]
            comp[i0] = cid
            while st:
                x,y = st.pop()
                cur.append((x,y))
                for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if 0<=nx<W and 0<=ny<H and not comp[ny*W+nx] and px[nx,ny][3] >= 20:
                        comp[ny*W+nx] = cid; st.append((nx,ny))
            if len(cur) > len(best):
                best = cur
    keep = set(best)
    for sy in range(H):
        for sx in range(W):
            if comp[sy*W+sx] and (sx,sy) not in keep:
                px[sx,sy] = (0,0,0,0)
    # autocrop to alpha bbox
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    # pixelate: downscale to a small sprite (cute pixel-art style)
    w, h = im.size
    th = 30
    tw = max(1, round(w * th / h))
    im = im.resize((tw, th), Image.LANCZOS)
    # crisp pixel edges + light posterize for a clean pixel-art look
    im = im.convert("RGBA")
    px2 = im.load()
    def q(v):
        return min(255, (v + 16) // 32 * 32)
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b, a = px2[xx, yy]
            if a < 120:
                px2[xx, yy] = (0, 0, 0, 0)
            else:
                px2[xx, yy] = (q(r), q(g), q(b), 255)
    im.save(f"{OUT}/{name}.png")
    return im

mont_imgs = []
for name, job in JOBS.items():
    im = cut(name, job)
    print(name, "->", im.size)
    mont_imgs.append((name, im))

# montage (upscaled x6 nearest) so the pixel sprites are visible
pad = 12
S = 6
mw = sum(i.size[0]*S for _, i in mont_imgs) + pad*(len(mont_imgs)+1)
mh = max(i.size[1]*S for _, i in mont_imgs) + pad*2
mont = Image.new("RGBA", (mw, mh), (120,124,130,255))
x = pad
for _, i in mont_imgs:
    big = i.resize((i.size[0]*S, i.size[1]*S), Image.NEAREST)
    mont.alpha_composite(big, (x, pad))
    x += i.size[0]*S + pad
mont.convert("RGB").save("/tmp/mascot_cutouts.png")
print("montage /tmp/mascot_cutouts.png")
