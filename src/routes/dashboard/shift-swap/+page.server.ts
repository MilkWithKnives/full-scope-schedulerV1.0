import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { requireAuth } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import { startOfDay, endOfDay } from 'date-fns';

export const load: PageServerLoad = async (event) => {
	const session = await requireAuth(event);
	const today = new Date();

	// Get user's upcoming shifts (next 30 days)
	const myUpcomingShifts = await prisma.shift.findMany({
		where: {
			userId: session.user.id,
			startTime: { gte: today },
			status: { in: ['PUBLISHED', 'CONFIRMED'] }
		},
		include: {
			Location: { select: { id: true, name: true } },
			swapRequestsFrom: {
				include: {
					toShift: {
						include: {
							User: { select: { id: true, name: true } },
							Location: { select: { name: true } }
						}
					},
					requestedBy: { select: { name: true } }
				}
			}
		},
		orderBy: { startTime: 'asc' },
		take: 20
	});

	// Get available shifts to swap into (shifts without swap requests from me)
	const availableShifts = await prisma.shift.findMany({
		where: {
			startTime: { gte: today },
			status: { in: ['PUBLISHED', 'CONFIRMED'] },
			userId: { not: session.user.id },
			Location: {
				organizationId: session.user.organizationId
			}
		},
		include: {
			User: { select: { id: true, name: true } },
			Location: { select: { id: true, name: true } }
		},
		orderBy: { startTime: 'asc' },
		take: 50
	});

	// Get my pending swap requests
	const mySwapRequests = await prisma.shiftSwapRequest.findMany({
		where: {
			requestedById: session.user.id,
			status: 'PENDING'
		},
		include: {
			fromShift: {
				include: {
					Location: { select: { name: true } }
				}
			},
			toShift: {
				include: {
					User: { select: { name: true } },
					Location: { select: { name: true } }
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});

	// Get swap requests for my shifts (others wanting to swap with me)
	const incomingSwapRequests = await prisma.shiftSwapRequest.findMany({
		where: {
			toShift: {
				userId: session.user.id
			},
			status: 'PENDING'
		},
		include: {
			requestedBy: { select: { id: true, name: true } },
			fromShift: {
				include: {
					Location: { select: { name: true } }
				}
			},
			toShift: {
				include: {
					Location: { select: { name: true } }
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});

	return {
		myUpcomingShifts,
		availableShifts,
		mySwapRequests,
		incomingSwapRequests
	};
};

export const actions = {
	requestSwap: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const fromShiftId = data.get('fromShiftId') as string;
		const toShiftId = data.get('toShiftId') as string;

		if (!fromShiftId || !toShiftId) {
			return fail(400, { error: 'Missing shift IDs' });
		}

		try {
			// Verify user owns the "from" shift
			const fromShift = await prisma.shift.findUnique({
				where: { id: fromShiftId },
				include: { User: true }
			});

			if (!fromShift || fromShift.userId !== session.user.id) {
				return fail(403, { error: 'You can only swap your own shifts' });
			}

			const toShift = await prisma.shift.findUnique({
				where: { id: toShiftId },
				include: { User: true }
			});

			if (!toShift || !toShift.userId) {
				return fail(400, { error: 'Target shift not assigned' });
			}

			// Check if user has any shifts that overlap with the target shift
			const hasConflict = await prisma.shift.findFirst({
				where: {
					userId: session.user.id,
					id: { not: fromShiftId },
					OR: [
						{
							// Starts during the target shift
							startTime: {
								gte: toShift.startTime,
								lt: toShift.endTime
							}
						},
						{
							// Ends during the target shift
							endTime: {
								gt: toShift.startTime,
								lte: toShift.endTime
							}
						},
						{
							// Completely overlaps the target shift
							AND: [
								{ startTime: { lte: toShift.startTime } },
								{ endTime: { gte: toShift.endTime } }
							]
						}
					]
				}
			});

			// AUTO-APPROVAL LOGIC: No conflicts = instant approval
			const shouldAutoApprove = !hasConflict;

			if (shouldAutoApprove) {
				// Swap the shifts immediately
				await prisma.$transaction(async (tx) => {
					// Swap user assignments
					await tx.shift.update({
						where: { id: fromShiftId },
						data: { userId: toShift.userId }
					});

					await tx.shift.update({
						where: { id: toShiftId },
						data: { userId: session.user.id }
					});

					// Create approved swap request for history
					await tx.shiftSwapRequest.create({
						data: {
							fromShiftId,
							toShiftId,
							requestedById: session.user.id,
							status: 'APPROVED',
							autoApproved: true
						}
					});
				});

				return { success: true, autoApproved: true };
			} else {
				// Create pending swap request (requires manager approval)
				const swapRequest = await prisma.shiftSwapRequest.create({
					data: {
						fromShiftId,
						toShiftId,
						requestedById: session.user.id,
						status: 'PENDING'
					}
				});

				return { success: true, autoApproved: false, swapRequest };
			}
		} catch (error) {
			console.error('Request swap error:', error);
			return fail(500, { error: 'Failed to request swap' });
		}
	},

	acceptSwap: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const swapRequestId = data.get('swapRequestId') as string;

		if (!swapRequestId) {
			return fail(400, { error: 'Missing swap request ID' });
		}

		try {
			const swapRequest = await prisma.shiftSwapRequest.findUnique({
				where: { id: swapRequestId },
				include: {
					fromShift: true,
					toShift: true
				}
			});

			if (!swapRequest) {
				return fail(404, { error: 'Swap request not found' });
			}

			// Verify the current user is the target
			if (swapRequest.toShift.userId !== session.user.id) {
				return fail(403, { error: 'Not authorized' });
			}

			// Perform the swap
			await prisma.$transaction(async (tx) => {
				const requesterId = swapRequest.requestedById;

				// Swap shift assignments
				await tx.shift.update({
					where: { id: swapRequest.fromShiftId },
					data: { userId: swapRequest.toShift.userId }
				});

				await tx.shift.update({
					where: { id: swapRequest.toShiftId },
					data: { userId: requesterId }
				});

				// Mark swap as approved
				await tx.shiftSwapRequest.update({
					where: { id: swapRequestId },
					data: { status: 'APPROVED' }
				});
			});

			return { success: true };
		} catch (error) {
			console.error('Accept swap error:', error);
			return fail(500, { error: 'Failed to accept swap' });
		}
	},

	cancelSwap: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const swapRequestId = data.get('swapRequestId') as string;

		if (!swapRequestId) {
			return fail(400, { error: 'Missing swap request ID' });
		}

		try {
			const swapRequest = await prisma.shiftSwapRequest.findUnique({
				where: { id: swapRequestId }
			});

			if (!swapRequest || swapRequest.requestedById !== session.user.id) {
				return fail(403, { error: 'Not authorized to cancel this request' });
			}

			await prisma.shiftSwapRequest.update({
				where: { id: swapRequestId },
				data: { status: 'CANCELLED' }
			});

			return { success: true };
		} catch (error) {
			console.error('Cancel swap error:', error);
			return fail(500, { error: 'Failed to cancel swap' });
		}
	}
} satisfies Actions;
