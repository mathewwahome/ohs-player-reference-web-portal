import { FhirError } from 'ohs-player-web-core';

/**
 * User-facing message for a failed user create/update. Maps the known HTTP status to friendly copy
 * (a `409` conflict = duplicate user) and falls back to `fallbackKey` for everything else, so the raw
 * gateway/technical text never reaches end users. `t` is the i18n translate function.
 */
export function userErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey: 'userCreateError' | 'userSaveError',
): string {
  const partial = groupSyncFailure(error);
  if (partial) {
    const message = t(
      partial.kind === 'create' ? 'userCreatedGroupsFailed' : 'userUpdatedGroupsFailed',
    );
    return `${message}${partial.practitionerId ? ` (${partial.practitionerId})` : ''} [${partial.groupIds}]`;
  }
  if (error instanceof FhirError && error.status === 422) return t('userIamMissing');
  if (
    error instanceof FhirError &&
    error.status === 400 &&
    error.message.startsWith('Group not found:')
  )
    return t('userGroupNotFound');
  if (
    error instanceof FhirError &&
    error.message.startsWith(
      'Failed to read current groups from IAM provider; nothing was changed:',
    )
  )
    return t('userGroupsReadFailed');
  if (error instanceof FhirError && error.status === 409) return t('userConflictError');
  return t(fallbackKey);
}

/** Only these documented 502 responses confirm that the profile was persisted. */
export function groupSyncFailure(error: unknown):
  | {
      kind: 'create' | 'update';
      practitionerId?: string;
      groupIds: string;
    }
  | undefined {
  if (!(error instanceof FhirError) || error.status !== 502) return undefined;
  const created =
    /^User created \(Practitioner ([^)]+)\), but group assignment failed for groups: \[(.*)\]$/.exec(
      error.message,
    );
  if (created) return { kind: 'create', practitionerId: created[1], groupIds: created[2] };
  const updated = /^Profile updated, but group sync failed for groups: \[(.*)\]$/.exec(
    error.message,
  );
  if (updated) return { kind: 'update', groupIds: updated[1] };
  return undefined;
}
