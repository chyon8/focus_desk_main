"""Focus Desk app icon: a desk lamp's light pooling on a desk, in the app's palette."""
from PIL import Image, ImageDraw, ImageFilter

S = 1024
MARGIN = 96                      # macOS tiles do not run to the edge
BOX = (MARGIN, MARGIN, S - MARGIN, S - MARGIN)
RADIUS = 196

TOP = (56, 38, 28)               # warm dark, same family as the Lofi Room theme
BOTTOM = (19, 13, 10)
ACCENT = (232, 168, 124)
LIGHT = (255, 233, 205)

BULB = (512, 330)
DESK_Y = 700


def rounded_mask():
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(BOX, RADIUS, fill=255)
    return mask


def vertical_gradient():
    strip = Image.new('RGB', (1, S))
    for y in range(S):
        t = y / (S - 1)
        strip.putpixel((0, y), tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)))
    return strip.resize((S, S)).convert('RGBA')


def glow(center, radius, color, alpha, blur):
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    x, y = center
    ImageDraw.Draw(layer).ellipse(
        (x - radius, y - radius, x + radius, y + radius), fill=(*color, alpha)
    )
    return layer.filter(ImageFilter.GaussianBlur(blur))


def light_cone():
    """A shaft of light from the bulb to the desk, fading as it falls."""
    shape = Image.new('L', (S, S), 0)
    ImageDraw.Draw(shape).polygon(
        [(BULB[0] - 62, BULB[1]), (BULB[0] + 62, BULB[1]),
         (BULB[0] + 322, DESK_Y + 34), (BULB[0] - 322, DESK_Y + 34)],
        fill=255,
    )

    falloff = Image.new('L', (1, S), 0)
    for y in range(S):
        if y < BULB[1]:
            value = 0
        elif y > DESK_Y + 34:
            value = 0
        else:
            t = (y - BULB[1]) / (DESK_Y + 34 - BULB[1])
            value = round(150 - 96 * t)
        falloff.putpixel((0, y), value)

    alpha = Image.new('L', (S, S), 0)
    alpha.paste(falloff.resize((S, S)), (0, 0), shape)

    cone = Image.new('RGBA', (S, S), (255, 190, 138, 0))
    cone.putalpha(alpha.filter(ImageFilter.GaussianBlur(22)))
    return cone


tile = vertical_gradient()

tile.alpha_composite(glow(BULB, 210, (255, 176, 112), 120, 110))   # room light
tile.alpha_composite(light_cone())
tile.alpha_composite(glow((512, DESK_Y), 230, (255, 186, 126), 96, 70))  # pool on the desk
tile.alpha_composite(glow(BULB, 96, (255, 214, 168), 190, 44))     # halo around the bulb

draw = ImageDraw.Draw(tile)
draw.ellipse((BULB[0] - 74, BULB[1] - 74, BULB[0] + 74, BULB[1] + 74), fill=(*LIGHT, 255))
draw.rounded_rectangle((512 - 300, DESK_Y, 512 + 300, DESK_Y + 56), 28, fill=(*ACCENT, 255))

icon = Image.new('RGBA', (S, S), (0, 0, 0, 0))
icon.paste(tile, (0, 0), rounded_mask())
icon.save('/Users/isangmin/Desktop/JS/focus_desk/build/icon.png')
print('wrote build/icon.png')
