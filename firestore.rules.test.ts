/**
 * LexiLoom Firestore Security Rules — Dirty Dozen Verification Specification
 *
 * Maps each adversarial attack vector to the exact boolean guard in firestore.rules
 * that rejects it with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedBy: string;
}

export const dirtyDozenTests: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on User Create',
    operation: 'create',
    path: '/users/userB',
    auth: { uid: 'userA', email_verified: true },
    payload: { uid: 'userB', displayName: 'Spoofer' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isVerifiedOwner(userId) && data.uid == request.auth.uid'
  },
  {
    id: 2,
    name: 'Shadow Field Injection on User Create',
    operation: 'create',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: { uid: 'userA', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'data.keys().hasOnly([...]) inside isValidUserProfile'
  },
  {
    id: 3,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/leaderboard/userA',
    auth: { uid: 'userA', email_verified: false },
    payload: { uid: 'userA', isPublic: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isVerifiedOwner(userId) checks request.auth.token.email_verified == true'
  },
  {
    id: 4,
    name: 'Immutable FriendCode Mutation',
    operation: 'update',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: { friendCode: 'HACK-9999' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().friendCode == existing().friendCode && affectedKeys().hasOnly(...)'
  },
  {
    id: 5,
    name: 'PII Cross-User Read',
    operation: 'get',
    path: '/users/userB',
    auth: { uid: 'userA', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow get: if isOwner(userId)'
  },
  {
    id: 6,
    name: 'Unrestricted Collection Scrape',
    operation: 'list',
    path: '/users',
    auth: { uid: 'userA', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow list: if false on /users and /friendCodes'
  },
  {
    id: 7,
    name: 'Non-Public Leaderboard Scrape',
    operation: 'list',
    path: '/leaderboard',
    auth: { uid: 'userA', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow list: if isSignedIn() && resource.data.isPublic == true'
  },
  {
    id: 8,
    name: 'Value Poisoning / Oversized String',
    operation: 'update',
    path: '/leaderboard/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: { displayName: 'X'.repeat(150) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidLeaderboardEntry enforces data.displayName.size() <= 40'
  },
  {
    id: 9,
    name: 'Resource Poisoning via Invalid Doc ID',
    operation: 'create',
    path: '/users/userA/completions/bad id!@#',
    auth: { uid: 'userA', email_verified: true },
    payload: { puzzleId: 'bad id!@#' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidId(puzzleId) regex ^[a-zA-Z0-9_\\-]+$'
  },
  {
    id: 10,
    name: 'Array Exhaustion Attack',
    operation: 'update',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: { friendUids: Array.from({ length: 60 }, (_, i) => `u${i}`) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidStringArray(data.friendUids, 50)'
  },
  {
    id: 11,
    name: 'Terminal State Violation on Completion',
    operation: 'update',
    path: '/users/userA/completions/daily-2026-11-19',
    auth: { uid: 'userA', email_verified: true },
    payload: { score: 99999 },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow update: if false on /users/{userId}/completions/{puzzleId}'
  },
  {
    id: 12,
    name: 'Client Timestamp Forgery',
    operation: 'update',
    path: '/users/userA',
    auth: { uid: 'userA', email_verified: true },
    payload: { updatedAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().updatedAt == request.time'
  }
];
