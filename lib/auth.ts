import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    role: 'BUYER' | 'SELLER';
  };
}

/**
 * Get the current session from request
 * @returns Session object or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return session as Session | null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: 'BUYER' | 'SELLER'): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === role;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
