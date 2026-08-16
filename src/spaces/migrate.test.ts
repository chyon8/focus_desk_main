import { describe, it, expect } from 'vitest';
import { migrateLegacySpaces, migrateSpace } from './migrate';
import { SCHEMA_VERSION, SpaceDoc } from './types';

const legacy = [
  {
    id: 'space-1',
    name: 'Deep Work',
    backgroundUrl: '#1e1e24',
    backgroundType: 'COLOR',
    widgets: [
      {
        id: 'w1',
        type: 'TODO',
        position: { x: 100, y: 50, width: 320, height: 450 },
        theme: 'DARK',
        items: [{ id: 't1', text: 'Ship it', completed: true }],
      },
      {
        id: 'w2',
        type: 'NEW_EDITOR',
        position: { x: 500, y: 50 },
        title: 'Notes',
        content: 'body text',
      },
      // No component for this type yet — must be dropped, not crash.
      { id: 'w3', type: 'CANVAS', position: { x: 0, y: 0 }, elements: [] },
    ],
  },
];

describe('migrateLegacySpaces', () => {
  it('converts spaces and stamps the current schema version', () => {
    const [space] = migrateLegacySpaces(legacy);
    expect(space.id).toBe('space-1');
    expect(space.name).toBe('Deep Work');
    expect(space.schemaVersion).toBe(SCHEMA_VERSION);
    expect(space.background).toEqual({ type: 'COLOR', value: '#1e1e24' });
  });

  it('maps todo items from completed to done and keeps position', () => {
    const [space] = migrateLegacySpaces(legacy);
    const todo = space.widgets['w1'];
    expect(todo.type).toBe('todo');
    expect(todo.x).toBe(100);
    expect(todo.width).toBe(320);
    expect(todo.data).toEqual({ theme: 'DARK', items: [{ id: 't1', text: 'Ship it', done: true }] });
  });

  it('folds a legacy editor title into the memo body and defaults its size', () => {
    const [space] = migrateLegacySpaces(legacy);
    const memo = space.widgets['w2'];
    expect(memo.type).toBe('memo');
    expect(memo.data).toEqual({ theme: 'LIGHT', content: 'Notes\n\nbody text' });
    expect(memo.width).toBe(350);
  });

  it('drops widget types that have no component yet', () => {
    const [space] = migrateLegacySpaces(legacy);
    expect(space.widgets['w3']).toBeUndefined();
    expect(Object.keys(space.widgets)).toHaveLength(2);
  });

  it('returns an empty list for missing or malformed input', () => {
    expect(migrateLegacySpaces(undefined)).toEqual([]);
    expect(migrateLegacySpaces({ nope: true })).toEqual([]);
  });

  it('assigns a stacking order', () => {
    const [space] = migrateLegacySpaces(legacy);
    expect(space.widgets['w1'].z).toBe(0);
    expect(space.widgets['w2'].z).toBe(1);
  });
});

describe('migrateSpace', () => {
  it('gives v1 widgets a stacking order and stamps the current version', () => {
    const v1 = {
      id: 's',
      schemaVersion: 1,
      name: 'Old',
      background: { type: 'COLOR', value: '#000' },
      camera: { x: 0, y: 0, zoom: 1 },
      widgets: {
        a: { id: 'a', type: 'memo', x: 0, y: 0, width: 10, height: 10, data: {} },
        b: { id: 'b', type: 'memo', x: 0, y: 0, width: 10, height: 10, data: {} },
      },
    } as unknown as SpaceDoc;

    const migrated = migrateSpace(v1);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.widgets['a'].z).toBe(0);
    expect(migrated.widgets['b'].z).toBe(1);
  });

  it('leaves an already-current document alone', () => {
    const current = {
      id: 's',
      schemaVersion: SCHEMA_VERSION,
      name: 'New',
      background: { type: 'COLOR', value: '#000' },
      camera: { x: 0, y: 0, zoom: 1 },
      widgets: {
        a: { id: 'a', type: 'memo', x: 0, y: 0, width: 10, height: 10, z: 7, data: {} },
      },
    } as unknown as SpaceDoc;

    expect(migrateSpace(current).widgets['a'].z).toBe(7);
  });
});
