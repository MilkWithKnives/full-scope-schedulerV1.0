import type { PageServerLoad, Actions } from './$types';
import { requireRole } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	// Only managers and owners can manage templates
	const session = await requireRole(event, ['OWNER', 'MANAGER']);

	// Get all shift templates for this organization
	const templates = await prisma.shiftTemplate.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		orderBy: [
			{ dayOfWeek: 'asc' },
			{ startTime: 'asc' }
		]
	});

	// Get all locations for dropdown
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
		templates,
		locations
	};
};

export const actions = {
	createTemplate: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		const data = await event.request.formData();
		const name = data.get('name') as string;
		const dayOfWeek = data.get('dayOfWeek') as string;
		const startTime = data.get('startTime') as string;
		const endTime = data.get('endTime') as string;
		const role = data.get('role') as string;
		const locationId = data.get('locationId') as string | null;
		const breakMinutes = data.get('breakMinutes') as string;

		if (!name || !dayOfWeek || !startTime || !endTime || !role) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const template = await prisma.shiftTemplate.create({
				data: {
					organizationId: session.user.organizationId,
					name,
					dayOfWeek: parseInt(dayOfWeek),
					startTime,
					endTime,
					role,
					locationId: locationId || null,
					breakMinutes: breakMinutes ? parseInt(breakMinutes) : 30,
					isActive: true
				}
			});

			return { success: true, template };
		} catch (error) {
			console.error('Create template error:', error);
			return fail(500, { error: 'Failed to create template' });
		}
	},

	updateTemplate: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		const data = await event.request.formData();
		const templateId = data.get('templateId') as string;
		const name = data.get('name') as string;
		const dayOfWeek = data.get('dayOfWeek') as string;
		const startTime = data.get('startTime') as string;
		const endTime = data.get('endTime') as string;
		const role = data.get('role') as string;
		const locationId = data.get('locationId') as string | null;
		const breakMinutes = data.get('breakMinutes') as string;
		const isActive = data.get('isActive') === 'true';

		if (!templateId || !name || !dayOfWeek || !startTime || !endTime || !role) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const template = await prisma.shiftTemplate.update({
				where: { id: templateId },
				data: {
					name,
					dayOfWeek: parseInt(dayOfWeek),
					startTime,
					endTime,
					role,
					locationId: locationId || null,
					breakMinutes: breakMinutes ? parseInt(breakMinutes) : 30,
					isActive
				}
			});

			return { success: true, template };
		} catch (error) {
			console.error('Update template error:', error);
			return fail(500, { error: 'Failed to update template' });
		}
	},

	deleteTemplate: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		const data = await event.request.formData();
		const templateId = data.get('templateId') as string;

		if (!templateId) {
			return fail(400, { error: 'Missing template ID' });
		}

		try {
			await prisma.shiftTemplate.delete({
				where: { id: templateId }
			});

			return { success: true };
		} catch (error) {
			console.error('Delete template error:', error);
			return fail(500, { error: 'Failed to delete template' });
		}
	},

	applyTemplates: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);

		const data = await event.request.formData();
		const weekStartStr = data.get('weekStart') as string;
		const templateIdsJSON = data.get('templateIds') as string;

		if (!weekStartStr || !templateIdsJSON) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const weekStart = new Date(weekStartStr);
			const templateIds = JSON.parse(templateIdsJSON);

			// Fetch the templates
			const templates = await prisma.shiftTemplate.findMany({
				where: {
					id: { in: templateIds },
					organizationId: session.user.organizationId,
					isActive: true
				}
			});

			if (templates.length === 0) {
				return fail(400, { error: 'No valid templates found' });
			}

			// Get default location if needed
			const defaultLocation = await prisma.location.findFirst({
				where: { organizationId: session.user.organizationId }
			});

			if (!defaultLocation) {
				return fail(400, { error: 'No location available' });
			}

			// Create shifts from templates
			const shifts = [];
			for (const template of templates) {
				// Calculate the date for this day of week
				const targetDate = new Date(weekStart);
				const daysToAdd = template.dayOfWeek - targetDate.getDay();
				targetDate.setDate(targetDate.getDate() + (daysToAdd >= 0 ? daysToAdd : daysToAdd + 7));

				// Parse times and create DateTime objects
				const [startHour, startMinute] = template.startTime.split(':').map(Number);
				const [endHour, endMinute] = template.endTime.split(':').map(Number);

				const startDateTime = new Date(targetDate);
				startDateTime.setHours(startHour, startMinute, 0, 0);

				const endDateTime = new Date(targetDate);
				endDateTime.setHours(endHour, endMinute, 0, 0);

				// Handle overnight shifts
				if (endDateTime <= startDateTime) {
					endDateTime.setDate(endDateTime.getDate() + 1);
				}

				shifts.push({
					locationId: template.locationId || defaultLocation.id,
					role: template.role,
					startTime: startDateTime,
					endTime: endDateTime,
					breakMinutes: template.breakMinutes,
					status: 'DRAFT' as const,
					notes: `Created from template: ${template.name}`
				});
			}

			// Create all shifts in a transaction
			const createdShifts = await prisma.$transaction(
				shifts.map((shift) => prisma.shift.create({ data: shift }))
			);

			return { success: true, count: createdShifts.length };
		} catch (error) {
			console.error('Apply templates error:', error);
			return fail(500, { error: 'Failed to apply templates' });
		}
	}
} satisfies Actions;
