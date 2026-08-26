import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table as TableIcon,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Extension, type Editor, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import { DEFAULT_DIAGRAM } from './Mermaid';

interface SlashItem {
  label: string;
  icon: LucideIcon;
  run: (editor: Editor, range: Range) => void;
}

/** Everything a note can hold that is not a paragraph. */
const ITEMS: SlashItem[] = [
  {
    label: 'Table',
    icon: TableIcon,
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    label: 'Diagram',
    icon: Workflow,
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'mermaid', attrs: { code: DEFAULT_DIAGRAM } })
        .run(),
  },
  {
    label: 'Checklist',
    icon: CheckSquare,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    label: 'Bullet list',
    icon: List,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    label: 'Numbered list',
    icon: ListOrdered,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    label: 'Heading',
    icon: Heading1,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    label: 'Subheading',
    icon: Heading2,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    label: 'Quote',
    icon: Quote,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    label: 'Code',
    icon: Code2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    label: 'Divider',
    icon: Minus,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

interface ListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const SlashList = forwardRef<ListHandle, SuggestionProps<SlashItem>>((props, ref) => {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [props.items]);

  const pick = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === 'ArrowDown') {
        setActive((i) => (i + 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setActive((i) => (i - 1 + props.items.length) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        pick(active);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) return null;

  return (
    <div className="glass-panel w-48 overflow-hidden rounded-xl shadow-2xl p-1">
      {props.items.map((item, index) => (
        <button
          key={item.label}
          onMouseMove={() => setActive(index)}
          onClick={() => pick(index)}
          className={`!text-[inherit] w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs ${
            index === active ? 'chrome-button-on' : 'row'
          }`}
        >
          <item.icon size={13} className="shrink-0" />
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  );
});
SlashList.displayName = 'SlashList';

/**
 * `/` in a note opens the list of blocks (D-080).
 *
 * The menu is placed in the page rather than inside the editor: a note lives in
 * the scaled world container, so anything drawn inside it shrinks with the
 * camera. Screen coordinates keep it readable however far out the space is.
 */
export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        items: ({ query }) =>
          ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<ListHandle, SuggestionProps<SlashItem>> | null = null;

          const place = (rect: DOMRect | null | undefined) => {
            const element = renderer?.element as HTMLElement | undefined;
            if (!element || !rect) return;
            element.style.position = 'fixed';
            element.style.zIndex = '9500';
            element.style.left = `${Math.min(rect.left, window.innerWidth - 200)}px`;
            // Above the caret when there is no room below it.
            const below = rect.bottom + 6;
            element.style.top =
              below + 280 > window.innerHeight ? `${rect.top - 286}px` : `${below}px`;
          };

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashList, { props, editor: props.editor });
              document.body.appendChild(renderer.element);
              place(props.clientRect?.());
            },
            onUpdate: (props) => {
              renderer?.updateProps(props);
              place(props.clientRect?.());
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                renderer?.element.remove();
                return false;
              }
              return renderer?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              renderer?.element.remove();
              renderer?.destroy();
              renderer = null;
            },
          };
        },
      }),
    ];
  },
});
