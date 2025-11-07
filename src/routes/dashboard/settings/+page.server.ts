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
			Location: {
				orderBy: { name: 'asc' }
			},
			SchedulingPreferences: true
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
		const timezone = data.get('timezone') as string;

		if (!name) {
			return fail(400, { error: 'Organization name is required' });
		}

		try {
			await prisma.organization.update({
				where: { id: session.user.organizationId },
				data: {
					name,
					timezone: timezone || 'America/New_York'
				}
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
		const latitude = data.get('latitude') as string;
		const longitude = data.get('longitude') as string;
		const geofenceRadius = data.get('geofenceRadius') as string;

		if (!name || !address) {
			return fail(400, { error: 'Name and address are required' });
		}

		try {
			await prisma.location.create({
				data: {
					name,
					address,
					latitude: latitude ? parseFloat(latitude) : null,
					longitude: longitude ? parseFloat(longitude) : null,
					geofenceRadius: geofenceRadius ? parseInt(geofenceRadius) : 250,
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
	},

	updateScheduleSettings: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);
		const data = await event.request.formData();

		const firstDayOfWeek = data.get('firstDayOfWeek') as string;
		const hoursOfOperationStart = data.get('hoursOfOperationStart') as string;
		const hoursOfOperationEnd = data.get('hoursOfOperationEnd') as string;
		const scheduleVisibleToEmployees = data.get('scheduleVisibleToEmployees') === 'on';
		const coworkersVisibleToEmployees = data.get('coworkersVisibleToEmployees') === 'on';
		const timeOffVisibleToEmployees = data.get('timeOffVisibleToEmployees') === 'on';
		const scheduleVisibleToManagers = data.get('scheduleVisibleToManagers') === 'on';

		try {
			await prisma.organization.update({
				where: { id: session.user.organizationId },
				data: {
					firstDayOfWeek: firstDayOfWeek ? parseInt(firstDayOfWeek) : 1,
					hoursOfOperationStart: hoursOfOperationStart || '00:00',
					hoursOfOperationEnd: hoursOfOperationEnd || '23:59',
					scheduleVisibleToEmployees,
					coworkersVisibleToEmployees,
					timeOffVisibleToEmployees,
					scheduleVisibleToManagers
				}
			});

			return { success: true, message: 'Schedule settings updated successfully' };
		} catch (error) {
			console.error('Update schedule settings error:', error);
			return fail(500, { error: 'Failed to update schedule settings' });
		}
	},

	updateTimeClockSettings: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);
		const data = await event.request.formData();

		const timeClockEnabled = data.get('timeClockEnabled') === 'on';
		const geofencingEnabled = data.get('geofencingEnabled') === 'on';
		const earlyClockInMinutes = data.get('earlyClockInMinutes') as string;
		const lateClockInMinutes = data.get('lateClockInMinutes') as string;
		const autoEndBeforeOvertime = data.get('autoEndBeforeOvertime') === 'on';
		const overtimeThreshold = data.get('overtimeThreshold') as string;
		const roundingEnabled = data.get('roundingEnabled') === 'on';
		const roundingMinutes = data.get('roundingMinutes') as string;
		const breaksEnabled = data.get('breaksEnabled') === 'on';
		const defaultBreakMinutes = data.get('defaultBreakMinutes') as string;
		const breakPaid = data.get('breakPaid') === 'on';

		try {
			await prisma.organization.update({
				where: { id: session.user.organizationId },
				data: {
					timeClockEnabled,
					geofencingEnabled,
					earlyClockInMinutes: earlyClockInMinutes ? parseInt(earlyClockInMinutes) : 15,
					lateClockInMinutes: lateClockInMinutes ? parseInt(lateClockInMinutes) : 15,
					autoEndBeforeOvertime,
					overtimeThreshold: overtimeThreshold ? parseInt(overtimeThreshold) : 40,
					roundingEnabled,
					roundingMinutes: roundingMinutes ? parseInt(roundingMinutes) : 15,
					breaksEnabled,
					defaultBreakMinutes: defaultBreakMinutes ? parseInt(defaultBreakMinutes) : 30,
					breakPaid
				}
			});

			return { success: true, message: 'Time clock settings updated successfully' };
		} catch (error) {
			console.error('Update time clock settings error:', error);
			return fail(500, { error: 'Failed to update time clock settings' });
		}
	},

	updatePermissions: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);
		const data = await event.request.formData();

		const employeesCanSwapShifts = data.get('employeesCanSwapShifts') === 'on';
		const swapRequiresApproval = data.get('swapRequiresApproval') === 'on';
		const employeesCanRequestTimeOff = data.get('employeesCanRequestTimeOff') === 'on';
		const employeesCanViewCoworkers = data.get('employeesCanViewCoworkers') === 'on';
		const managersCanEditAllLocations = data.get('managersCanEditAllLocations') === 'on';

		try {
			await prisma.organization.update({
				where: { id: session.user.organizationId },
				data: {
					employeesCanSwapShifts,
					swapRequiresApproval,
					employeesCanRequestTimeOff,
					employeesCanViewCoworkers,
					managersCanEditAllLocations
				}
			});

			return { success: true, message: 'Permissions updated successfully' };
		} catch (error) {
			console.error('Update permissions error:', error);
			return fail(500, { error: 'Failed to update permissions' });
		}
	},

	updateNotifications: async (event) => {
		const session = await event.locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await event.request.formData();

		const emailNotifications = data.get('emailNotifications') === 'on';
		const smsNotifications = data.get('smsNotifications') === 'on';
		const shiftReminderHours = data.get('shiftReminderHours') as string;
		const swapRequestNotifications = data.get('swapRequestNotifications') === 'on';
		const schedulePublishedNotifications = data.get('schedulePublishedNotifications') === 'on';

		try {
			await prisma.user.update({
				where: { id: session.user.id },
				data: {
					emailNotifications,
					smsNotifications,
					shiftReminderHours: shiftReminderHours ? parseInt(shiftReminderHours) : 24,
					swapRequestNotifications,
					schedulePublishedNotifications
				}
			});

			return { success: true, message: 'Notification preferences updated successfully' };
		} catch (error) {
			console.error('Update notifications error:', error);
			return fail(500, { error: 'Failed to update notification preferences' });
		}
	}
} satisfies Actions;
