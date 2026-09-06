/**
 * 사진 배경의 평균 색.
 *
 * 위젯 면 색과 명암 극성을 이 색에서 뽑는다. 예전에는 사진이면 테마가 들고 있는
 * 고정 hex를 그대로 썼는데, 온보딩의 Meadow·Cabin처럼 테마는 그대로 두고 그림만
 * 바꾸는 배경이 있어서 밝은 초록 사진 위에 어두운 남색 위젯이 섰다.
 *
 * 16x16으로 줄여 그린 뒤 평균을 낸다 — 한 픽셀로 줄이면 브라우저가 알아서
 * 평균을 내주지만 구현에 따라 결과가 갈리고, 16x16이면 값이 안정적이면서 읽는
 * 비용도 없다시피 하다.
 */
const cache = new Map<string, Promise<string | null>>();

function measure(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 16, 16);
        const { data } = ctx.getImageData(0, 0, 16, 16);
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        const n = data.length / 4;
        const hex = [r, g, b]
          .map((c) => Math.round(c / n).toString(16).padStart(2, '0'))
          .join('');
        resolve(`#${hex}`);
      } catch {
        // 캔버스가 오염되면 읽을 수 없다. 테마가 적어둔 값으로 돌아간다.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function photoTone(src: string): Promise<string | null> {
  const hit = cache.get(src);
  if (hit) return hit;
  const run = measure(src);
  cache.set(src, run);
  return run;
}
