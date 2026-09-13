#!/bin/sh
# 월페이퍼 원본(wallpapers-originals/, 깃에 안 올림)에서 앱에 넣는 webp를 만든다.
# 원본은 3344px PNG라 장당 10MB다. 앱·랜딩에는 가로 2880px(15인치 레티나 전체 화면) webp만 넣는다.
#
#   npm run wallpapers                  public/wallpapers에 있는 webp를 전부 원본에서 다시 만든다
#   npm run wallpapers -- cozy-cafe     그 원본 하나만 만든다 (새 월페이퍼 추가)
#
# cwebp가 필요하다: brew install webp
set -e
cd "$(dirname "$0")/.."
src=wallpapers-originals
out=public/wallpapers

if [ $# -eq 0 ]; then
  set -- $(ls "$out"/*.webp | xargs -n1 basename | sed 's/\.webp$//')
fi

for name in "$@"; do
  if [ ! -f "$src/$name.png" ]; then
    echo "원본 없음: $src/$name.png" >&2
    exit 1
  fi
  cwebp -quiet -q 82 -resize 2880 0 "$src/$name.png" -o "$out/$name.webp"
  echo "$out/$name.webp  $(( $(stat -f%z "$out/$name.webp") / 1024 ))KB"
done
