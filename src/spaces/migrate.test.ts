import { describe, it, expect } from 'vitest';
import { migrateLegacySpaces, migrateSpace, signInFromSpace } from './migrate';
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
    // The v15 shape: `migrateSpace` runs over these on the way in and finishes them.
    expect(space.schemaVersion).toBe(15);
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
    // The body arrives as a document: a memo is no longer a textarea (D-080).
    expect(memo.data).toEqual({ theme: 'LIGHT', content: '<p>Notes</p><p>body text</p>' });
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
  it.each([
    ['ghibli.jpg', 'summer-meadow.webp'],
    ['winterhut.jpg', 'quiet-snow.webp'],
    ['rainiywindow.jpg', 'autumn-breakfast-nook.webp'],
    ['rainy-desk.webp', 'autumn-breakfast-nook.webp'],
    ['ghibli-old-cinema.png', 'autumn-breakfast-nook.webp'],
    ['warm-cabin.webp', 'quiet-snow.webp'],
    ['morning-studio.webp', 'coastal-mist.webp'],
    ['cloudtop-sanctuary.webp', 'summer-country-room.webp'],
    ['aurora-fjord.webp', 'rainy-attic.webp'],
    ['moonlit-conservatory.webp', 'afternoon-records.webp'],
    ['summer-lake-landing.png', 'summer-lake-landing.webp'],
  ])('replaces removed wallpaper %s without changing other space settings', (old, replacement) => {
    const [base] = migrateLegacySpaces(legacy);
    const raw: SpaceDoc = {
      ...base,
      schemaVersion: 12,
      background: { type: 'IMAGE', value: `/wallpapers/${old}` },
    };
    const migrated = migrateSpace(raw);
    const { signIns: _dropped, ...rest } = raw as typeof raw & { signIns?: string };
    expect(migrated).toEqual({
      // v16 took the space's own sign-in off the document (its widgets carry it).
      ...rest,
      schemaVersion: SCHEMA_VERSION,
      background: { type: 'IMAGE', value: `/wallpapers/${replacement}` },
    });
    expect(raw.background?.value).toBe(`/wallpapers/${old}`);
    expect(migrateSpace(migrated)).toEqual(migrated);
  });

  it('preserves an uploaded image with a retired filename', () => {
    const [base] = migrateLegacySpaces(legacy);
    const raw: SpaceDoc = {
      ...base, schemaVersion: 9,
      background: { type: 'IMAGE', value: 'focusdesk-image://wallpaper/morning-studio.webp' },
    };
    expect(migrateSpace(raw).background).toEqual(raw.background);
  });

  it('replaces retired images during MVP import as well', () => {
    const [space] = migrateLegacySpaces([
      { ...legacy[0], backgroundType: 'IMAGE', backgroundUrl: '/wallpapers/ghibli.jpg' },
    ]);
    expect(space.background).toEqual({ type: 'IMAGE', value: '/wallpapers/summer-meadow.webp' });
  });

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

  it('turns a v4 memo from text into a document, and leaves other widgets be', () => {
    const v4 = {
      id: 's',
      schemaVersion: 4,
      name: 'Old',
      background: null,
      camera: { x: 0, y: 0, zoom: 1 },
      widgets: {
        a: {
          id: 'a',
          type: 'memo',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          z: 0,
          data: { content: 'line one\n\nline two', theme: 'LIGHT' },
        },
        b: { id: 'b', type: 'todo', x: 0, y: 0, width: 10, height: 10, z: 1, data: { items: [] } },
      },
    } as unknown as SpaceDoc;

    const migrated = migrateSpace(v4);
    expect(migrated.widgets['a'].data).toEqual({
      content: '<p>line one</p><p>line two</p>',
      theme: 'LIGHT',
    });
    expect(migrated.widgets['b'].data).toEqual({ items: [] });
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

  it('drops an arrange mode that was cut from the menu, even at the current version', () => {
    const saved = (mode: string) =>
      ({
        id: 's',
        schemaVersion: SCHEMA_VERSION,
        name: 'New',
        background: null,
        camera: { x: 0, y: 0, zoom: 1 },
        widgets: {},
        arrange: { mode },
      }) as unknown as SpaceDoc;

    expect(migrateSpace(saved('cascade')).arrange).toBeNull();
    expect(migrateSpace(saved('focus')).arrange).toBeNull();
    expect(migrateSpace(saved('stack')).arrange).toEqual({ mode: 'stack' });
  });

  it('hands a space\'s own sign-in to its browser and web app widgets (v16)', () => {
    const saved = (schemaVersion: number, signIns?: string) =>
      ({
        id: 's',
        schemaVersion,
        name: 'Client',
        themeId: 'swiss',
        background: null,
        camera: { x: 0, y: 0, zoom: 1 },
        widgets: {
          b: { id: 'b', type: 'browser', x: 0, y: 0, width: 900, height: 600, z: 1, data: { url: 'https://gmail.com' } },
          w: { id: 'w', type: 'webapp', x: 0, y: 0, width: 300, height: 200, z: 2, data: { appId: 'a', url: 'https://figma.com' } },
          m: { id: 'm', type: 'memo', x: 0, y: 0, width: 300, height: 200, z: 3, data: { content: '', theme: 'LIGHT' } },
        },
        signIns,
      }) as unknown as SpaceDoc;

    // Saved before v15: it had a jar of its own, so its pages keep it.
    const own = migrateSpace(saved(14));
    expect((own.widgets.b.data as { signIn?: string }).signIn).toBe('s');
    expect((own.widgets.w.data as { signIn?: string }).signIn).toBe('s');
    // Only pages sign in; a memo has nothing to sign in to.
    expect((own.widgets.m.data as { signIn?: string }).signIn).toBeUndefined();
    expect(signInFromSpace(saved(14))).toEqual({
      id: 's',
      name: 'Client',
      partition: 'persist:space-s',
    });
    // The field is gone either way, and a shared space's widgets stay shared.
    expect((own as unknown as { signIns?: string }).signIns).toBeUndefined();
    const shared = migrateSpace(saved(15, 'shared'));
    expect((shared.widgets.b.data as { signIn?: string }).signIn).toBeUndefined();
    expect(signInFromSpace(saved(15, 'shared'))).toBeNull();

    // The MVP import: its spaces each had a jar, and go the same way.
    const [imported] = migrateLegacySpaces(legacy);
    expect(signInFromSpace(imported)?.partition).toBe(`persist:space-${imported.id}`);
    expect(migrateSpace(imported).schemaVersion).toBe(SCHEMA_VERSION);
  });
});
