import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ALLOW_POPUPS } from './browserLinks';

describe('ALLOW_POPUPS', () => {
  // Without the attribute a webview answers `window.open` with null, which every
  // sign-in reports as a blocked popup. React writes the string and drops the
  // boolean, so the shape of this value is the whole point.
  it('reaches the DOM, which the JSX boolean does not', () => {
    expect(renderToStaticMarkup(createElement('webview', { ...ALLOW_POPUPS }))).toContain(
      'allowpopups'
    );
    expect(renderToStaticMarkup(createElement('webview', { allowpopups: true }))).not.toContain(
      'allowpopups'
    );
  });
});
