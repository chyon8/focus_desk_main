import { describe, it, expect } from 'vitest';
import { columnAt, dropIndex, layOutColumn, COLUMN_TITLE_HEIGHT } from './columns';
import type { Box } from './layout';

const column = { x: 100, y: 200, width: 340 };

describe('layOutColumn', () => {
  it('stacks the children down the column, inset from its sides', () => {
    const { placements } = layOutColumn(column, [
      { id: 'a', height: 170 },
      { id: 'b', height: 170 },
    ]);
    expect(placements.a.x).toBe(placements.b.x);
    expect(placements.a.x).toBeGreaterThan(column.x);
    expect(placements.a.width).toBeLessThan(column.width);
    expect(placements.b.y).toBeGreaterThan(placements.a.y + 170);
  });

  it('starts below the frame header and the title strip', () => {
    const { placements } = layOutColumn(column, [{ id: 'a', height: 170 }]);
    expect(placements.a.y).toBeGreaterThanOrEqual(column.y + 40 + COLUMN_TITLE_HEIGHT);
  });

  it('is as tall as what it holds', () => {
    const one = layOutColumn(column, [{ id: 'a', height: 170 }]).height;
    const two = layOutColumn(column, [
      { id: 'a', height: 170 },
      { id: 'b', height: 170 },
    ]).height;
    expect(two - one).toBeGreaterThan(170);
    expect(two - one).toBeLessThan(200);
  });

  it('is still a target when it is empty', () => {
    const empty = layOutColumn(column, []);
    expect(empty.height).toBeGreaterThan(40 + COLUMN_TITLE_HEIGHT);
    expect(empty.placements).toEqual({});
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
    // The list is given in stacking order, so the last match is the top one.
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
  const children = [
    { y: 0, height: 100 },
    { y: 110, height: 100 },
  ];

  it('goes above a card when let go on its top half', () => {
    expect(dropIndex(children, 20)).toBe(0);
    expect(dropIndex(children, 130)).toBe(1);
  });

  it('goes to the end below the last card', () => {
    expect(dropIndex(children, 500)).toBe(2);
  });
});
