import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { requireAuth } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import { startOfDay, endOfDay } from 'date-fns';

export const load: PageServerLoad = async (event) => {
	const session = await requireAuth(event);

	const today = new Date();
	const todayStart = startOfDay(today);
	const todayEnd = endOfDay(today);

	// Get today's shifts for this employee
	const todayShifts = await prisma.shift.findMany({
		where: {
			userId: session.user.id,
			startTime: {
				gte: todayStart,
				lte: todayEnd
			}
		},
		include: {
			location: {
				select: {
					id: true,
					name: true,
					address: true,
					latitude: true,
					longitude: true
				}
			}
		},
		orderBy: {
			startTime: 'asc'
		}
	});

	// Get all shifts for the next 7 days
	const nextWeekEnd = new Date(today);
	nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

	const upcomingShifts = await prisma.shift.findMany({
		where: {
			userId: session.user.id,
			startTime: {
				gte: today,
				lte: nextWeekEnd
			}
		},
		include: {
			location: {
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

	// Get active time entry (clocked in but not clocked out)
	const activeTimeEntry = await prisma.timeEntry.findFirst({
		where: {
			userId: session.user.id,
			clockOut: null
		},
		include: {
			location: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	return {
		todayShifts,
		upcomingShifts,
		activeTimeEntry
	};
};

export const actions = {
	clockIn: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const locationId = data.get('locationId') as string;
		const latitude = parseFloat(data.get('latitude') as string);
		const longitude = parseFloat(data.get('longitude') as string);
		const shiftId = data.get('shiftId') as string | null;

		if (!locationId || isNaN(latitude) || isNaN(longitude)) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Check if user already has an active time entry
			const existingEntry = await prisma.timeEntry.findFirst({
				where: {
					userId: session.user.id,
					clockOut: null
				}
			});

			if (existingEntry) {
				return fail(400, { error: 'You are already clocked in' });
			}

			// Create time entry
			const timeEntry = await prisma.timeEntry.create({
				data: {
					userId: session.user.id,
					locationId,
					shiftId: shiftId || null,
					clockIn: new Date(),
					clockInLat: latitude,
					clockInLng: longitude
				}
			});

			return { success: true, timeEntry };
		} catch (error) {
			console.error('Clock in error:', error);
			return fail(500, { error: 'Failed to clock in' });
		}
	},

	clockOut: async ({ locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			// Find active time entry
			const activeEntry = await prisma.timeEntry.findFirst({
				where: {
					userId: session.user.id,
					clockOut: null
				}
			});

			if (!activeEntry) {
				return fail(400, { error: 'You are not clocked in' });
			}

			// Update with clock out time
			const timeEntry = await prisma.timeEntry.update({
				where: { id: activeEntry.id },
				data: {
					clockOut: new Date()
				}
			});

			return { success: true, timeEntry };
		} catch (error) {
			console.error('Clock out error:', error);
			return fail(500, { error: 'Failed to clock out' });
		}
	}
} satisfies Actions;
