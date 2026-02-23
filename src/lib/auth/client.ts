/**
 * Neon Auth client for client-side use (e.g. useSession, signIn, signOut).
 * Server-side session retrieval uses lib/auth/server.ts instead.
 */
import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();
