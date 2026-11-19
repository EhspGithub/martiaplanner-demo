/**
 * Phase 0: Security Rules Specification Test Suite ("Dirty Dozen" Payloads)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */
export interface AdversarialPayloadTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: AdversarialPayloadTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write',
    operation: 'create',
    path: '/workspaces/martia-shared-main',
    auth: null,
    payload: { workspaceId: 'martia-shared-main' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    operation: 'create',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'user-a', email_verified: false },
    payload: { workspaceId: 'martia-shared-main', ownerId: 'user-a' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Owner Spoofing on Create',
    operation: 'create',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'attacker-uid', email_verified: true },
    payload: {
      workspaceId: 'martia-shared-main',
      ownerId: 'victim-uid',
      lastUpdatedByUid: 'attacker-uid',
      lastUpdatedByName: 'Attacker',
      payloadJson: '{}',
      syncRevision: 1,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'LastUpdatedBy Spoofing on Update',
    operation: 'update',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'attacker-uid', email_verified: true },
    payload: {
      lastUpdatedByUid: 'victim-uid',
      lastUpdatedByName: 'Victim',
      payloadJson: '{}',
      syncRevision: 2,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Owner Mutation on Update',
    operation: 'update',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'collaborator-uid', email_verified: true },
    payload: {
      ownerId: 'collaborator-uid',
      lastUpdatedByUid: 'collaborator-uid',
      lastUpdatedByName: 'Collaborator',
      payloadJson: '{}',
      syncRevision: 2,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'CreatedAt Mutation on Update',
    operation: 'update',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'user-a', email_verified: true },
    payload: {
      createdAt: '2099-01-01T00:00:00Z',
      lastUpdatedByUid: 'user-a',
      lastUpdatedByName: 'User A',
      payloadJson: '{}',
      syncRevision: 2,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Forged Client Timestamp',
    operation: 'update',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'user-a', email_verified: true },
    payload: {
      updatedAt: '2000-01-01T00:00:00Z',
      lastUpdatedByUid: 'user-a',
      lastUpdatedByName: 'User A',
      payloadJson: '{}',
      syncRevision: 2,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Shadow/Ghost Field Injection',
    operation: 'update',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'user-a', email_verified: true },
    payload: {
      isVerified: true,
      lastUpdatedByUid: 'user-a',
      lastUpdatedByName: 'User A',
      payloadJson: '{}',
      syncRevision: 2,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path ID Mismatch',
    operation: 'create',
    path: '/workspaces/room-a',
    auth: { uid: 'user-a', email_verified: true },
    payload: {
      workspaceId: 'room-b',
      ownerId: 'user-a',
      lastUpdatedByUid: 'user-a',
      lastUpdatedByName: 'User A',
      payloadJson: '{}',
      syncRevision: 1,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Path ID Poisoning',
    operation: 'create',
    path: '/workspaces/invalid$id!@#',
    auth: { uid: 'user-a', email_verified: true },
    payload: {
      workspaceId: 'invalid$id!@#',
      ownerId: 'user-a',
      lastUpdatedByUid: 'user-a',
      lastUpdatedByName: 'User A',
      payloadJson: '{}',
      syncRevision: 1,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Empty PayloadJson Violation',
    operation: 'update',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'user-a', email_verified: true },
    payload: {
      lastUpdatedByUid: 'user-a',
      lastUpdatedByName: 'User A',
      payloadJson: '',
      syncRevision: 2,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Delete by Non-Owner Collaborator',
    operation: 'delete',
    path: '/workspaces/martia-shared-main',
    auth: { uid: 'user-b-non-owner', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
