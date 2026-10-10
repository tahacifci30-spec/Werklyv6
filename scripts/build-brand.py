"""
Werkly merkbestanden genereren -> public/brand/*.svg

Symbool: twee V-vormen die in elkaar schuiven; waar ze kruisen ontstaat een ruit
(twee stappen die samenkomen in één werkstroom).
Woordmerk: contouren uit Geist-Regular (SIL OFL, meegeleverd met Next.js), licht verzwaard.

Gebruik:  python scripts/build-brand.py
"""
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"
OUT = ROOT / "public/brand"

INK = "#0B1220"
TEAL = "#0D9488"      # accent op licht
TEAL_DARK = "#2DD4BF"  # accent op donker
WHITE = "#FFFFFF"

# ----------------------------------------------------------------------------
# Minimale TrueType-lezer (alleen wat we nodig hebben: simpele glyphs, cmap 4/12)
# ----------------------------------------------------------------------------
class TTF:
    def __init__(self, path):
        self.d = Path(path).read_bytes()
        n = struct.unpack(">H", self.d[4:6])[0]
        self.t = {}
        for i in range(n):
            tag, _, off, ln = struct.unpack(">4sIII", self.d[12 + 16 * i: 28 + 16 * i])
            self.t[tag.decode()] = (off, ln)
        o = self.t["head"][0]
        self.upm = struct.unpack(">H", self.d[o + 18:o + 20])[0]
        self.loc_fmt = struct.unpack(">h", self.d[o + 50:o + 52])[0]
        n_glyphs = struct.unpack(">H", self.d[self.t["maxp"][0] + 4:self.t["maxp"][0] + 6])[0]
        o = self.t["loca"][0]
        if self.loc_fmt == 0:
            self.loca = [2 * v for v in struct.unpack(f">{n_glyphs + 1}H", self.d[o:o + 2 * (n_glyphs + 1)])]
        else:
            self.loca = list(struct.unpack(f">{n_glyphs + 1}I", self.d[o:o + 4 * (n_glyphs + 1)]))
        o = self.t["hhea"][0]
        self.n_hm = struct.unpack(">H", self.d[o + 34:o + 36])[0]
        self.cmap = self._cmap()

    def _cmap(self):
        o = self.t["cmap"][0]
        n = struct.unpack(">H", self.d[o + 2:o + 4])[0]
        best = None
        for i in range(n):
            pid, eid, off = struct.unpack(">HHI", self.d[o + 4 + 8 * i:o + 12 + 8 * i])
            fmt = struct.unpack(">H", self.d[o + off:o + off + 2])[0]
            if fmt in (4, 12) and (pid, eid) in ((3, 1), (3, 10), (0, 3), (0, 4), (0, 6)):
                best = (o + off, fmt)
                if fmt == 12:
                    break
        base, fmt = best
        m = {}
        if fmt == 4:
            seg2 = struct.unpack(">H", self.d[base + 6:base + 8])[0]
            sc = seg2 // 2
            p = base + 14
            ends = struct.unpack(f">{sc}H", self.d[p:p + seg2]); p += seg2 + 2
            starts = struct.unpack(f">{sc}H", self.d[p:p + seg2]); p += seg2
            deltas = struct.unpack(f">{sc}h", self.d[p:p + seg2]); p += seg2
            ro_pos = p
            ranges = struct.unpack(f">{sc}H", self.d[p:p + seg2])
            for i in range(sc):
                for c in range(starts[i], ends[i] + 1):
                    if c == 0xFFFF:
                        continue
                    if ranges[i] == 0:
                        g = (c + deltas[i]) & 0xFFFF
                    else:
                        a = ro_pos + 2 * i + ranges[i] + 2 * (c - starts[i])
                        g = struct.unpack(">H", self.d[a:a + 2])[0]
                        if g:
                            g = (g + deltas[i]) & 0xFFFF
                    m[c] = g
        else:
            ng = struct.unpack(">I", self.d[base + 12:base + 16])[0]
            for i in range(ng):
                s, e, g = struct.unpack(">III", self.d[base + 16 + 12 * i:base + 28 + 12 * i])
                for c in range(s, e + 1):
                    m[c] = g + (c - s)
        return m

    def advance(self, gid):
        o = self.t["hmtx"][0]
        i = min(gid, self.n_hm - 1)
        return struct.unpack(">H", self.d[o + 4 * i:o + 4 * i + 2])[0]

    def glyph_path(self, ch):
        """SVG-pad (y omgedraaid, in font-eenheden) en bounding box van één glyph."""
        gid = self.cmap[ord(ch)]
        go = self.t["glyf"][0] + self.loca[gid]
        nc, xmin, ymin, xmax, ymax = struct.unpack(">hhhhh", self.d[go:go + 10])
        if nc < 0:
            raise ValueError(f"samengestelde glyph voor {ch!r} niet ondersteund")
        p = go + 10
        ends = list(struct.unpack(f">{nc}H", self.d[p:p + 2 * nc])); p += 2 * nc
        il = struct.unpack(">H", self.d[p:p + 2])[0]; p += 2 + il
        npts = ends[-1] + 1
        flags = []
        while len(flags) < npts:
            f = self.d[p]; p += 1
            flags.append(f)
            if f & 8:
                r = self.d[p]; p += 1
                flags.extend([f] * r)
        def coords(short_bit, same_bit):
            nonlocal p
            out, v = [], 0
            for f in flags:
                if f & short_bit:
                    b = self.d[p]; p += 1
                    v += b if f & same_bit else -b
                elif not f & same_bit:
                    v += struct.unpack(">h", self.d[p:p + 2])[0]; p += 2
                out.append(v)
            return out
        xs = coords(2, 16)
        ys = coords(4, 32)
        pts = list(zip(xs, [-y for y in ys], [bool(f & 1) for f in flags]))
        d, start = [], 0
        for e in ends:
            d.append(self._contour(pts[start:e + 1]))
            start = e + 1
        return " ".join(d), (xmin, -ymax, xmax, -ymin), self.advance(gid)

    @staticmethod
    def _contour(c):
        def mid(a, b):
            return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        if c[0][2]:
            i0 = 0
        elif c[-1][2]:
            c = [c[-1]] + c[:-1]
            i0 = 0
        else:
            c = [(*mid(c[0], c[-1]), True)] + c
            i0 = 0
        start = c[i0]
        cmds = [f"M{start[0]:g} {start[1]:g}"]
        i, n = 1, len(c)
        ring = c + [start]
        while i < len(ring):
            pt = ring[i]
            if pt[2]:
                cmds.append(f"L{pt[0]:g} {pt[1]:g}"); i += 1
            else:
                nxt = ring[i + 1] if i + 1 < len(ring) else start
                if nxt[2]:
                    cmds.append(f"Q{pt[0]:g} {pt[1]:g} {nxt[0]:g} {nxt[1]:g}"); i += 2
                else:
                    m = mid(pt, nxt)
                    cmds.append(f"Q{pt[0]:g} {pt[1]:g} {m[0]:g} {m[1]:g}"); i += 1
        cmds.append("Z")
        return "".join(cmds)


