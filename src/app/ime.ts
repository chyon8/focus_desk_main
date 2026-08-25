import type React from 'react';

/**
 * True while an input method is still assembling a character — Korean and
 * Japanese input both send an Enter that ends the composition before the Enter
 * that means "done".
 *
 * Acting on the first one clears the field, and then the composition lands back
 * in it: the last syllable stays behind while the rest is submitted.
 */
export function isComposing(e: React.KeyboardEvent) {
  // keyCode 229 is the fallback: Safari and some IMEs leave `isComposing` false
  // on the keydown that commits.
  return e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
}
