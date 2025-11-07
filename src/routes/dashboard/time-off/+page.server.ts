import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { requireAuth } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await requireAuth(event);

	// Get user's time-off requests
	const myRequests = await prisma.timeOffRequest.findMany({
		where: {
			userId: session.user.id
		},
		include: {
			User_TimeOffRequest_reviewedByToUser: {
				select: { name: true }
			}
		},
		orderBy: { createdAt: 'desc' }
	});

	// If admin, get pending requests to review
	const isAdmin = session.user.role === 'OWNER' || session.user.role === 'MANAGER';
	const pendingRequests = isAdmin
		? await prisma.timeOffRequest.findMany({
				where: {
					status: 'PENDING',
					User_TimeOffRequest_userIdToUser: {
						organizationId: session.user.organizationId
					}
				},
				include: {
					User_TimeOffRequest_userIdToUser: {
						select: { id: true, name: true, role: true }
					}
				},
				orderBy: { createdAt: 'asc' }
		  })
		: [];

	return {
		myRequests,
		pendingRequests,
		isAdmin
	};
};

export const actions = {
	requestTimeOff: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const startDate = data.get('startDate') as string;
		const endDate = data.get('endDate') as string;
		const reason = data.get('reason') as string;

		if (!startDate || !endDate) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const timeOffRequest = await prisma.timeOffRequest.create({
				data: {
					userId: session.user.id,
					startDate: new Date(startDate),
					endDate: new Date(endDate),
					reason: reason || null,
					status: 'PENDING'
				}
			});

			return { success: true, timeOffRequest };
		} catch (error) {
			console.error('Request time off error:', error);
			return fail(500, { error: 'Failed to request time off' });
		}
	},

	cancelRequest: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const requestId = data.get('requestId') as string;

		if (!requestId) {
			return fail(400, { error: 'Missing request ID' });
		}

		try {
			const timeOffRequest = await prisma.timeOffRequest.findUnique({
				where: { id: requestId }
			});

			if (!timeOffRequest || timeOffRequest.userId !== session.user.id) {
				return fail(403, { error: 'Not authorized' });
			}

			if (timeOffRequest.status !== 'PENDING') {
				return fail(400, { error: 'Can only cancel pending requests' });
			}

			await prisma.timeOffRequest.update({
				where: { id: requestId },
				data: { status: 'DENIED' }
			});

			return { success: true };
		} catch (error) {
			console.error('Cancel request error:', error);
			return fail(500, { error: 'Failed to cancel request' });
		}
	},

	approveRequest: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
			return fail(403, { error: 'Only managers can approve requests' });
		}

		const data = await request.formData();
		const requestId = data.get('requestId') as string;

		if (!requestId) {
			return fail(400, { error: 'Missing request ID' });
		}

		try {
			await prisma.timeOffRequest.update({
				where: { id: requestId },
				data: {
					status: 'APPROVED',
					reviewedBy: session.user.id
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Approve request error:', error);
			return fail(500, { error: 'Failed to approve request' });
		}
	},

	rejectRequest: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
			return fail(403, { error: 'Only managers can reject requests' });
		}

		const data = await request.formData();
		const requestId = data.get('requestId') as string;

		if (!requestId) {
			return fail(400, { error: 'Missing request ID' });
		}

		try {
			await prisma.timeOffRequest.update({
				where: { id: requestId },
				data: {
					status: 'DENIED',
					reviewedBy: session.user.id
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Reject request error:', error);
			return fail(500, { error: 'Failed to reject request' });
		}
	}
} satisfies Actions;
