---
name: Neon branching article alignment
overview: Align NeonPostgres with the article's API (uuid branch name, instance state, parameterless deleteBranch, dual env support), support leveraging an existing Neon branch when set, and keep setupDbForTests and connection_uri optimization.
todos: []
isProject: false
---

# Neon Branching: Best of Article + Current Code

## Goals

- Match the article’s **API shape** (instance state, parameterless `deleteBranch`, branch naming).
- **Fully leverage existing branch**: when `NEON_BRANCH_ID` is set, use that branch (fetch its connection URI, run tests, no create/delete).
- Keep **current strengths**: `setupDbForTests()`, DATABASE_URL fallback, migration, and fewer API calls when create returns `connection_uris`.
- Support **both** env vars: `NEON_TOKEN` (article) and `NEON_API_KEY` (Neon docs / Cursor rules).

## 1. NeonPostgres class — [src/test/neon-postgres.ts](src/test/neon-postgres.ts)

**Branch name (article):** Use `uuid` v7 for the branch name. Add devDependency `uuid` and:

```ts
import { v7 as uuid } from 'uuid';
// ...
branch: { name: `test-${uuid()}` }
```

**Constructor (support both article and codebase):** Accept either the article’s or the current names and resolve one token:

- Config type: `{ neonToken?: string; projectId: string; apiKey?: string }`.
- Token: `const token = config.apiKey ?? config.neonToken`; throw if missing.
- So callers can use `neonToken` + `projectId` (article) or `apiKey` + `projectId` (current).

**Instance state (article):** In `createTestBranch()`:

- Set `this.branchId = branch.id` and `this.connString = uri` (use mutable instance properties; not readonly so they can be set after construction).
- Still return `{ branchId, connString }` for callers that don’t rely on instance state.

**Connection URI (keep current optimization):** Keep existing logic: use `connection_uris[0].connection_uri` from the create response when present; otherwise call the `connection_uri?branch_id=...&database_name=neondb` endpoint (article’s approach). No change to the fallback URL.

**deleteBranch (article):** Support parameterless usage:

- Signature: `deleteBranch(branchId?: string): Promise<void>`.
- Use `const id = branchId ?? this.branchId`; if no `id`, return early (no-op). Call `DELETE .../branches/${id}`.
- Keeps compatibility with current `deleteBranch(branchId)` and article’s `deleteBranch()`.

**Leverage existing branch:** Add a method that uses an already-created Neon branch (no create/delete):

- Method: `useExistingBranch(branchId: string): Promise<NeonBranchResult>`.
- Fetch connection URI via `GET ${this.#baseUrl}/connection_uri?branch_id=${branchId}&database_name=neondb` (and `role_name` if required by API).
- Set `this.branchId = branchId` and `this.connString = uri`; return `{ branchId, connString }`.
- Callers that use `useExistingBranch()` must **not** call `deleteBranch()` in cleanup (branch is long-lived).
- Optional: set `this.createdByUs = false` (or similar) when using existing branch so cleanup can no-op delete.

## 2. canUseNeonBranching() — same file

- Require: `(NEON_API_KEY || NEON_TOKEN) && NEON_PROJECT_ID`.
- Update to: `return !!(process.env.NEON_PROJECT_ID && (process.env.NEON_API_KEY ?? process.env.NEON_TOKEN));`
- Optional helper: `useExistingNeonBranch(): boolean` — true when `NEON_BRANCH_ID` is set (so setup uses existing branch and does not delete in cleanup).

## 3. db-test-setup — [src/test/db-test-setup.ts](src/test/db-test-setup.ts)

- When constructing `NeonPostgres`, pass a single token and projectId, e.g.  
`apiKey: process.env.NEON_API_KEY ?? process.env.NEON_TOKEN!` and `projectId: process.env.NEON_PROJECT_ID!` (guard with `canUseNeonBranching()` so both are set).
- **Leverage existing branch:** If `NEON_BRANCH_ID` is set:
  - Call `neon.useExistingBranch(process.env.NEON_BRANCH_ID)` instead of `createTestBranch()`.
  - Run migration on the returned `connString`, create store, return `{ store, connectionString, cleanup }`.
  - In `cleanup`, only close the store; **do not** call `neon.deleteBranch()` (branch is pre-existing and must persist).
- **Create-branch mode:** If `NEON_BRANCH_ID` is not set:
  - Call `neon.createTestBranch()` as today, run migration, create store.
  - In `cleanup`, close store and call `neon.deleteBranch()` with no arguments.

## 4. Documentation

- **[docs/testing-neon-branching.md](docs/testing-neon-branching.md):** In the env table, add `NEON_TOKEN` as an alternative to `NEON_API_KEY` (article uses it). Add `NEON_BRANCH_ID` (optional): when set, tests use this existing Neon branch (no create/delete); when unset, a new branch is created per run and deleted in cleanup. State that either `NEON_API_KEY` or `NEON_TOKEN` is required for Neon branching.
- **Option B (direct usage):** Show article-style usage: `neonDb.createTestBranch()` then in afterAll `await neonDb.deleteBranch()` (no argument). Add example for existing branch: set `NEON_BRANCH_ID`, call `neonDb.useExistingBranch(process.env.NEON_BRANCH_ID)`, use connString; in afterAll only close pool (no deleteBranch). “return value”- **[README.md](README.md):** In the integration tests section, mention that either `NEON_API_KEY` or `NEON_TOKEN` (plus `NEON_PROJECT_ID`) can be used for Neon branching, and that optional `NEON_BRANCH_ID` leverages an existing branch when set.

## 5. Dependency

- Add **uuid** as a **devDependency** (used only in tests). Use a recent version that supports `v7` (e.g. `^10.0.0` or per npm).

## Out of scope

- No change to which tests use `setupDbForTests()` (e.g. get-institute-scope stays as is).
- No new test file; only the utility and docs are updated to support both patterns.

## Summary


| Area            | Article                      | Current                | Choice                                                                     |
| --------------- | ---------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| Branch name     | `uuid()` v7                  | `crypto.randomUUID()`  | Use `uuid` v7 (article)                                                    |
| Token env       | NEON_TOKEN                   | NEON_API_KEY           | Support both                                                               |
| Instance state  | Yes (branchId, connString)   | No                     | Add (article)                                                              |
| deleteBranch    | No param                     | branchId param         | Optional param; use instance if omitted                                    |
| Connection URI  | Always separate fetch        | Prefer create response | Keep current (fewer calls when possible)                                   |
| Test helper     | Manual pool + deleteBranch() | setupDbForTests()      | Keep setupDbForTests(); use parameterless deleteBranch inside it           |
| Existing branch | N/A (create per run)         | N/A                    | When `NEON_BRANCH_ID` set: use it (no create/delete); else create + delete |


