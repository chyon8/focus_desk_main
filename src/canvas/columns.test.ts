import { describe, it, expect } from 'vitest';
import { columnAt, columnHeight, COLUMN_CARD_HEIGHT, dropIndex } from './columns';
import type { Box } from './layout';

describe('columnHeight', () => {
  it('grows by one card at a time', () => {
    const step = columnHeight(3) - columnHeight(2);
    expect(step).toBeGreaterThan(COLUMN_CARD_HEIGHT);
    expect(step).toBeLessThan(COLUMN_CARD_HEIGHT + 40);
    expect(columnHeight(4) - columnHeight(3)).toBe(step);
  });

  it('is a target worth dropping on when empty', () => {
    expect(columnHeight(0)).toBeGreaterThan(100);
  });

  it('is the same answer every time — nothing it reads can drift', () => {
    expect(columnHeight(5)).toBe(columnHeight(5));
  });
});

describe('columnAt', () => {
  const columns: Box[] = [
    { id: 'low', x: 0, y: 0, width: 300, height: 400 },
    { id: 'high', x: 200, y: 0, width: 300, height: 400 },
  ];

  it('finds the column a point is inside', () => {
    expect(columnAt(columns, { x: 50, y: 50 })).toBe('low');
  });

  it('takes the nearest one where they overlap', () => {
    // The list comes in stacking order, so the last match is the top one.
    expect(columnAt(columns, { x: 250, y: 50 })).toBe('high');
  });

  it('is nothing out in the open', () => {
    expect(columnAt(columns, { x: 900, y: 50 })).toBeNull();
  });

  it('never lands on a column being dragged', () => {
    expect(columnAt(columns, { x: 50, y: 50 }, ['low'])).toBeNull();
  });
});

describe('dropIndex', () => {
  const column = { y: 0 };
  // The list starts below the frame header, the title strip and the padding.
  const top = columnHeight(0) - 96 + 10;

  it('lands in the slot the pointer is over', () => {
    expect(dropIndex(column, 3, top + 10)).toBe(0);
    expect(dropIndex(column, 3, top + COLUMN_CARD_HEIGHT + 20)).toBe(1);
  });

  it('goes to the end below the last card', () => {
    expect(dropIndex(column, 3, 5000)).toBe(3);
  });

  it('never lands above the first slot', () => {
    expect(dropIndex(column, 3, -500)).toBe(0);
  });
});
