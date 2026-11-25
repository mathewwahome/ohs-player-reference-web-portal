import { describe, expect, it } from 'vitest';
import { FhirError } from 'ohs-player-web-core';
import { groupSyncFailure, userErrorMessage } from './toErrorMessage';

const t = (key: string) => key;

describe('userErrorMessage', () => {
  it.each([
    [422, 'IAM user not found for Practitioner', 'userIamMissing'],
    [400, 'Group not found: g1', 'userGroupNotFound'],
    [
      503,
      'Failed to read current groups from IAM provider; nothing was changed: unavailable',
      'userGroupsReadFailed',
    ],
    [
      502,
      'Profile updated, but group sync failed for groups: [g1]',
      'userUpdatedGroupsFailed [g1]',
    ],
    [
      502,
      'User created (Practitioner p1), but group assignment failed for groups: [g1, g2]',
      'userCreatedGroupsFailed (p1) [g1, g2]',
    ],
    [502, 'Something else failed', 'userSaveError'],
  ])('maps %s %s to actionable copy', (status, message, expected) => {
    expect(userErrorMessage(new FhirError(message, status, {}), t, 'userSaveError')).toBe(expected);
  });

  it('does not assume an arbitrary gateway failure created the user', () => {
    expect(groupSyncFailure(new FhirError('Bad gateway', 502, {}))).toBeUndefined();
  });
});
