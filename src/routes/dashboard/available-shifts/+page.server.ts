import type { PageServerLoad, Actions } from './$types';
import { requireAuth } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await requireAuth(event);

	// Get all available shifts (no assigned user) that are published
	const availableShifts = await prisma.shift.findMany({
		where: {
			Location: {
				organizationId: session.user.organizationId
			},
			userId: null, // Unclaimed shifts
			status: 'PUBLISHED',
			startTime: {
				gte: new Date() // Only future shifts
			}
		},
		include: {
			Location: {
				select: {
					id: true,
					name: true,
					address: true
				}
			}
		},
		orderBy: {
			startTime: 'asc'
		}
	});

	// Get user's current shifts to check for conflicts
	const myShifts = await prisma.shift.findMany({
		where: {
			userId: session.user.id,
			startTime: {
				gte: new Date()
			}
		},
		select: {
			id: true,
			startTime: true,
			endTime: true
		}
	});

	return {
		availableShifts,
		myShifts,
		session
	};
};

export const actions = {
	pickupShift: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const shiftId = data.get('shiftId') as string;

		if (!shiftId) {
			return fail(400, { error: 'Shift ID is required' });
		}

		try {
			// Check if shift is still available
			const shift = await prisma.shift.findUnique({
				where: { id: shiftId },
				include: {
					Location: true
				}
			});

			if (!shift) {
				return fail(404, { error: 'Shift not found' });
			}

			if (shift.userId) {
				return fail(400, { error: 'This shift has already been claimed' });
			}

			// Check for time conflicts
			const conflictingShift = await prisma.shift.findFirst({
				where: {
					userId: session.user.id,
					OR: [
						{
							AND: [
								{ startTime: { lte: shift.startTime } },
								{ endTime: { gt: shift.startTime } }
							]
						},
						{
							AND: [
								{ startTime: { lt: shift.endTime } },
								{ endTime: { gte: shift.endTime } }
							]
						}
					]
				}
			});

			if (conflictingShift) {
				return fail(400, { error: 'You already have a shift during this time' });
			}

			// Assign shift to user
			await prisma.shift.update({
				where: { id: shiftId },
				data: {
					userId: session.user.id,
					updatedAt: new Date()
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Pickup shift error:', error);
			return fail(500, { error: 'Failed to pick up shift' });
		}
	},

	dropShift: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const shiftId = data.get('shiftId') as string;

		if (!shiftId) {
			return fail(400, { error: 'Shift ID is required' });
		}

		try {
			// Verify user owns this shift
			const shift = await prisma.shift.findUnique({
				where: { id: shiftId }
			});

			if (!shift) {
				return fail(404, { error: 'Shift not found' });
			}

			if (shift.userId !== session.user.id) {
				return fail(403, { error: 'You can only drop your own shifts' });
			}

			// Release shift back to available pool
			await prisma.shift.update({
				where: { id: shiftId },
				data: {
					userId: null,
					updatedAt: new Date()
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Drop shift error:', error);
			return fail(500, { error: 'Failed to drop shift' });
		}
	}
} satisfies Actions;
