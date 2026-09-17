import type { SpaceDoc } from './types';

/** The jar every `shared` space signs in with. */
export const SHARED_PARTITION = 'persist:shared';

/** A space's own jar. Kept while the space is shared, so switching back brings its sign-ins back. */
export function ownPartition(spaceId: string) {
  return `persist:space-${spaceId}`;
}

/**
 * The cookie jar a space's browser and web app widgets run on.
 *
 * Every space used to have its own (D-074), so a new space started signed out of
 * everything and looked like a first-time visitor to every bot check. Spaces now
 * share one unless the user keeps a space separate (2026-09-17).
 */
export function partitionOf(space: Pick<SpaceDoc, 'id' | 'signIns'>) {
  return space.signIns === 'separate' ? ownPartition(space.id) : SHARED_PARTITION;
}

/** Whether a name from the renderer is one of these jars and nothing else. */
export function isSpacePartition(name: unknown): name is string {
  return typeof name === 'string' && (name === SHARED_PARTITION || /^persist:space-[\w-]+$/.test(name));
}
