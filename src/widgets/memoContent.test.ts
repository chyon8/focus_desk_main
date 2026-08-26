import { describe, it, expect } from 'vitest';
import { asDocument, documentSummary, isHtml, textToHtml } from './memoContent';

describe('textToHtml', () => {
  it('makes a paragraph per blank-line block and a break per newline', () => {
    expect(textToHtml('one\ntwo\n\nthree')).toBe('<p>one<br>two</p><p>three</p>');
  });

  it('escapes text that would otherwise be read as markup', () => {
    expect(textToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
  });

  it('is empty for whitespace', () => {
    expect(textToHtml('  \n\n ')).toBe('');
  });
});

describe('asDocument', () => {
  it('leaves a document alone', () => {
    expect(asDocument('<p>kept</p>')).toBe('<p>kept</p>');
    expect(isHtml('<p>kept</p>')).toBe(true);
  });

  it('converts a note that was typed into the old textarea', () => {
    expect(asDocument('plain')).toBe('<p>plain</p>');
  });

  it('does not mistake a note that merely starts with a bracket for markup', () => {
    expect(asDocument('<3 this')).toBe('<p>&lt;3 this</p>');
  });
});

describe('documentSummary', () => {
  it('reads a document as one line of text', () => {
    expect(documentSummary('<p>First line</p><p>second</p>')).toBe('First line second');
  });

  it('puts entities back', () => {
    expect(documentSummary('<p>a &lt; b &amp; c</p>')).toBe('a < b & c');
  });

  it('cuts a long one', () => {
    expect(documentSummary('<p>' + 'x'.repeat(80) + '</p>', 10)).toBe('xxxxxxxxxx…');
  });

  it('is empty for a document with no text', () => {
    expect(documentSummary('<p></p>')).toBe('');
  });
});
