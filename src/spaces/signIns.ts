/**
 * The sign-ins a browser or web app widget can run on.
 *
 * A sign-in is one cookie jar. Widgets share one ("Shared") unless the user
 * gives a widget another, so two Gmail widgets can be two accounts on the same
 * screen (2026-09-18). It used to be a choice per space — a switch in the space
 * menu — which could not do that, and reading it was hard: turning the switch
 * changed which jar the whole space used, which looked like being signed out.
 */

/** The jar every widget uses unless it was given another. */
export const SHARED_PARTITION = 'persist:shared';

/** The id of that jar. It is not in the stored list — every list starts with it. */
export const SHARED_ID = 'shared';

/** A named jar the user made. `partition` is fixed when it is made, so renaming keeps the cookies. */
export interface SignIn {
  id: string;
  name: string;
  partition: string;
}

/** "Main", not "Shared": it is the account the user works in, not something shared with other people. */
export const SHARED_SIGN_IN: SignIn = { id: SHARED_ID, name: 'Main', partition: SHARED_PARTITION };

/** Whether this jar came from a space, back when the choice was per space — its detail view says so. */
export function isFromSpace(signIn: SignIn) {
  return signIn.partition.startsWith('persist:space-');
}

/** A jar of a space's own, from when the choice was per space. Kept by name so its cookies survive. */
export function ownPartition(spaceId: string) {
  return `persist:space-${spaceId}`;
}

/** The partition for a new jar. */
export function newPartition(id: string) {
  return `persist:jar-${id}`;
}

/** The jar this widget's page runs on. An unknown or missing id is the shared one. */
export function partitionFor(
  widget: { signIn?: string } | undefined,
  signIns: Record<string, SignIn>
) {
  const id = widget?.signIn;
  if (!id || id === SHARED_ID) return SHARED_PARTITION;
  return signIns[id]?.partition ?? SHARED_PARTITION;
}

/** Whether a name from the renderer is one of these jars and nothing else. */
export function isSignInPartition(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    (name === SHARED_PARTITION || /^persist:(space|jar)-[\w-]+$/.test(name))
  );
}
