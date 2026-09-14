# Builds the canvas working files: one artboard per screenshot, canvas.json with four pages
# and plain notes. Images go in as 1440x900 webp; full-size copies go to design-ref/landing-shots.
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'canvas')
FULL = '/Users/isangmin/Desktop/JS/focus_desk/design-ref/landing-shots'
os.makedirs(OUT, exist_ok=True)
os.makedirs(FULL, exist_ok=True)

W, H = 1440, 900
COL = W + 80
ROW = H + 240

# page id, page name, page note, columns, items: (stem, image, file name, artboard title, full-size name)
PAGES = [
    ('page-1', '무드보드 · 세 가지 모양',
     '피드백 반영: 색 마크를 뺐다. 사진은 무드보드처럼 한 덩어리로 모으고, 방에서 눈에 띄는 것은 비워 뒀다.\n'
     '같은 보드를 세 가지로 찍었다.\n'
     '① 지금 앱 · 어두운 카드 (방의 기본 밝기)\n'
     '② 지금 앱 · 밝은 카드 (Atmosphere에서 Light)\n'
     '③ 미리보기 · 사진 위젯의 윗단과 캡션을 뺀 모양. 지금 앱에는 없다. 이쪽이 낫다면 사진 위젯 디자인을 바꿔야 한다',
     3, [
         ('B02Dark', 'out/s02-v4-dark.png', 'b02-dark.webp', '2 · Birch Inn · 지금 앱 · 어두운 카드', '02-birch-dark'),
         ('B02Light', 'out/s02-v4-light.png', 'b02-light.webp', '2 · Birch Inn · 지금 앱 · 밝은 카드', '02-birch-light'),
         ('B02Bleed', 'out/s02-v4-bleed.png', 'b02-bleed.webp', '2 · Birch Inn · 미리보기 · 사진 꽉 채움 (앱에 없음)', '02-birch-preview'),
         ('B14Dark', 'out/s14-v1-dark.png', 'b14-dark.webp', '14 · Ondo · 지금 앱 · 어두운 카드', '14-ondo-dark'),
         ('B14Light', 'out/s14-v1-light.png', 'b14-light.webp', '14 · Ondo · 지금 앱 · 밝은 카드', '14-ondo-light'),
         ('Main', 'out/s14-v1-bleed.png', 'b14-bleed.webp', '14 · Ondo · 미리보기 · 사진 꽉 채움 (앱에 없음)', '14-ondo-preview'),
         ('B15Dark', 'out/s15-v1-dark.png', 'b15-dark.webp', '15 · Nightbird · 지금 앱 · 어두운 카드', '15-nightbird-dark'),
         ('B15Light', 'out/s15-v1-light.png', 'b15-light.webp', '15 · Nightbird · 지금 앱 · 밝은 카드', '15-nightbird-light'),
         ('B15Bleed', 'out/s15-v1-bleed.png', 'b15-bleed.webp', '15 · Nightbird · 미리보기 · 사진 꽉 채움 (앱에 없음)', '15-nightbird-preview'),
     ],
     ['2 · Birch Inn (캐빈 호텔) · Snowy Railway\n보려는 것: 하늘과 왼쪽에 모아도 불 켜진 오두막이 살아 있는가',
      '14 · Ondo (카페 리브랜드) · Rainy Attic\n보려는 것: 창 아래 낮은 보드가 창과 램프를 가리지 않고 끌리는가',
      '15 · Nightbird (앨범) · Midnight Observatory\n보려는 것: 하늘 전체를 보드로 써도 돔과 호수 불빛이 남는가']),
    ('page-2', '새 시안 1–7',
     '처음 기획의 새 시안. 색 마크만 빼고 다시 찍었다. 2번은 무드보드 페이지로 옮겼다.\n7번은 1, 2(밝은 카드), 5번의 한 부분을 4배로 찍은 것.',
     2, [
         ('S01', 'out/f01.png', 's01.webp', '1 · 여백 · Rainy Attic', '01-margin'),
         ('S03', 'out/f03.png', 's03.webp', '3 · 전체 보기 · Midnight Observatory', '03-overview'),
         ('S04', 'out/f04.png', 's04.webp', '4 · 페이지 하나 · Summer Lake, 밝은 UI', '04-one-page'),
         ('S05', 'out/f05.png', 's05.webp', '5 · 컬럼 · Snowy Railway', '05-columns'),
         ('S06', 'out/f06.png', 's06.webp', '6 · 사진 없음 · Editorial', '06-editorial'),
         ('S07A', 'out/f07a.png', 's07a.webp', '7 · 확대 · 1번 메모와 사진', '07a-closeup'),
         ('S07B', 'out/f07b.png', 's07b.webp', '7 · 확대 · 2번 밝은 카드', '07b-closeup'),
         ('S07C', 'out/f07c.png', 's07c.webp', '7 · 확대 · 5번 카드', '07c-closeup'),
     ],
     None),
    ('page-3', '처음 기획 8–11',
     '처음 기획 A–D. 같은 구도에 이야기와 방만 바꿨다. 웹앱은 로그인 화면 대신 로고 칸으로 둔다.\n10번은 배를 비우려고 페이지를 오른쪽으로 옮겼다.',
     2, [
         ('S08', 'out/f08.png', 's08.webp', '8 · A 카페 리브랜드 · Rainy Attic', '08-a-cafe'),
         ('S09', 'out/f09.png', 's09.webp', '9 · B 개발자 출시 · Midnight Observatory', '09-b-launch'),
         ('S10', 'out/f10.png', 's10.webp', '10 · C 글쓰기 · Summer Lake', '10-c-essay'),
         ('S11', 'out/f11.png', 's11.webp', '11 · D · A와 같은 내용 · Paper', '11-d-paper'),
     ],
     None),
    ('page-4', '방 넷 밖 12–13',
     '방 넷은 정해져 있다. 넷보다 눈길을 더 끄는 방이 있는지 비교만 한다. 내용은 1번과 같다.',
     2, [
         ('S12', 'out/f12.png', 's12.webp', '12 · late-summer-aquarium', '12-aquarium'),
         ('S13', 'out/f13.png', 's13.webp', '13 · winter-lake-greenhouse, 눈', '13-greenhouse'),
     ],
     None),
    ('page-5', '피드백 전 (첫 묶음)',
     '2026-09-14 피드백 전에 찍은 첫 묶음. 색 마크(clay·denim)가 있고, 사진은 윗단·캡션이 있는 사진 위젯 그대로다.\n'
     '7번 확대와 8–13번은 피드백 뒤에 처음 찍어서 여기 없다.',
     2, [
         ('P01', 'out/s01-v3.png', 'p01.webp', '1 · 여백 · 피드백 전', 'before/01-margin'),
         ('P01L', 'out/s01-v2.png', 'p01l.webp', '1 · 여백 · 버린 배치 (왼쪽 L자)', 'before/01-margin-l'),
         ('P02', 'out/s02-v2.png', 'p02.webp', '2 · 무드보드 · 피드백 전', 'before/02-moodboard'),
         ('P03', 'out/s03-v3.png', 'p03.webp', '3 · 전체 보기 · 피드백 전', 'before/03-overview'),
         ('P04', 'out/s04-v2.png', 'p04.webp', '4 · 페이지 하나 · 피드백 전 (Unsplash, 광고가 보여서 교체)', 'before/04-one-page'),
         ('P05', 'out/s05-v3.png', 'p05.webp', '5 · 컬럼 · 피드백 전', 'before/05-columns'),
         ('P06', 'out/s06-v2.png', 'p06.webp', '6 · 사진 없음 · 피드백 전', 'before/06-editorial'),
     ],
     None),
]

