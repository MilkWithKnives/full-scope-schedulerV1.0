import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { requireAuth, requireRole } from '$lib/server/auth';
import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await requireAuth(event);

	const today = new Date();
	const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
	const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

	// Get all shifts for the current week in the organization
	const shifts = await prisma.shift.findMany({
		where: {
			startTime: {
				gte: weekStart,
				lte: weekEnd
			},
			Location: {
				organizationId: session.user.organizationId
			},
			status: { in: ['PUBLISHED', 'CONFIRMED'] }
		},
		include: {
			User: {
				select: {
					id: true,
					name: true,
					role: true
				}
			},
			Location: {
				select: {
					id: true,
					name: true
				}
			}
		},
		orderBy: {
			startTime: 'asc'
		}
	});

	// Get all team members in the organization
	const teamMembers = await prisma.user.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		select: {
			id: true,
			name: true,
			role: true,
			email: true,
			phone: true,
			defaultHourlyRate: true,
			preferredLocationId: true,
			maxHoursPerWeek: true,
			minHoursPerWeek: true,
			maxConsecutiveDays: true,
			minRestHours: true,
			seniority: true,
			isFullTime: true,
			skills: true,
			shiftTypePreferences: true
		},
		orderBy: {
			name: 'asc'
		}
	});

	// Get active clock-ins (who's working right now)
	const activeClockIns = await prisma.timeEntry.findMany({
		where: {
			User: {
				organizationId: session.user.organizationId
			},
			clockOut: null
		},
		include: {
			User: {
				select: {
					id: true,
					name: true
				}
			},
			Location: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	// Get all locations for this organization
	const locations = await prisma.location.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		orderBy: {
			name: 'asc'
		}
	});

	return {
		session,
		shifts,
		teamMembers,
		activeClockIns,
		locations,
		weekStart: weekStart.toISOString(),
		weekEnd: weekEnd.toISOString()
	};
};

