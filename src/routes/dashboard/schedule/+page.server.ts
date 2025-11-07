import type { PageServerLoad, Actions } from './$types';
import { requireRole } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
import { startOfWeek, endOfWeek } from 'date-fns';
import { generateScheduleSuggestions } from '$lib/server/scheduler';
import { getAISchedulingSuggestions, getAIScheduleBuilder } from '$lib/server/ai-scheduler';

export const load: PageServerLoad = async (event) => {
	// Only admins can access schedule management
	const session = await requireRole(event, ['OWNER', 'MANAGER']);

	// Get all locations for this organization
	const locations = await prisma.location.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		orderBy: {
			name: 'asc'
		}
	});

	// Get all users in the organization
	const users = await prisma.user.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			defaultHourlyRate: true
		},
		orderBy: {
			name: 'asc'
		}
	});

	// Get current week's shifts
	const now = new Date();
	const weekStart = startOfWeek(now, { weekStartsOn: 1 });
	const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

	const shifts = await prisma.shift.findMany({
		where: {
			Location: {
				organizationId: session.user.organizationId
			},
			startTime: {
				gte: weekStart,
				lte: weekEnd
			}
		},
		include: {
			User: {
				select: {
					id: true,
					name: true,
					email: true
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

	// Map included relations to lowercase keys for frontend compatibility
	const mappedShifts = shifts.map((shift) => ({
		...shift,
		user: shift.User,
		location: shift.Location
	}));

	return {
		locations,
		users,
		shifts: mappedShifts,
		weekStart: weekStart.toISOString(),
		weekEnd: weekEnd.toISOString()
	};
};

export const actions = {
	createShift: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const locationId = data.get('locationId') as string;
		const userId = data.get('userId') as string | null;
		const role = data.get('role') as string;
		const date = data.get('date') as string;
		const startTime = data.get('startTime') as string;
		const endTime = data.get('endTime') as string;
		const breakMinutes = data.get('breakMinutes') as string;
		const notes = data.get('notes') as string | null;
		const hourlyRate = data.get('hourlyRate') as string | null;

		// Shift requirements
		const requiredSkillsJson = data.get('requiredSkills') as string | null;
		const shiftType = data.get('shiftType') as string | null;
		const priority = data.get('priority') as string | null;
		const minSeniority = data.get('minSeniority') as string | null;

		if (!locationId || !role || !date || !startTime || !endTime) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Combine date and time strings into DateTime objects
			const startDateTime = new Date(`${date}T${startTime}:00`);
			const endDateTime = new Date(`${date}T${endTime}:00`);

			// Handle end time on next day if it's before start time
			if (endDateTime < startDateTime) {
				endDateTime.setDate(endDateTime.getDate() + 1);
			}

			const shift = await prisma.shift.create({
				data: {
					id: crypto.randomUUID(),
					locationId,
					userId: userId || null,
					role,
					startTime: startDateTime,
					endTime: endDateTime,
					breakMinutes: breakMinutes ? parseInt(breakMinutes) : 30,
					notes: notes || null,
					hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
					status: 'DRAFT',
					requiredSkills: requiredSkillsJson ? JSON.parse(requiredSkillsJson) : [],
					shiftType: shiftType || null,
					priority: priority ? parseInt(priority) : 0,
					minSeniority: minSeniority ? parseInt(minSeniority) : null
				},
				include: {
					User: {
						select: {
							id: true,
							name: true,
							email: true,
							defaultHourlyRate: true
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

			return { success: true, shift };
		} catch (error) {
			console.error('Create shift error:', error);
			return fail(500, { error: 'Failed to create shift' });
		}
	},

	updateShift: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const shiftId = data.get('shiftId') as string;
		const locationId = data.get('locationId') as string;
		const userId = data.get('userId') as string | null;
		const role = data.get('role') as string;
		const date = data.get('date') as string;
		const startTime = data.get('startTime') as string;
		const endTime = data.get('endTime') as string;
		const breakMinutes = data.get('breakMinutes') as string;
		const notes = data.get('notes') as string | null;
		const hourlyRate = data.get('hourlyRate') as string | null;

		// Shift requirements
		const requiredSkillsJson = data.get('requiredSkills') as string | null;
		const shiftType = data.get('shiftType') as string | null;
		const priority = data.get('priority') as string | null;
		const minSeniority = data.get('minSeniority') as string | null;

		if (!shiftId || !locationId || !role || !date || !startTime || !endTime) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Combine date and time strings into DateTime objects
			const startDateTime = new Date(`${date}T${startTime}:00`);
			const endDateTime = new Date(`${date}T${endTime}:00`);

			// Handle end time on next day if it's before start time
			if (endDateTime < startDateTime) {
				endDateTime.setDate(endDateTime.getDate() + 1);
			}

			const shift = await prisma.shift.update({
				where: { id: shiftId },
				data: {
					locationId,
					userId: userId || null,
					role,
					startTime: startDateTime,
					endTime: endDateTime,
					breakMinutes: breakMinutes ? parseInt(breakMinutes) : 30,
					notes: notes || null,
					hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
					requiredSkills: requiredSkillsJson ? JSON.parse(requiredSkillsJson) : [],
					shiftType: shiftType || null,
					priority: priority ? parseInt(priority) : 0,
					minSeniority: minSeniority ? parseInt(minSeniority) : null
				},
				include: {
					User: {
						select: {
							id: true,
							name: true,
							email: true,
							defaultHourlyRate: true
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

			return { success: true, shift };
		} catch (error) {
			console.error('Update shift error:', error);
			return fail(500, { error: 'Failed to update shift' });
		}
	},

	deleteShift: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const shiftId = data.get('shiftId') as string;

		if (!shiftId) {
			return fail(400, { error: 'Missing shift ID' });
		}

		try {
			await prisma.shift.delete({
				where: { id: shiftId }
			});

			return { success: true };
		} catch (error) {
			console.error('Delete shift error:', error);
			return fail(500, { error: 'Failed to delete shift' });
		}
	},

	autoSchedule: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Only managers and owners can use auto-schedule
		if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
			return fail(403, { error: 'Insufficient permissions' });
		}

		try {
			const data = await request.formData();
			const weekStartStr = data.get('weekStart') as string;
			const maxHoursPerWeek = data.get('maxHoursPerWeek') as string;
			const costOptimization = data.get('costOptimization') === 'true';

			const weekStart = weekStartStr ? new Date(weekStartStr) : startOfWeek(new Date(), { weekStartsOn: 1 });
			const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

			// Generate scheduling suggestions
			const result = await generateScheduleSuggestions(
				session.user.organizationId,
				weekStart,
				weekEnd,
				{
					maxHoursPerWeek: maxHoursPerWeek ? parseInt(maxHoursPerWeek) : 40,
					costOptimization
				}
			);

			return { success: true, result };
		} catch (error) {
			console.error('Auto-schedule error:', error);
			return fail(500, { error: 'Failed to generate schedule suggestions' });
		}
	},

	applyScheduleSuggestions: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Only managers and owners can apply suggestions
		if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
			return fail(403, { error: 'Insufficient permissions' });
		}

		try {
			const data = await request.formData();
			const suggestionsJSON = data.get('suggestions') as string;

			if (!suggestionsJSON) {
				return fail(400, { error: 'No suggestions provided' });
			}

			const suggestions = JSON.parse(suggestionsJSON);

			// Apply all suggestions in a transaction
			const updates = await prisma.$transaction(
				suggestions.map((suggestion: any) =>
					prisma.shift.update({
						where: { id: suggestion.shiftId },
						data: {
							userId: suggestion.employeeId,
							status: 'PUBLISHED'
						}
					})
				)
			);

			return { success: true, updatedCount: updates.length };
		} catch (error) {
			console.error('Apply suggestions error:', error);
			return fail(500, { error: 'Failed to apply schedule suggestions' });
		}
	},

	bulkDeleteShifts: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		try {
			const data = await event.request.formData();
			const shiftIdsJSON = data.get('shiftIds') as string;

			if (!shiftIdsJSON) {
				return fail(400, { error: 'No shifts provided' });
			}

			const shiftIds = JSON.parse(shiftIdsJSON);

			// Delete all shifts in a transaction
			await prisma.$transaction(
				shiftIds.map((id: string) => prisma.shift.delete({ where: { id } }))
			);

			return { success: true, deletedCount: shiftIds.length };
		} catch (error) {
			console.error('Bulk delete error:', error);
			return fail(500, { error: 'Failed to delete shifts' });
		}
	},

	bulkPublishShifts: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		try {
			const data = await event.request.formData();
			const shiftIdsJSON = data.get('shiftIds') as string;

			if (!shiftIdsJSON) {
				return fail(400, { error: 'No shifts provided' });
			}

			const shiftIds = JSON.parse(shiftIdsJSON);

			// Publish all shifts in a transaction
			const updates = await prisma.$transaction(
				shiftIds.map((id: string) =>
					prisma.shift.update({
						where: { id },
						data: { status: 'PUBLISHED' }
					})
				)
			);

			return { success: true, publishedCount: updates.length };
		} catch (error) {
			console.error('Bulk publish error:', error);
			return fail(500, { error: 'Failed to publish shifts' });
		}
	},

	bulkAssignShifts: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		try {
			const data = await event.request.formData();
			const shiftIdsJSON = data.get('shiftIds') as string;
			const userId = data.get('userId') as string;

			if (!shiftIdsJSON || !userId) {
				return fail(400, { error: 'Missing required fields' });
			}

			const shiftIds = JSON.parse(shiftIdsJSON);

			// Assign all shifts to the user in a transaction
			const updates = await prisma.$transaction(
				shiftIds.map((id: string) =>
					prisma.shift.update({
						where: { id },
						data: { userId }
					})
				)
			);

			return { success: true, assignedCount: updates.length };
		} catch (error) {
			console.error('Bulk assign error:', error);
			return fail(500, { error: 'Failed to assign shifts' });
		}
	},

	// AI-powered actions
	getAISuggestions: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		try {
			const data = await event.request.formData();
			const coverageGapsJSON = data.get('coverageGaps') as string;
			const employeesJSON = data.get('employees') as string;
			const shiftsJSON = data.get('shifts') as string;

			if (!coverageGapsJSON || !employeesJSON || !shiftsJSON) {
				return fail(400, { error: 'Missing required data' });
			}

			const coverageGaps = JSON.parse(coverageGapsJSON);
			const employees = JSON.parse(employeesJSON);
			const shifts = JSON.parse(shiftsJSON);

			const aiResponse = await getAISchedulingSuggestions({
				employees,
				shifts,
				coverageGaps,
				constraints: {
					maxHoursPerWeek: 40,
					minRestHours: 8
				}
			});

			return { success: true, aiResponse };
		} catch (error) {
			console.error('AI suggestions error:', error);
			return fail(500, { error: 'Failed to get AI suggestions' });
		}
	},

	askAIAssistant: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		try {
			const data = await event.request.formData();
			const question = data.get('question') as string;
			const employeesJSON = data.get('employees') as string;
			const shiftsJSON = data.get('shifts') as string;

			if (!question || !employeesJSON || !shiftsJSON) {
				return fail(400, { error: 'Missing required data' });
			}

			const employees = JSON.parse(employeesJSON);
			const shifts = JSON.parse(shiftsJSON);

			const aiResponse = await getAIScheduleBuilder(
				{
					employees,
					shifts,
					coverageGaps: []
				},
				question
			);

			return { success: true, aiResponse };
		} catch (error) {
			console.error('AI assistant error:', error);
			return fail(500, { error: 'Failed to get AI response' });
		}
	}
} satisfies Actions;
