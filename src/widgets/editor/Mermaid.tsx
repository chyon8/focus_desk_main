import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

export const DEFAULT_DIAGRAM = 'flowchart TD\n  A[Idea] --> B[Draft]\n  B --> C[Done]';

/**
 * Mermaid draws with its own palette; these hand it the note's instead. Read
 * from the block itself rather than the app root — a note is written on paper
 * and redefines the ink tokens for everything inside it.
 */
function themeVariables(from: Element) {
  const style = getComputedStyle(from);
  const token = (name: string) => style.getPropertyValue(name).trim();
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
      .catch((e: Error) => {
        if (!alive) return;
        // Mermaid leaves its failed attempt in the document.
        document.getElementById(`d${idRef.current}`)?.remove();
        setError(e.message.split('\n')[0]);
      });
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
