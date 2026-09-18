import { describe, expect, it } from 'vitest';
import {
  isSignInPartition,
  partitionFor,
  SHARED_ID,
  SHARED_PARTITION,
  SHARED_SIGN_IN,
  type SignIn,
} from './signIns';

const work: SignIn = { id: 'w', name: 'Work', partition: 'persist:jar-w' };
const moved: SignIn = { id: 's1', name: 'Old space', partition: 'persist:space-s1' };
const list = { [SHARED_ID]: SHARED_SIGN_IN, w: work, s1: moved };

describe('partitionFor', () => {
  it('uses the shared jar for a widget with no sign-in', () => {
    expect(partitionFor(undefined, list)).toBe(SHARED_PARTITION);
    expect(partitionFor({}, list)).toBe(SHARED_PARTITION);
    expect(partitionFor({ signIn: SHARED_ID }, list)).toBe(SHARED_PARTITION);
  });

  it('uses the named jar a widget carries', () => {
    expect(partitionFor({ signIn: 'w' }, list)).toBe('persist:jar-w');
    expect(partitionFor({ signIn: 's1' }, list)).toBe('persist:space-s1');
  });

  // A sign-in the user deleted while a widget still named it.
  it('falls back to the shared jar for an id that is gone', () => {
    expect(partitionFor({ signIn: 'nope' }, list)).toBe(SHARED_PARTITION);
  });
});

describe('isSignInPartition', () => {
  it('takes the shared jar, a space jar and a named jar', () => {
    for (const name of [SHARED_PARTITION, 'persist:space-abc-1', 'persist:jar-abc-1']) {
      expect(isSignInPartition(name)).toBe(true);
    }
  });

  it('refuses anything else', () => {
    for (const name of ['persist:other', 'persist:jar-../x', '', null, 7]) {
      expect(isSignInPartition(name)).toBe(false);
    }
  });
});
