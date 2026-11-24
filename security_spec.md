# LexiLoom Firestore Security Specification

## 1. Data Invariants
1. **Owner-Isolated Private Profiles (`/users/{userId}`)**: Only the authenticated, email-verified user whose `request.auth.uid == userId` may read, create, or update their own profile. No `list` queries are permitted on `/users`.
2. **Master Gate on Completions (`/users/{userId}/completions/{puzzleId}`)**: A completion record cannot be created unless the parent `/users/{userId}` document exists and `incoming().uid == userId == request.auth.uid`. Once `status == 'completed'`, the record is terminal and immutable.
3. **Zero-PII Leaderboard (`/leaderboard/{userId}`)**: Contains only display name, avatar metadata, friend code, streaks, and scores. `allow list` strictly requires `isSignedIn() && resource.data.isPublic == true`. Only the verified owner can create or update their own entry.
4. **Exact-Match Friend Code Directory (`/friendCodes/{code}`)**: No `list` allowed. Authenticated users may `get` a specific friend code document by ID. Only the verified owner may claim (`create`) an unclaimed code or update their `displayName`.
5. **Temporal Integrity**: All `createdAt`, `updatedAt`, and `completedAt` fields must equal `request.time`. `createdAt`, `uid`, and `friendCode` are immutable after creation.

## 2. The Dirty Dozen Adversarial Payloads
1. **Identity Spoofing on User Create**: User A attempts to create `/users/userB` with `uid: "userB"`. -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on User Create**: User A includes `"isAdmin": true` in `/users/userA`. -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: User with `email_verified: false` attempts to write to `/leaderboard/userA`. -> `PERMISSION_DENIED`.
4. **Immutable FriendCode Mutation**: User A tries to change `friendCode` on `/users/userA` during update. -> `PERMISSION_DENIED`.
5. **PII Cross-User Read**: User A tries to `get` `/users/userB`. -> `PERMISSION_DENIED`.
6. **Unrestricted Collection Scrape**: User A attempts `list` on `/users` or `/friendCodes`. -> `PERMISSION_DENIED`.
7. **Non-Public Leaderboard Scrape**: User A queries `/leaderboard` without `isPublic == true` predicate. -> `PERMISSION_DENIED`.
8. **Value Poisoning / Oversized String**: User A updates `displayName` with a 150-character string or non-string boolean. -> `PERMISSION_DENIED`.
9. **Resource Poisoning via Invalid Doc ID**: User A tries to create `/users/userA/completions/bad id!@#` with invalid characters. -> `PERMISSION_DENIED`.
10. **Array Exhaustion Attack**: User A tries to push 60 items into `friendUids` (limit 50) or puts an integer in `friendUids[0]`. -> `PERMISSION_DENIED`.
11. **Terminal State Violation**: User A attempts to update an already-completed document at `/users/userA/completions/daily-2026-11-19`. -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: User A supplies a backdated `updatedAt` timestamp instead of `request.time`. -> `PERMISSION_DENIED`.
