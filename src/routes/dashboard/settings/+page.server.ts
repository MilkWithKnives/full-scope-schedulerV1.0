import type { PageServerLoad, Actions } from './$types';
import { requireRole } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await requireRole(event, ['OWNER', 'MANAGER']);

	// Get organization details
	const organization = await prisma.organization.findUnique({
		where: { id: session.user.organizationId },
		include: {
			locations: {
				orderBy: { name: 'asc' }
			},
			schedulingPreferences: true
		}
	});

	// Get user profile
	const user = await prisma.user.findUnique({
		where: { id: session.user.id }
	});

	return {
		organization,
		user,
		session
	};
};

export const actions = {
	updateOrganization: async (event) => {
		const session = await requireRole(event, ['OWNER']);
		const data = await event.request.formData();
		const name = data.get('name') as string;

		if (!name) {
			return fail(400, { error: 'Organization name is required' });
		}

		try {
			await prisma.organization.update({
				where: { id: session.user.organizationId },
				data: { name }
			});

			return { success: true, message: 'Organization updated successfully' };
		} catch (error) {
			console.error('Update organization error:', error);
			return fail(500, { error: 'Failed to update organization' });
		}
	},

	addLocation: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);
		const data = await event.request.formData();
		const name = data.get('name') as string;
		const address = data.get('address') as string;

		if (!name || !address) {
			return fail(400, { error: 'Name and address are required' });
		}

		try {
			await prisma.location.create({
				data: {
					name,
					address,
					organizationId: session.user.organizationId
				}
			});

			return { success: true, message: 'Location added successfully' };
		} catch (error) {
			console.error('Add location error:', error);
			return fail(500, { error: 'Failed to add location' });
		}
	},

	updateProfile: async (event) => {
		const session = await event.locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await event.request.formData();
		const name = data.get('name') as string;
		const email = data.get('email') as string;

		if (!name || !email) {
			return fail(400, { error: 'Name and email are required' });
		}

		try {
			await prisma.user.update({
				where: { id: session.user.id },
				data: { name, email }
			});

			return { success: true, message: 'Profile updated successfully' };
		} catch (error) {
			console.error('Update profile error:', error);
			return fail(500, { error: 'Failed to update profile' });
		}
	},

	updateSchedulingPreferences: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);
		const data = await event.request.formData();

		// Global constraints
		const defaultMaxHoursPerWeek = data.get('defaultMaxHoursPerWeek') as string;
		const defaultMaxConsecutiveDays = data.get('defaultMaxConsecutiveDays') as string;
		const defaultMinRestHours = data.get('defaultMinRestHours') as string;

		// Algorithm settings
		const preferredLocationWeight = data.get('preferredLocationWeight') as string;
		const costOptimizationEnabled = data.get('costOptimizationEnabled') === 'true';
		const fairDistributionEnabled = data.get('fairDistributionEnabled') === 'true';

		// Auto-scheduling settings
		const autoAssignEnabled = data.get('autoAssignEnabled') === 'true';
		const minScoreThreshold = data.get('minScoreThreshold') as string;

		try {
			// Upsert scheduling preferences (create if doesn't exist, update if it does)
			await prisma.schedulingPreferences.upsert({
				where: { organizationId: session.user.organizationId },
				create: {
					organizationId: session.user.organizationId,
					defaultMaxHoursPerWeek: defaultMaxHoursPerWeek ? parseInt(defaultMaxHoursPerWeek) : 40,
					defaultMaxConsecutiveDays: defaultMaxConsecutiveDays ? parseInt(defaultMaxConsecutiveDays) : 6,
					defaultMinRestHours: defaultMinRestHours ? parseInt(defaultMinRestHours) : 8,
					preferredLocationWeight: preferredLocationWeight ? parseFloat(preferredLocationWeight) : 1.2,
					costOptimizationEnabled,
					fairDistributionEnabled,
					autoAssignEnabled,
					minScoreThreshold: minScoreThreshold ? parseInt(minScoreThreshold) : 60
				},
				update: {
					defaultMaxHoursPerWeek: defaultMaxHoursPerWeek ? parseInt(defaultMaxHoursPerWeek) : 40,
					defaultMaxConsecutiveDays: defaultMaxConsecutiveDays ? parseInt(defaultMaxConsecutiveDays) : 6,
					defaultMinRestHours: defaultMinRestHours ? parseInt(defaultMinRestHours) : 8,
					preferredLocationWeight: preferredLocationWeight ? parseFloat(preferredLocationWeight) : 1.2,
					costOptimizationEnabled,
					fairDistributionEnabled,
					autoAssignEnabled,
					minScoreThreshold: minScoreThreshold ? parseInt(minScoreThreshold) : 60
				}
			});

			return { success: true, message: 'Scheduling preferences updated successfully' };
		} catch (error) {
			console.error('Update scheduling preferences error:', error);
			return fail(500, { error: 'Failed to update scheduling preferences' });
		}
	}
} satisfies Actions;
