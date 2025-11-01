import type { LayoutServerLoad } from './$types';
import { requireAuth } from '$lib/server/auth';

export const load: LayoutServerLoad = async (event) => {
	// Require authentication for all dashboard routes
	const session = await requireAuth(event);

	return {
		user: session.user
	};
};
