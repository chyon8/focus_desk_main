# Wallpaper Generation Prompt

Focus Desk용 새 월페이퍼를 만들 때 쓰는 프롬프트다.

## 사용법

1. 아래 참조 이미지 중 **한 장만** 이미지 생성 도구에 스타일 참조로 입력한다.
2. `REFERENCE PROFILE`에는 이 문서 아래의 해당 프로필을 붙인다.
3. 장면을 직접 정하려면 `NEW SCENE`을 채운다. 비워두면 참조와 겹치지 않는 장면을 새로 정하게 한다.
4. 장면별로 이미지 생성 호출을 따로 한다. 여러 스타일을 한 이미지에 섞지 않는다.

참조 이미지:

- `assets/wallpapers/originals/rainy-attic.png`

Codex에 짧게 지시할 때는 이렇게 말한다.

> `design-ref/WALLPAPER-GENERATION-PROMPT.md`를 읽고 `[참조 파일명]`을 실제 참조 이미지로 입력해서 새 월페이퍼를 만들어줘. 장면은 완전히 새로 정해. 먼저 미리보기만 보여줘.

## 바로 쓰는 프롬프트

```text
Use case: stylized-concept
Asset type: Focus Desk desktop wallpaper
Input images: Image 1 is the primary reference for color design and mark-making. It is not an edit target and its scene must not be reconstructed.

PRIMARY REQUEST
Create one original illustrated wallpaper. Transfer the reference image's underlying visual system into a completely different scene. The result should produce the same kind of visual pleasure through its color relationships and method of depiction, while showing new geography, season, objects, activity, silhouettes, and spatial arrangement.

Treat the reference as concrete art direction, not as a vague mood cue. Before composing, inspect it closely and internally identify:
- dominant hue families and their relative occupied area;
- value structure and the separation of foreground, middle ground, and distance;
- saturation hierarchy: which large areas stay restrained and where small vivid accents occur;
- warm/cool relationships and how light and shadow shift hue;
- outline color, weight, irregularity, and where outlines disappear;
- shape language, brush size, edge softness, texture, grain, and degree of simplification;
- distribution of detail: which focal areas are resolved and which areas are deliberately omitted.

Apply those relationships to the new scene. A palette is not a list of sampled colors: preserve the roles, proportions, adjacency, contrast, and accent concentration that make those colors work together. Use varied marks and edge treatment according to depth and importance. Keep the same degree of simplification as the reference.

REFERENCE PROFILE
[Paste one reference profile from this document here.]

NEW SCENE
[Optional: describe a new place, season, weather, objects, and one simple human action. If left blank, invent them. They must be clearly different from the reference and from previously generated wallpapers. Prefer an ordinary place with one readable event over a spectacular fantasy vista.]

SCENE RECOMPOSITION
- Change the location, season or weather, principal objects, action, camera position, and focal silhouette.
- Do not reuse the reference's composition, landmark shapes, character design, distinctive props, or narrative setup.
- Use at most one or two small anonymous people. Faces are not focal points.
- Give the image one clear focal relationship and enough quieter areas to work behind desktop widgets.

COMPOSITION
Wide 16:9 landscape wallpaper. Use a clear foreground, middle ground, and distance where appropriate. Keep the main subject inside the central 70% so centered 16:10 and ultrawide cover crops remain coherent. Avoid important content at the extreme top, bottom, and side edges. The scene must still read as a small thumbnail.

AVOID THE GENERIC AI LOOK
Avoid uniform micro-detail across the whole image, repeated foliage or object patterns, glossy 3D materials, airbrushed surfaces, fake depth of field, excessive bloom, teal-orange cinematic grading, symmetrical concept-art staging, decorative clutter, oversharpening, and applying one texture uniformly to every surface. Do not make every edge crisp or every object equally important.

CONSTRAINTS
No recognizable franchise characters or locations. No copied composition. No text, signage, logos, or watermark. Keep anatomy and object structure coherent. Produce one image only.
```

## Reference profiles

### `rainy-attic.png`

```text
Carry over the reference's delicate, slightly irregular dark contours, gently uneven object shapes, simple two- or three-tone cel shadows, matte gouache color fills, selective small details, and soft analog grain. Keep surfaces visibly hand-drawn rather than dimensionally rendered. Use broad quiet areas against a few resolved focal clusters so the wallpaper remains usable behind widgets.

Preserve its warm/cool lighting relationship: restrained warm terracotta, honey, or cream light against cooler slate blue-violet shadows that keep their detail. Do not copy the attic architecture, frontal window composition, rainy weather, bed, desk arrangement, cat, rooftops, plants, framed pictures, or narrative setup.
```

## 한 번에 고칠 때 쓰는 프롬프트

결과가 방향은 맞지만 AI 이미지처럼 보이면, 원본과 새 결과를 함께 입력하고 아래에서 문제 하나만 골라 수정한다.

```text
Use case: style-transfer
Input images: Image 1 is the original style reference. Image 2 is the generated wallpaper to correct.
Primary request: Correct only [palette relationship / mark-making / detail density / edge hierarchy] in Image 2 so it follows Image 1 more closely.
Constraints: Preserve Image 2's scene, composition, objects, people, proportions, and 16:9 framing. Change only the named visual property. Do not add objects, text, logos, or watermark.
```

판정 기준:

- 장면을 지우고 색만 봐도 참조와 색의 비중과 온도 관계가 이어지는가.
- 작은 초점과 넓은 조용한 면의 비율이 참조와 비슷한가.
- 전경부터 원경까지 윤곽선·붓질·디테일이 같은 강도로 반복되지 않는가.
- 참조의 사물과 배치를 빌리지 않아도 같은 표현 원리가 느껴지는가.
- 축소판과 중앙 크롭에서도 초점이 남고 위젯 뒤에서 과하게 시끄럽지 않은가.
