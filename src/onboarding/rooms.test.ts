import { describe, expect, it } from 'vitest';
import { ROOMS, greetingForHour, roomsForHour } from './rooms';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('rooms', () => {
  it('ships every image used by onboarding', () => {
    for (const room of ROOMS) {
      const src = room.background ?? (room.theme.scene.kind === 'image' ? room.theme.scene.src : null);
      if (src) expect(existsSync(resolve('public', src.slice(1)))).toBe(true);
    }
  });

  it('offers every theme as a room', () => {
    expect(ROOMS.map((room) => room.id)).toEqual([
      'meadow',
      'midnight-observatory',
      'rainy-attic',
      'quiet-snow',
      'snowfall',
    ]);
    for (const room of ROOMS) {
      expect(room.name).not.toBe('');
      expect(room.ambience).toBeTruthy();
    }
  });

  it('puts the room that suits the hour first', () => {
    // The first card is the wide one, so it should be a painted room that
    // suits the hour rather than a gradient.
    expect(roomsForHour(23)[0].id).toBe('rainy-attic');
    expect(roomsForHour(8)[0].id).toBe('meadow');
  });

  it('keeps every room whatever the hour', () => {
    for (const hour of [0, 6, 12, 18, 23]) {
      expect(roomsForHour(hour)).toHaveLength(ROOMS.length);
    }
  });

  it('greets differently late at night than in the morning', () => {
    expect(greetingForHour(23)).not.toBe(greetingForHour(8));
    expect(greetingForHour(2)).toBe('Still up.');
  });
});
