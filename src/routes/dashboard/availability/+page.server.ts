import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { requireAuth } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await requireAuth(event);

	// Get all availability records for this user
	const availability = await prisma.availability.findMany({
		where: {
			userId: session.user.id,
			isRecurring: true,
			specificDate: null // Only get recurring availability
		},
		orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
	});

	return {
		availability
	};
};

export const actions = {
	setAvailability: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const dayOfWeek = parseInt(data.get('dayOfWeek') as string);
		const startTime = data.get('startTime') as string;
		const endTime = data.get('endTime') as string;

		if (isNaN(dayOfWeek) || !startTime || !endTime) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Create availability slot
			const availability = await prisma.availability.create({
				data: {
					userId: session.user.id,
					dayOfWeek,
					startTime,
					endTime,
					isRecurring: true
				}
			});

			return { success: true, availability };
		} catch (error) {
			console.error('Set availability error:', error);
			return fail(500, { error: 'Failed to set availability' });
		}
	},

	deleteAvailability: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const availabilityId = data.get('availabilityId') as string;

		if (!availabilityId) {
			return fail(400, { error: 'Missing availability ID' });
		}

		try {
			// Verify ownership before deleting
			const availability = await prisma.availability.findUnique({
				where: { id: availabilityId }
			});

			if (!availability || availability.userId !== session.user.id) {
				return fail(403, { error: 'Not authorized to delete this availability' });
			}

			await prisma.availability.delete({
				where: { id: availabilityId }
			});

			return { success: true };
		} catch (error) {
			console.error('Delete availability error:', error);
			return fail(500, { error: 'Failed to delete availability' });
		}
	},

	clearDay: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const dayOfWeek = parseInt(data.get('dayOfWeek') as string);

		if (isNaN(dayOfWeek)) {
			return fail(400, { error: 'Invalid day' });
		}

		try {
			await prisma.availability.deleteMany({
				where: {
					userId: session.user.id,
					dayOfWeek,
					isRecurring: true
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Clear day error:', error);
			return fail(500, { error: 'Failed to clear day' });
		}
	}
} satisfies Actions;
