import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  CheckSquare,
  CornerDownLeft,
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

/**
 * Inserting a thing and changing what this line *is* are two different actions,
 * and the list reads as half its length once they are apart.
 */
type SlashGroup = 'Insert' | 'Turn into';

/** Reading order of the groups, and so of the whole list. */
const GROUP_ORDER: SlashGroup[] = ['Insert', 'Turn into'];

interface SlashItem {
  label: string;
  group: SlashGroup;
  icon: LucideIcon;
  run: (editor: Editor, range: Range) => void;
}

/** Everything a note can hold that is not a paragraph, in the order offered. */
const ITEMS: SlashItem[] = [
  {
    label: 'Table',
    group: 'Insert',
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
    group: 'Insert',
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
    group: 'Turn into',
    icon: CheckSquare,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    label: 'Bullet list',
    group: 'Turn into',
    icon: List,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    label: 'Numbered list',
    group: 'Turn into',
    icon: ListOrdered,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    label: 'Heading',
    group: 'Turn into',
    icon: Heading1,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    label: 'Subheading',
    group: 'Turn into',
    icon: Heading2,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    label: 'Quote',
    group: 'Turn into',
    icon: Quote,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    label: 'Code',
    group: 'Insert',
    icon: Code2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    label: 'Divider',
    group: 'Insert',
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
    <div className="glass-panel w-56 max-h-[19rem] overflow-y-auto rounded-2xl shadow-2xl p-1.5">
      {props.items.map((item, index) => {
        const isActive = index === active;
        // A heading wherever the group changes — the list is already sorted.
        const heading = props.items[index - 1]?.group !== item.group ? item.group : null;
        return (
          <React.Fragment key={item.label}>
            {heading && (
              <div className="t-faint px-2 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em]">
                {heading}
              </div>
            )}
            <button
              onMouseMove={() => setActive(index)}
              onClick={() => pick(index)}
              className={`slash-row ${isActive ? 'slash-row-on' : ''}`}
            >
              <span className="slash-mark">
                <item.icon size={13} />
              </span>
              <span className="flex-1 min-w-0 truncate text-xs">{item.label}</span>
              {isActive && <CornerDownLeft size={11} className="t-faint shrink-0" />}
            </button>
          </React.Fragment>
        );
      })}
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
        // Sorted here rather than at render, so the row the arrow keys are on is
        // the row that is highlighted.
        items: ({ query }) =>
          ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).sort(
            (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
          ),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<ListHandle, SuggestionProps<SlashItem>> | null = null;
          let unmount: (() => void) | null = null;

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashList, { props, editor: props.editor });
              const element = renderer.element as HTMLElement;
              element.style.zIndex = '9500';
              // The plugin mounts and anchors it. Doing that by hand is what kept
              // the menu on screen after a click outside the widget: the built-in
              // dismissal needs the plugin to know which element the popup is.
              // `animationFrame`, because the caret it is anchored to lives in the
              // scaled world container and moves whenever the camera does.
              unmount = props.mount(element, { autoUpdate: { animationFrame: true } });
            },
            onUpdate: (props) => renderer?.updateProps(props),
            onKeyDown: (props) => renderer?.ref?.onKeyDown(props.event) ?? false,
            onExit: () => {
              unmount?.();
              renderer?.destroy();
              unmount = null;
              renderer = null;
            },
          };
        },
      }),
    ];
  },
});
