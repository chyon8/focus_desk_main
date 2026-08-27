import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

export const DEFAULT_DIAGRAM = 'flowchart TD\n  A[Idea] --> B[Draft]\n  B --> C[Done]';

/**
 * The colour a token actually paints, not the recipe for it.
 *
 * A custom property's computed value is the text it was written as, so
 * `--paper-fill: color-mix(…)` reads back as the whole `color-mix(…)` string.
 * Mermaid parses colours itself and throws on anything but a plain one — and
 * that throw took down the entire app, since the diagram is rendered inside the
 * React tree (D-086). Painting it onto a probe hands back a resolved `rgb(…)`.
 */
function resolve(within: Element, token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  probe.style.display = 'none';
  within.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return toRgb(colour);
}

/**
 * A colour mixed in a named space comes back as `color(srgb r g b)`, which
 * Mermaid rejects just as flatly as the `color-mix()` it replaced. Everything
 * else already arrives as `rgb(…)` and passes straight through.
 */
function toRgb(colour: string) {
  const parts = colour.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
  if (!parts) return colour;
  const [r, g, b] = parts.slice(1).map((n) => Math.round(Number(n) * 255));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Mermaid draws with its own palette; these hand it the note's instead. Read
 * from the block itself rather than the app root — a note is written on paper
 * and redefines the ink tokens for everything inside it.
 */
function themeVariables(from: Element) {
  const style = getComputedStyle(from);
  const token = (name: string) =>
    name === '--font-ui' ? style.getPropertyValue(name).trim() : resolve(from, name);
  return {
    background: 'transparent',
    primaryColor: token('--surface'),
    secondaryColor: token('--surface'),
    tertiaryColor: token('--surface'),
    primaryTextColor: token('--ink'),
    secondaryTextColor: token('--ink'),
    tertiaryTextColor: token('--ink'),
    primaryBorderColor: token('--ink-soft'),
    lineColor: token('--ink-soft'),
    textColor: token('--ink'),
    fontFamily: token('--font-ui'),
  };
}

let seq = 0;

const MermaidView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const code = node.attrs.code as string;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${(seq += 1)}`);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const fail = (e: Error) => {
      if (!alive) return;
      // Mermaid leaves its failed attempt in the document.
      document.getElementById(`d${idRef.current}`)?.remove();
      setError(e.message.split('\n')[0]);
    };

    // Everything Mermaid does is inside this try: it parses colours and diagram
    // text itself and throws on anything it does not like, and a throw out of an
    // effect unmounts the whole React tree — one bad diagram took the app down to
    // a white screen (D-086). A diagram that cannot be drawn says so, in its own
    // block, and nothing else notices.
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: themeVariables(hostRef.current ?? document.documentElement),
        // The diagram source is the user's own, but it is still text that can end
        // up in a note from a drop or a paste.
        securityLevel: 'strict',
      });
      mermaid
        .render(idRef.current, code)
        .then(({ svg: rendered }) => {
          if (!alive) return;
          setSvg(rendered);
          setError(null);
        })
        .catch(fail);
    } catch (e) {
      fail(e as Error);
    }

    return () => {
      alive = false;
    };
  }, [code]);

  const commit = () => {
    setIsEditing(false);
    if (draft !== code) updateAttributes({ code: draft });
  };

  return (
    <NodeViewWrapper
      ref={hostRef}
      className={`mermaid-block ${selected ? 'mermaid-selected' : ''}`}
      data-drag-handle
    >
      {isEditing ? (
        <textarea
          value={draft}
          autoFocus
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              setDraft(code);
              setIsEditing(false);
            }
          }}
          className="field w-full min-h-[7rem] p-3 rounded-lg outline-none resize-y font-mono text-xs leading-relaxed"
        />
      ) : (
        <button
          type="button"
          title="Click to edit this diagram"
          onClick={() => {
            setDraft(code);
            setIsEditing(true);
          }}
          className="w-full flex justify-center p-2"
        >
          {error ? (
            <span className="t-faint text-xs">Diagram: {error}</span>
          ) : (
            <span dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </button>
      )}
    </NodeViewWrapper>
  );
};

/**
 * A diagram, written as Mermaid text and drawn where it stands (D-080).
 *
 * A block rather than a widget of its own: a flow chart is nearly always part of
 * a note about the thing it describes, and the canvas is already the place where
 * separate objects live side by side.
 */
export const Mermaid = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { code: { default: DEFAULT_DIAGRAM } };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mermaid]',
        getAttrs: (element) => ({ code: (element as HTMLElement).getAttribute('data-code') ?? '' }),
      },
    ];
  },

  // The source has to survive `getHTML()`, since that is what a memo stores.
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-mermaid': '', 'data-code': node.attrs.code }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },
});
