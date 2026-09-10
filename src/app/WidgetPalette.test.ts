import { describe, expect, it } from 'vitest';
import { MORE_TOOL_GROUPS, PALETTE_ITEMS, QUICK_ADD_ITEMS } from './WidgetPalette';

describe('widget palette', () => {
  it('puts the six common starting points first', () => {
    expect(QUICK_ADD_ITEMS.map((item) => item.label)).toEqual([
      'Memo',
      'Todo',
      'Browser',
      'Web app',
      'Column',
      'Timer',
    ]);
  });

  it('keeps the less common tools grouped and reachable', () => {
    expect(MORE_TOOL_GROUPS.map((group) => group.label)).toEqual([
      'Capture',
      'Organise',
      'Work',
      'Time',
    ]);
    expect(PALETTE_ITEMS.map((item) => item.label)).toEqual([
      ...QUICK_ADD_ITEMS.map((item) => item.label),
      ...MORE_TOOL_GROUPS.flatMap((group) => group.items.map((item) => item.label)),
    ]);
  });

  it('does not present note blocks as canvas widgets', () => {
    const labels = PALETTE_ITEMS.map((item) => item.label);
    expect(labels).not.toContain('Table');
    expect(labels).not.toContain('Diagram');
  });
});