ARTBOARD = '''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body {{ margin: 0; background: #16161a; }}
    a {{ color: #b45309; }} a:hover {{ color: #92400e; }}
  </style>
</helmet>
<img src="{image}" alt="{alt}" style="display: block; width: 1440px; height: 900px;">
</x-dc>
</body>
</html>
'''

artboards, annotations, pages, files, sizes = [], [], [], [], []
for page_id, page_name, page_note, cols, items, row_notes in PAGES:
    pages.append({'id': page_id, 'name': page_name})
    annotations.append({'id': f'{page_id}-note', 'x': 0, 'y': -300, 'w': 1400, 'text': page_note, 'page': page_id})
    for i, (stem, src, webp, title, full) in enumerate(items):
        im = Image.open(os.path.join(HERE, src)).convert('RGB')
        full_path = os.path.join(FULL, f'{full}.jpg')
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        im.save(full_path, quality=90)
        small = im.resize((W, H), Image.LANCZOS)
        path = os.path.join(OUT, webp)
        small.save(path, 'WEBP', quality=80, method=6)
        sizes.append((webp, os.path.getsize(path) // 1024))
        with open(os.path.join(OUT, f'{stem}.dc.html'), 'w') as fh:
            fh.write(ARTBOARD.format(image=webp, alt=title))
        files.append(stem)
        c, r = i % cols, i // cols
        artboards.append({'file': f'{stem}.dc.html', 'x': c * COL, 'y': r * ROW, 'w': W, 'h': H, 'title': title, 'page': page_id})
    if row_notes:
        for r, text in enumerate(row_notes):
            annotations.append({'id': f'{page_id}-row{r}', 'x': -560, 'y': r * ROW, 'w': 480, 'text': text, 'page': page_id})

canvas = {'pages': pages, 'artboards': artboards, 'annotations': annotations, 'launch': {'view': 'canvas', 'page': 'page-1'}}
with open(os.path.join(OUT, 'canvas.json'), 'w') as fh:
    json.dump(canvas, fh, ensure_ascii=False, indent=2)
print('artboards', len(artboards), 'total KB', sum(s for _, s in sizes), 'max', max(sizes, key=lambda s: s[1]))
print(' '.join(f'--artboard {f}.dc.html' for f in files))
print(' '.join(f'--image {w}' for w, _ in sizes))
