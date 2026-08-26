import React, { useRef } from 'react';
import {
  Columns3,
  Rows3,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { MemoData } from '../spaces/types';
import { Mermaid } from './editor/Mermaid';
import { SlashCommands } from './editor/SlashMenu';
import { asDocument } from './memoContent';
import { useWidgetData } from './useWidgetData';

/**
 * A note, as a document (D-080).
 *
 * It was a `<textarea>`, which meant a table or a diagram had nowhere to live —
 * both are things people write *inside* a note, not beside it. `/` opens the
 * list of blocks; the markdown shortcuts (`# `, `- `, `1. `) work while typing.
 */
export const MemoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<MemoData>(id);
  // The editor owns the document once it is mounted, so the stored value is only
  // read to start it: feeding it back on every keystroke would fight the caret.
  const initial = useRef(asDocument(data.content));

  const editor = useEditor({
    extensions: [
      StarterKit,
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Mermaid,
      SlashCommands,
    ],
    content: initial.current,
    editorProps: { attributes: { class: 'memo-doc' } },
    onUpdate: ({ editor: current }) => update({ content: current.getHTML() }),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      isEmpty: current?.isEmpty ?? true,
      inTable: current?.isActive('table') ?? false,
    }),
  });

  return (
    <div className="memo-paper h-full w-full flex flex-col">
      <div className="relative flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {state?.isEmpty && (
          <span className="t-faint pointer-events-none absolute text-base">
            Write, or press / for a table, a diagram, a list…
          </span>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Only while the caret is in a table: without it a table is stuck at the
          size it was inserted at. */}
      {state?.inTable && editor && (
        <div className="border-hair shrink-0 flex items-center gap-1 px-3 py-1.5 border-t">
          <TableIcon size={12} className="t-faint mr-1" />
          <TableButton label="Add a row" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Rows3 size={13} />+
          </TableButton>
          <TableButton
            label="Add a column"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <Columns3 size={13} />+
          </TableButton>
          <TableButton label="Delete the row" onClick={() => editor.chain().focus().deleteRow().run()}>
            <Rows3 size={13} />−
          </TableButton>
          <TableButton
            label="Delete the column"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <Columns3 size={13} />−
          </TableButton>
          <TableButton
            label="Delete the table"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <Trash2 size={13} />
          </TableButton>
        </div>
      )}
    </div>
  );
};

const TableButton: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, onClick, children }) => (
  <button
    title={label}
    onClick={onClick}
    className="chrome-button h-6 px-1.5 flex items-center gap-0.5 rounded-md text-[10px]"
  >
    {children}
  </button>
);
