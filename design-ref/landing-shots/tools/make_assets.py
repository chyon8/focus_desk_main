# Swatch and wordmark cards for the demo boards (2026-09-14). Each card is made in the proportion it
# takes on a board, so a full-bleed card crops nothing: swatch 1000x520 (200x104 card),
# Birch Inn 1000x1140, Ondo 1000x1250, Nightbird 1000x1000. Writes into ./assets next to this file.
import os
from PIL import Image, ImageDraw, ImageFont, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')
os.makedirs(OUT, exist_ok=True)

S = '/System/Library/Fonts/Supplemental/'
F = '/System/Library/Fonts/'
FUT = S + 'Futura.ttc'
DID = S + 'Didot.ttc'
AVN = F + 'Avenir Next.ttc'


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(rgb):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = map(ch, rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ink_for(rgb):
    return (38, 30, 24) if lum(rgb) > 0.3 else (244, 238, 228)


def grain(img, amount=10):
    noise = Image.effect_noise(img.size, 40).convert('L')
    noise = noise.point(lambda v: 128 + (v - 128) * amount // 40)
    return ImageChops.overlay(img, Image.merge('RGB', (noise, noise, noise)))


def spaced(draw, xy, text, fnt, fill, tracking=0, center=False):
    widths = [draw.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x, y = xy
    if center:
        x -= total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += w + tracking


def swatch(name, hexv, size=(1000, 520)):
    rgb = hexrgb(hexv)
    img = grain(Image.new('RGB', size, rgb), 5)
    spaced(ImageDraw.Draw(img), (54, 50), hexv.upper(), font(AVN, 50, 5), ink_for(rgb), tracking=2)
    img.save(os.path.join(OUT, f'swatch-{name}.png'))


def wordmark_birch():
    W, H = 1000, 1140
    ink = hexrgb('#2F3B31')
    img = grain(Image.new('RGB', (W, H), hexrgb('#E7DDCB')), 8)
    d = ImageDraw.Draw(img)
    f = font(DID, 150)
    d.line([(W / 2 - 36, 420), (W / 2 + 36, 420)], fill=ink, width=3)
    d.text(((W - d.textlength('Birch Inn', font=f)) / 2, 470), 'Birch Inn', font=f, fill=ink)
    spaced(d, (W / 2, 700), 'ROOMS  ·  SAUNA  ·  LAKE', font(AVN, 28, 5), ink, tracking=8, center=True)
    img.save(os.path.join(OUT, 'wordmark-birch.png'))


def wordmark_ondo():
    # One ink on kraft, lowercase, the roast date stamped by hand: the three decisions in the Ondo memo.
    W, H = 1000, 1250
    ink, rust = hexrgb('#2B2019'), hexrgb('#B4532A')
    img = grain(Image.new('RGB', (W, H), hexrgb('#C8A57A')), 14)
    d = ImageDraw.Draw(img)
    f = font(FUT, 300, 0)
    d.text(((W - d.textlength('ondo', font=f)) / 2, 330), 'ondo', font=f, fill=ink)
    spaced(d, (W / 2, 720), 'COFFEE ROASTERS', font(AVN, 34, 5), ink, tracking=10, center=True)
    stamp = Image.new('RGBA', (430, 150), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stamp)
    sd.rectangle([4, 4, 425, 145], outline=rust + (230,), width=5)
    spaced(sd, (215, 38), 'ROASTED 09.12', font(AVN, 44, 0), rust + (230,), tracking=4, center=True)
    stamp = stamp.rotate(-4, expand=True, resample=Image.BICUBIC)
    img.paste(stamp, (int(W / 2 - stamp.width / 2), 900), stamp)
    img.save(os.path.join(OUT, 'wordmark-ondo.png'))


def wordmark_nightbird():
    W, H = 1000, 1000
    ink = hexrgb('#E9DDFF')
    img = grain(Image.new('RGB', (W, H), hexrgb('#1A1530')), 10)
    d = ImageDraw.Draw(img)
    f = font(FUT, 200, 4)
    spaced(d, (W / 2, 250), 'NIGHT', f, ink, tracking=6, center=True)
    spaced(d, (W / 2, 470), 'BIRD', f, hexrgb('#C2407E'), tracking=6, center=True)
    spaced(d, (W / 2, 780), 'LP  —  2026', font(AVN, 32, 5), ink, tracking=10, center=True)
    img.save(os.path.join(OUT, 'wordmark-nightbird.png'))


if __name__ == '__main__':
    for name, hexv in [
        ('birch', '#E4D5BD'), ('pine', '#2F3B31'), ('ember', '#BF5A2E'), ('wool', '#CDB89C'),
        ('kraft', '#C9A77C'), ('espresso', '#2B2019'), ('rust', '#B4532A'), ('oat', '#EAE0CC'),
        ('violet', '#5B3FA0'), ('rose', '#C2407E'), ('night', '#1A1530'), ('lilac', '#CDB8F0'),
    ]:
        swatch(name, hexv)
    wordmark_birch()
    wordmark_ondo()
    wordmark_nightbird()
    print('assets written to', OUT)
