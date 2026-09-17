import { describe, expect, it } from 'vitest';
import { isSpacePartition, partitionOf, SHARED_PARTITION } from './signIns';

describe('partitionOf', () => {
  it('puts shared spaces on one jar and a separate space on its own', () => {
    expect(partitionOf({ id: 'a', signIns: 'shared' })).toBe(SHARED_PARTITION);
    expect(partitionOf({ id: 'b', signIns: 'shared' })).toBe(SHARED_PARTITION);
    expect(partitionOf({ id: 'a', signIns: 'separate' })).toBe('persist:space-a');
  });
});

describe('isSpacePartition', () => {
  it('takes only the sign-in jars', () => {
    expect(isSpacePartition(SHARED_PARTITION)).toBe(true);
    expect(isSpacePartition('persist:space-0b6f6a2e-1c4d-4b7e-9f00-1a2b3c4d5e6f')).toBe(true);
    expect(isSpacePartition('')).toBe(false);
    expect(isSpacePartition('persist:other')).toBe(false);
    expect(isSpacePartition('persist:space-a/../b')).toBe(false);
    expect(isSpacePartition(undefined)).toBe(false);
  });
});
