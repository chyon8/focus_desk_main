/**
 * A memo used to be a plain `<textarea>`, so every stored note is a string of
 * text. It is now a document, which is stored as HTML — so the old strings, and
 * anything else that arrives as plain text (a dropped `.txt`, a `.md`), have to
 * be turned into one on the way in.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

function escape(text: string) {
  return text.replace(/[&<>]/g, (char) => ESCAPES[char]);
}

/**
 * Already a document rather than something typed into a textarea. A real block
 * tag is required, not just a `<`: a note starting "<3" is text, and reading it
 * as markup would throw the line away.
 */
export function isHtml(content: string) {
  return /^\s*<(p|h[1-6]|ul|ol|li|div|table|blockquote|pre|hr)[\s/>]/i.test(content);
}

/**
 * Text as a document: a blank line starts a paragraph, a single newline is a
 * line break inside one. That is how the text read in the textarea, so it is
 * what the same note has to look like afterwards.
 */
export function textToHtml(text: string) {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escape(block).split('\n').join('<br>')}</p>`)
    .join('');
}

/** What a memo's stored `content` should be handed to the editor as. */
export function asDocument(content: string) {
  return isHtml(content) ? content : textToHtml(content);
}

const UNESCAPES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&quot;': '"',
  '&#39;': "'",
};

/**
 * A line of plain text naming the note — for the launcher, which cannot show a
 * document. Block tags become spaces so two paragraphs do not run together.
 */
export function documentSummary(content: string, limit = 48) {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (entity) => UNESCAPES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}
