import { describe, expect, it } from 'vitest';
import { ROOMS, greetingForHour, roomsForHour } from './rooms';

describe('rooms', () => {
  it('offers every theme as a room', () => {
    expect(ROOMS.length).toBeGreaterThan(0);
    for (const room of ROOMS) {
      expect(room.name).not.toBe('');
      expect(room.ambience).toBeTruthy();
    }
  });

  it('puts the room that suits the hour first', () => {
    // The first card is the wide one, so it should be a painted room that
    // suits the hour rather than a gradient.
    expect(roomsForHour(23)[0].id).toBe('cabin');
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