# ----------------------------------------------------------------------------
# Symbool
# ----------------------------------------------------------------------------
def symbol_geometry(h=6.45, shift=30.0, top=8.0, bottom=56.0, half=18.0, apex_y=54.0):
    """
    Twee V's (A en B, B is verschoven). Geeft (pad A+B, ruit, bbox) in eigen eenheden.
    h = halve armdikte (horizontaal), shift = verschuiving van B ten opzichte van A.
    """
    k = half / (apex_y - top)           # helling van de armen
    xl, xr = 0.0, 2 * half              # armmidden bovenaan
    xm = (xl + xr) / 2
    H = bottom - top

    def v(dx):
        inner_y = top + (half - h) / k
        pts = [
            (xl - h + dx, top), (xl + h + dx, top), (xm + dx, inner_y),
            (xr - h + dx, top), (xr + h + dx, top),
            (xr + h - k * H + dx, bottom), (xl - h + k * H + dx, bottom),
        ]
        return pts

    A, B = v(0.0), v(shift)
    # overlap-ruit (A's rechterarm x B's linkerarm)
    t1 = (xr - xl - shift) / (2 * k)
    t3 = (xr - xl - shift + 2 * h) / (2 * k)
    def L(t): return max(xr - h - k * t, xl + shift - h + k * t)
    def U(t): return min(xr + h - k * t, xl + shift + h + k * t)
    apex_x = (xl + shift - h + k * t3)
    diamond = [
        (xr - h, top), (xl + shift + h, top),
        (U(t1), top + t1), (apex_x, top + t3), (L(t1), top + t1),
    ]
    xs = [p[0] for p in A + B]
    bbox = (min(xs), top, max(xs), bottom)
    return A, B, diamond, bbox


