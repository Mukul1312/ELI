/**
 * Neon Postgres test branch utility.
 *
 * Uses Neon's database branching API to create isolated test environments.
 * Per: https://neon.tech/docs/guides/branching-neon-api
 *
 * Key benefits:
 * - Isolated test environments for each test run
 * - No test data contamination between runs
 * - Branches can be quickly created and deleted
 * - Perfect for CI/CD pipelines
 *
 * Env: NEON_API_KEY or NEON_TOKEN, NEON_PROJECT_ID; optional NEON_BRANCH_ID to leverage existing branch.
 */

import { v7 as uuid } from 'uuid';

const NEON_API_BASE = 'https://console.neon.tech/api/v2';

export interface NeonBranchResult {
  branchId: string;
  connString: string;
}

export type NeonPostgresConfig = {
  neonToken?: string;
  projectId: string;
  apiKey?: string;
};

export class NeonPostgres {
  readonly #baseUrl: string;
  readonly #headers: Record<string, string>;

  branchId?: string;
  connString?: string;

  constructor(config: NeonPostgresConfig) {
    const token = config.apiKey ?? config.neonToken;
    if (!token) {
      throw new Error('NeonPostgres requires apiKey or neonToken');
    }
    this.#baseUrl = `${NEON_API_BASE}/projects/${config.projectId}`;
    this.#headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new test branch with a random name (test-${uuid}).
   * Returns branch ID and connection string; stores both on instance.
   */
  async createTestBranch(): Promise<NeonBranchResult> {
    const branchName = `test-${uuid()}`;
    const res = await fetch(`${this.#baseUrl}/branches`, {
      method: 'POST',
      headers: this.#headers,
      body: JSON.stringify({
        branch: { name: branchName },
        endpoints: [{ type: 'read_write' }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Neon API create branch failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      branch: { id: string };
      connection_uris?: Array<{ connection_uri: string }>;
    };

    const branchId = data.branch?.id;
    if (!branchId) {
      throw new Error('Neon API response missing branch.id');
    }

    let connString: string;
    if (data.connection_uris?.[0]?.connection_uri) {
      connString = data.connection_uris[0].connection_uri;
    } else {
      const uriRes = await fetch(
        `${this.#baseUrl}/connection_uri?branch_id=${branchId}&database_name=neondb`,
        { headers: this.#headers }
      );
      if (!uriRes.ok) {
        throw new Error(
          `Neon API get connection URI failed (${uriRes.status}): ${await uriRes.text()}`
        );
      }
      const uriData = (await uriRes.json()) as { uri?: string };
      connString = uriData.uri ?? '';
    }

    if (!connString) {
      throw new Error('Could not obtain connection string for test branch');
    }

    this.branchId = branchId;
    this.connString = connString;
    return { branchId, connString };
  }

  /**
   * Use an already-created Neon branch (no create/delete).
   * Do not call deleteBranch() in cleanup when using this.
   */
  async useExistingBranch(branchId: string): Promise<NeonBranchResult> {
    const uriRes = await fetch(
      `${this.#baseUrl}/connection_uri?branch_id=${branchId}&database_name=neondb`,
      { headers: this.#headers }
    );
    if (!uriRes.ok) {
      throw new Error(
        `Neon API get connection URI failed (${uriRes.status}): ${await uriRes.text()}`
      );
    }
    const uriData = (await uriRes.json()) as { uri?: string };
    const connString = uriData.uri ?? '';
    if (!connString) {
      throw new Error('Could not obtain connection string for existing branch');
    }
    this.branchId = branchId;
    this.connString = connString;
    return { branchId, connString };
  }

  /**
   * Delete the previously created branch.
   * Use with no args when branch was created via createTestBranch(); do not call when using useExistingBranch().
   */
  async deleteBranch(branchId?: string): Promise<void> {
    const id = branchId ?? this.branchId;
    if (!id) return;
    const res = await fetch(`${this.#baseUrl}/branches/${id}`, {
      method: 'DELETE',
      headers: this.#headers,
    });
    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      console.warn(`Neon API delete branch failed (${res.status}): ${err}`);
    }
  }
}

/**
 * Check if Neon branching env vars are set (apiKey or token + projectId).
 */
export function canUseNeonBranching(): boolean {
  return !!(process.env.NEON_PROJECT_ID && (process.env.NEON_API_KEY ?? process.env.NEON_TOKEN));
}

/**
 * True when NEON_BRANCH_ID is set (use existing branch, no create/delete).
 */
export function useExistingNeonBranch(): boolean {
  return !!process.env.NEON_BRANCH_ID;
}
