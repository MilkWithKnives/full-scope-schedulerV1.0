import type { PageServerLoad, Actions } from './$types';
import { requireRole } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await requireRole(event, ['OWNER', 'MANAGER']);

	const locations = await prisma.location.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		include: {
			_count: {
				select: {
					Shift: true
				}
			}
		},
		orderBy: {
			name: 'asc'
		}
	});

	return {
		locations,
		session
	};
};

export const actions = {
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

			return { success: true };
		} catch (error) {
			console.error('Add location error:', error);
			return fail(500, { error: 'Failed to add location' });
		}
	},

	updateLocation: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);
		const data = await event.request.formData();

		const id = data.get('id') as string;
		const name = data.get('name') as string;
		const address = data.get('address') as string;
		const latitude = data.get('latitude') as string;
		const longitude = data.get('longitude') as string;
		const geofenceRadius = data.get('geofenceRadius') as string;

		if (!id || !name || !address) {
			return fail(400, { error: 'ID, name and address are required' });
		}

		try {
			await prisma.location.update({
				where: { id },
				data: {
					name,
					address,
					latitude: latitude ? parseFloat(latitude) : null,
					longitude: longitude ? parseFloat(longitude) : null,
					geofenceRadius: geofenceRadius ? parseInt(geofenceRadius) : 250
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Update location error:', error);
			return fail(500, { error: 'Failed to update location' });
		}
	},

	deleteLocation: async (event) => {
		const session = await requireRole(event, ['OWNER', 'MANAGER']);
		const data = await event.request.formData();

		const id = data.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Location ID is required' });
		}

		try {
			await prisma.location.delete({
				where: { id }
			});

			return { success: true };
		} catch (error) {
			console.error('Delete location error:', error);
			return fail(500, { error: 'Failed to delete location' });
		}
	}
} satisfies Actions;