export const actions = {
	inviteEmployee: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		const data = await event.request.formData();
		const name = data.get('name') as string;
		const email = data.get('email') as string;
		const role = data.get('role') as string;
		const defaultHourlyRate = data.get('defaultHourlyRate') as string | null;
		const phoneNumber = data.get('phoneNumber') as string | null;
		const preferredLocationId = data.get('preferredLocationId') as string | null;

		// Scheduling preferences
		const maxHoursPerWeek = data.get('maxHoursPerWeek') as string | null;
		const minHoursPerWeek = data.get('minHoursPerWeek') as string | null;
		const maxConsecutiveDays = data.get('maxConsecutiveDays') as string | null;
		const minRestHours = data.get('minRestHours') as string | null;
		const seniority = data.get('seniority') as string | null;
		const isFullTime = data.get('isFullTime') === 'true';
		const skillsJson = data.get('skills') as string | null;
		const shiftTypePreferencesJson = data.get('shiftTypePreferences') as string | null;

		if (!name || !email || !role) {
			return fail(400, { error: 'Missing required fields' });
		}

		// Check if user with this email already exists
		const existing = await prisma.user.findUnique({
			where: { email }
		});

		if (existing) {
			return fail(400, { error: 'A user with this email already exists' });
		}

		try {
			const user = await prisma.user.create({
				data: {
					name,
					email,
					role: role as 'OWNER' | 'MANAGER' | 'EMPLOYEE',
					organizationId: session.user.organizationId,
					phone: phoneNumber || null,
					defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : null,
					preferredLocationId: preferredLocationId || null,
					maxHoursPerWeek: maxHoursPerWeek ? parseInt(maxHoursPerWeek) : null,
					minHoursPerWeek: minHoursPerWeek ? parseInt(minHoursPerWeek) : null,
					maxConsecutiveDays: maxConsecutiveDays ? parseInt(maxConsecutiveDays) : null,
					minRestHours: minRestHours ? parseInt(minRestHours) : null,
					seniority: seniority ? parseInt(seniority) : null,
					isFullTime,
					skills: skillsJson ? JSON.parse(skillsJson) : [],
					shiftTypePreferences: shiftTypePreferencesJson ? JSON.parse(shiftTypePreferencesJson) : []
				}
			});

			// TODO: Send invitation email with Auth.js magic link

			return { success: true, user };
		} catch (error) {
			console.error('Invite employee error:', error);
			return fail(500, { error: 'Failed to invite employee' });
		}
	},

	updateEmployee: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		const data = await event.request.formData();
		const employeeId = data.get('employeeId') as string;
		const name = data.get('name') as string;
		const role = data.get('role') as string;
		const defaultHourlyRate = data.get('defaultHourlyRate') as string | null;
		const phoneNumber = data.get('phoneNumber') as string | null;
		const preferredLocationId = data.get('preferredLocationId') as string | null;

		// Scheduling preferences
		const maxHoursPerWeek = data.get('maxHoursPerWeek') as string | null;
		const minHoursPerWeek = data.get('minHoursPerWeek') as string | null;
		const maxConsecutiveDays = data.get('maxConsecutiveDays') as string | null;
		const minRestHours = data.get('minRestHours') as string | null;
		const seniority = data.get('seniority') as string | null;
		const isFullTime = data.get('isFullTime') === 'true';
		const skillsJson = data.get('skills') as string | null;
		const shiftTypePreferencesJson = data.get('shiftTypePreferences') as string | null;

		if (!employeeId || !name || !role) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Verify employee is in the same organization
			const employee = await prisma.user.findFirst({
				where: {
					id: employeeId,
					organizationId: session.user.organizationId
				}
			});

			if (!employee) {
				return fail(404, { error: 'Employee not found' });
			}

			const updated = await prisma.user.update({
				where: { id: employeeId },
				data: {
					name,
					role: role as 'OWNER' | 'MANAGER' | 'EMPLOYEE',
					phone: phoneNumber || null,
					defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : null,
					preferredLocationId: preferredLocationId || null,
					maxHoursPerWeek: maxHoursPerWeek ? parseInt(maxHoursPerWeek) : null,
					minHoursPerWeek: minHoursPerWeek ? parseInt(minHoursPerWeek) : null,
					maxConsecutiveDays: maxConsecutiveDays ? parseInt(maxConsecutiveDays) : null,
					minRestHours: minRestHours ? parseInt(minRestHours) : null,
					seniority: seniority ? parseInt(seniority) : null,
					isFullTime,
					skills: skillsJson ? JSON.parse(skillsJson) : [],
					shiftTypePreferences: shiftTypePreferencesJson ? JSON.parse(shiftTypePreferencesJson) : []
				}
			});

			return { success: true, user: updated };
		} catch (error) {
			console.error('Update employee error:', error);
			return fail(500, { error: 'Failed to update employee' });
		}
	},

	removeEmployee: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		const data = await event.request.formData();
		const employeeId = data.get('employeeId') as string;

		if (!employeeId) {
			return fail(400, { error: 'Missing employee ID' });
		}

		try {
			// Verify employee is in the same organization
			const employee = await prisma.user.findFirst({
				where: {
					id: employeeId,
					organizationId: session.user.organizationId
				}
			});

			if (!employee) {
				return fail(404, { error: 'Employee not found' });
			}

			// Prevent removing the last owner
			if (employee.role === 'OWNER') {
				const ownerCount = await prisma.user.count({
					where: {
						organizationId: session.user.organizationId,
						role: 'OWNER'
					}
				});

				if (ownerCount <= 1) {
					return fail(400, { error: 'Cannot remove the last owner' });
				}
			}

			// Instead of deleting, we could set them as inactive or remove from org
			// For now, we'll delete their shifts and time entries, then the user
			await prisma.$transaction([
				prisma.shift.deleteMany({
					where: { userId: employeeId }
				}),
				prisma.timeEntry.deleteMany({
					where: { userId: employeeId }
				}),
				prisma.user.delete({
					where: { id: employeeId }
				})
			]);

			return { success: true };
		} catch (error) {
			console.error('Remove employee error:', error);
			return fail(500, { error: 'Failed to remove employee' });
		}
	}
} satisfies Actions;
