import { describe, it, expect } from 'vitest';
import { maximiseOrder, stepMaximised } from './spaceStore';
import type { SpaceDoc, WidgetDoc } from '../spaces/types';

function widget(id: string, x: number, y: number, extra: Partial<WidgetDoc> = {}): WidgetDoc {
  return { id, type: 'memo', x, y, width: 300, height: 200, z: 1, data: {}, ...extra };
}

function space(...widgets: WidgetDoc[]): SpaceDoc {
  return {
    widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
  } as unknown as SpaceDoc;
}

describe('maximiseOrder', () => {
  it('reads the canvas top-left first', () => {
    const doc = space(widget('c', 0, 400), widget('b', 400, 0), widget('a', 0, 0));
    expect(maximiseOrder(doc)).toEqual(['a', 'b', 'c']);
  });

  it("takes a column's cards in the column's own order, not where they sit", () => {
    const doc = space(
      widget('col', 0, 0, {
        type: 'column',
        data: { title: 'Reading', children: ['second', 'first'] },
      }),
      widget('first', 999, 999),
      widget('second', 999, 999),
      widget('loose', 400, 0)
    );
    expect(maximiseOrder(doc)).toEqual(['second', 'first', 'loose']);
  });

  it('leaves the column itself out — it cannot fill the screen', () => {
    const doc = space(
      widget('col', 0, 0, { type: 'column', data: { title: '', children: [] } }),
      widget('a', 400, 0)
    );
    expect(maximiseOrder(doc)).toEqual(['a']);
  });
});

describe('stepMaximised', () => {
  const doc = space(widget('a', 0, 0), widget('b', 400, 0), widget('c', 800, 0));

  it('goes to the next and the one before', () => {
    expect(stepMaximised(doc, 'a', 1)).toBe('b');
    expect(stepMaximised(doc, 'b', -1)).toBe('a');
  });

  it('wraps at both ends', () => {
    expect(stepMaximised(doc, 'c', 1)).toBe('a');
    expect(stepMaximised(doc, 'a', -1)).toBe('c');
  });

  it('has nowhere to go with one widget, or with one that is not in the space', () => {
    expect(stepMaximised(space(widget('only', 0, 0)), 'only', 1)).toBeNull();
    expect(stepMaximised(doc, 'gone', 1)).toBeNull();
  });
});