def poly(pts, ox, oy, s):
    return "M" + " L".join(f"{(x - ox) * s:.3f} {(y - oy) * s:.3f}" for x, y in pts) + " Z"


def symbol_svg_parts(scale, ox, oy, ink, accent, params, mono=False):
    A, B, dia, bbox = symbol_geometry(**params)
    base = f'<path fill="{ink}" fill-rule="evenodd" d="{poly(A, ox, oy, scale)} {poly(B, ox, oy, scale)}"/>'
    if mono:
        return base          # de ruit blijft als negatieve ruimte open
    return base + f'<path fill="{accent}" d="{poly(dia, ox, oy, scale)}"/>'


# ----------------------------------------------------------------------------
# Woordmerk
# ----------------------------------------------------------------------------
def wordmark(font, text="Werkly", size=1.0, bold=34, tracking=-6, kern=None):
    """Geeft (pad, breedte, capheight, xheight) in font-eenheden * size."""
    kern = kern or {("W", "e"): -26}
    x, paths = 0.0, []
    for i, ch in enumerate(text):
        d, bb, adv = font.glyph_path(ch)
        paths.append(f'<g transform="translate({x:g} 0)"><path d="{d}"/></g>')
        x += adv + tracking
        if i + 1 < len(text):
            x += kern.get((ch, text[i + 1]), 0)
    cap = -font.glyph_path("W")[1][1]
    xh = -font.glyph_path("e")[1][1]
    return "".join(paths), x - tracking, cap, xh


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    # Alleen eigen uitvoer vervangen; index.html (de presentatie) blijft staan.
    for pattern in ("werkly-*.svg", "favicon.svg", "app-icon*.svg"):
        for old in OUT.glob(pattern):
            old.unlink()
    font = TTF(FONT)
    wm, wm_w, cap, xh = wordmark(font)
    BOLD = 34

    # ---- eenheden: alles in "cap-height = 100" ----
    S = 100.0 / cap                      # font-eenheden -> logo-eenheden
    gap = 30.0
    params = dict(h=6.4, shift=22.0)
    A, B, dia, bb = symbol_geometry(**params)
    sym_h = 100.0                        # symbool even hoog als de hoofdletters
    ss = sym_h / (bb[3] - bb[1])
    sym_w = (bb[2] - bb[0]) * ss

    def wordmark_group(color):
        return (f'<g transform="translate({sym_w + gap:.3f} 100) scale({S:.5f})" fill="{color}" '
                f'stroke="{color}" stroke-width="{BOLD}" stroke-linejoin="miter" stroke-miterlimit="3">{wm}</g>')

    pad = 6
    width = sym_w + gap + wm_w * S
    desc = 0.24 * 100                    # ruimte voor de staart van de y
    vb = f"{-pad:.0f} {-pad:.0f} {width + 2 * pad:.1f} {100 + desc + 2 * pad:.1f}"

    def symbol_in_logo(ink, accent, mono=False):
        return f'<g transform="translate(0 0)">{symbol_svg_parts(ss, bb[0], bb[1], ink, accent, params, mono)}</g>'

    def logo(name, ink, accent, mono=False, bg=None):
        rect = f'<rect x="-{pad}" y="-{pad}" width="{width + 2*pad:.1f}" height="{100 + desc + 2*pad:.1f}" fill="{bg}"/>' if bg else ""
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Werkly">{rect}'
               f'{symbol_in_logo(ink, accent, mono)}{wordmark_group(ink)}</svg>\n')
        (OUT / name).write_text(svg, encoding="utf8")

    logo("werkly-logo.svg", INK, TEAL)
    logo("werkly-logo-inverse.svg", WHITE, TEAL_DARK)
    logo("werkly-logo-black.svg", "#000000", None, mono=True)
    logo("werkly-logo-white.svg", WHITE, None, mono=True)

    # ---- alleen symbool ----
    sym_pad = 4
    sw, sh = sym_w, sym_h
    def symbol(name, ink, accent, mono=False, bg=None):
        rect = f'<rect x="-{sym_pad}" y="-{sym_pad}" width="{sw + 2*sym_pad:.1f}" height="{sh + 2*sym_pad:.1f}" fill="{bg}"/>' if bg else ""
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-{sym_pad} -{sym_pad} {sw + 2*sym_pad:.1f} {sh + 2*sym_pad:.1f}" role="img" aria-label="Werkly">'
               f'{rect}{symbol_svg_parts(ss, bb[0], bb[1], ink, accent, params, mono)}</svg>\n')
        (OUT / name).write_text(svg, encoding="utf8")
    symbol("werkly-symbol.svg", INK, TEAL)
    symbol("werkly-symbol-inverse.svg", WHITE, TEAL_DARK)
    symbol("werkly-symbol-black.svg", "#000000", None, mono=True)
    symbol("werkly-symbol-white.svg", WHITE, None, mono=True)

    # ---- alleen woordmerk ----
    ww = wm_w * S
    for name, color in (("werkly-wordmark.svg", INK), ("werkly-wordmark-white.svg", WHITE)):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-{pad} -{pad} {ww + 2*pad:.1f} {100 + desc + 2*pad:.1f}" role="img" aria-label="Werkly">'
               f'<g transform="translate(0 100) scale({S:.5f})" fill="{color}" stroke="{color}" stroke-width="{BOLD}" stroke-linejoin="miter" stroke-miterlimit="3">{wm}</g></svg>\n')
        (OUT / name).write_text(svg, encoding="utf8")

    # ---- favicon / app-icoon: dikkere armen zodat het op 16px blijft staan ----
    fav_params = dict(h=8.2, shift=19.0)
    fA, fB, fd, fbb = symbol_geometry(**fav_params)
    def tile(name, size, radius, bg, ink, accent, inner):
        fs = inner / (fbb[2] - fbb[0])
        ox = fbb[0] - (size / fs - (fbb[2] - fbb[0])) / 2
        oy = fbb[1] - (size / fs - (fbb[3] - fbb[1])) / 2
        parts = symbol_svg_parts(fs, ox, oy, ink, accent, fav_params)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Werkly">'
               f'<rect width="{size}" height="{size}" rx="{radius}" fill="{bg}"/>{parts}</svg>\n')
        (OUT / name).write_text(svg, encoding="utf8")
    tile("favicon.svg", 64, 14, INK, WHITE, TEAL_DARK, 46)
    tile("app-icon.svg", 1024, 228, INK, WHITE, TEAL_DARK, 640)
    tile("app-icon-light.svg", 1024, 228, "#F4F6F9", INK, TEAL, 640)
    print("klaar:", ", ".join(sorted(p.name for p in OUT.glob("*.svg"))))


if __name__ == "__main__":
    build()
