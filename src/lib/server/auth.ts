import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Get the current session from the request
 * Returns null if no session exists
 */
export async function getSession(event: RequestEvent) {
	return await event.locals.getSession();
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use this in +page.server.ts load functions for protected routes
 */
export async function requireAuth(event: RequestEvent) {
	const session = await getSession(event);

	if (!session?.user) {
		throw redirect(303, '/auth/login');
	}

	return session;
}

/**
 * Require specific role - redirect if user doesn't have required role
 * Roles hierarchy: OWNER > MANAGER > EMPLOYEE
 */
export async function requireRole(
	event: RequestEvent,
	allowedRoles: ('OWNER' | 'MANAGER' | 'EMPLOYEE')[]
) {
	const session = await requireAuth(event);

	if (!allowedRoles.includes(session.user.role as any)) {
		throw redirect(303, '/dashboard'); // Redirect to dashboard if unauthorized
	}

	return session;
}

/**
 * Check if user has specific role (without redirecting)
 */
export function hasRole(
	session: { user: { role: string } } | null,
	role: 'OWNER' | 'MANAGER' | 'EMPLOYEE'
): boolean {
	return session?.user?.role === role;
}

/**
 * Check if user is owner or manager (admin-level access)
 */
export function isAdmin(session: { user: { role: string } } | null): boolean {
	return hasRole(session, 'OWNER') || hasRole(session, 'MANAGER');
}
