import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, differenceInMinutes, addWeeks } from 'date-fns';

export const load: PageServerLoad = async (event) => {
	// Only managers and owners can access reports
	const session = await requireRole(event, ['OWNER', 'MANAGER']);

	// Get date range from query params or default to current week
	const url = new URL(event.request.url);
	const rangeType = url.searchParams.get('range') || 'week';

	let startDate: Date;
	let endDate: Date;
	let comparisonStartDate: Date;
	let comparisonEndDate: Date;

	const now = new Date();

	// Calculate date ranges based on selection
	switch (rangeType) {
		case 'last-week':
			startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
			endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
			comparisonStartDate = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
			comparisonEndDate = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
			break;
		case 'month':
			startDate = startOfMonth(now);
			endDate = endOfMonth(now);
			comparisonStartDate = startOfMonth(subWeeks(now, 4));
			comparisonEndDate = endOfMonth(subWeeks(now, 4));
			break;
		case 'week':
		default:
			startDate = startOfWeek(now, { weekStartsOn: 1 });
			endDate = endOfWeek(now, { weekStartsOn: 1 });
			comparisonStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
			comparisonEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
	}

	// Fetch all locations for filtering
	const locations = await prisma.location.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		orderBy: {
			name: 'asc'
		}
	});

	// Fetch shifts for the selected period
	const shifts = await prisma.shift.findMany({
		where: {
			Location: {
				organizationId: session.user.organizationId
			},
			startTime: {
				gte: startDate,
				lte: endDate
			}
		},
		include: {
			User: {
				select: {
					id: true,
					name: true,
					role: true,
					defaultHourlyRate: true
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

	// Fetch comparison period shifts
	const comparisonShifts = await prisma.shift.findMany({
		where: {
			Location: {
				organizationId: session.user.organizationId
			},
			startTime: {
				gte: comparisonStartDate,
				lte: comparisonEndDate
			}
		},
		include: {
			User: {
				select: {
					id: true,
					name: true,
					defaultHourlyRate: true
				}
			}
		}
	});

	// Fetch time entries for actual hours worked
	const timeEntries = await prisma.timeEntry.findMany({
		where: {
			User: {
				organizationId: session.user.organizationId
			},
			clockIn: {
				gte: startDate,
				lte: endDate
			}
		},
		include: {
			User: {
				select: {
					id: true,
					name: true,
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

	// Get all active employees
	const employees = await prisma.user.findMany({
		where: {
			organizationId: session.user.organizationId
		},
		select: {
			id: true,
			name: true,
			role: true,
			defaultHourlyRate: true
		}
	});

	// Calculate metrics
	const metrics = calculateMetrics(shifts, comparisonShifts, timeEntries, employees);

	// Fetch future shifts for projections (next 4 weeks)
	const futureStartDate = addWeeks(now, 1);
	const futureEndDate = addWeeks(now, 4);

	const futureShifts = await prisma.shift.findMany({
		where: {
			Location: {
				organizationId: session.user.organizationId
			},
			startTime: {
				gte: futureStartDate,
				lte: futureEndDate
			}
		},
		include: {
			User: {
				select: {
					id: true,
					name: true,
					defaultHourlyRate: true
				}
			}
		}
	});

	// Calculate projections
	const projections = calculateProjections(futureShifts);

	return {
		session,
		locations,
		shifts,
		timeEntries,
		employees,
		metrics,
		projections,
		dateRange: {
			start: startDate.toISOString(),
			end: endDate.toISOString(),
			type: rangeType
		}
	};
};

// Helper function to calculate all metrics
function calculateMetrics(
	shifts: any[],
	comparisonShifts: any[],
	timeEntries: any[],
	employees: any[]
) {
	// Calculate scheduled hours and labor cost
	let totalScheduledHours = 0;
	let totalScheduledCost = 0;
	let unassignedShifts = 0;

	shifts.forEach((shift) => {
		const hours = calculateHours(shift.startTime, shift.endTime, shift.breakMinutes);
		totalScheduledHours += hours;

		if (shift.User) {
			const rate = shift.hourlyRate || shift.User.defaultHourlyRate || 15;
			totalScheduledCost += hours * rate;
		} else {
			unassignedShifts++;
		}
	});

	// Calculate actual hours and labor cost from time entries
	let totalActualHours = 0;
	let totalActualCost = 0;
	let completedEntries = 0;

	timeEntries.forEach((entry) => {
		if (entry.clockOut) {
			completedEntries++;
			const hours = differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn)) / 60;
			totalActualHours += hours;

			const rate = entry.User.defaultHourlyRate || 15;
			totalActualCost += hours * rate;
		}
	});

	// Calculate comparison period metrics
	let comparisonScheduledHours = 0;
	let comparisonScheduledCost = 0;

	comparisonShifts.forEach((shift) => {
		const hours = calculateHours(shift.startTime, shift.endTime, shift.breakMinutes);
		comparisonScheduledHours += hours;

		if (shift.User) {
			const rate = shift.hourlyRate || shift.User.defaultHourlyRate || 15;
			comparisonScheduledCost += hours * rate;
		}
	});

	// Calculate percentage changes
	const hoursChange = comparisonScheduledHours > 0
		? ((totalScheduledHours - comparisonScheduledHours) / comparisonScheduledHours) * 100
		: 0;

	const costChange = comparisonScheduledCost > 0
		? ((totalScheduledCost - comparisonScheduledCost) / comparisonScheduledCost) * 100
		: 0;

	// Group by location
	const locationMetrics = new Map();
	shifts.forEach((shift) => {
		const locationId = shift.Location.id;
		const hours = calculateHours(shift.startTime, shift.endTime, shift.breakMinutes);
		const rate = shift.User ? (shift.hourlyRate || shift.User.defaultHourlyRate || 15) : 15;
		const cost = shift.User ? hours * rate : 0;

		if (!locationMetrics.has(locationId)) {
			locationMetrics.set(locationId, {
				name: shift.Location.name,
				hours: 0,
				cost: 0,
				shifts: 0
			});
		}

		const loc = locationMetrics.get(locationId);
		loc.hours += hours;
		loc.cost += cost;
		loc.shifts += 1;
	});

	// Group by employee
	const employeeMetrics = new Map();
	shifts.forEach((shift) => {
		if (shift.User) {
			const userId = shift.User.id;
			const hours = calculateHours(shift.startTime, shift.endTime, shift.breakMinutes);
			const rate = shift.hourlyRate || shift.User.defaultHourlyRate || 15;
			const cost = hours * rate;

			if (!employeeMetrics.has(userId)) {
				employeeMetrics.set(userId, {
					name: shift.User.name,
					hours: 0,
					cost: 0,
					shifts: 0
				});
			}

			const emp = employeeMetrics.get(userId);
			emp.hours += hours;
			emp.cost += cost;
			emp.shifts += 1;
		}
	});

	// Calculate averages
	const avgHoursPerEmployee = employees.length > 0
		? totalScheduledHours / employees.length
		: 0;

	const avgCostPerShift = shifts.length > 0
		? totalScheduledCost / shifts.length
		: 0;

	const coverageRate = shifts.length > 0
		? ((shifts.length - unassignedShifts) / shifts.length) * 100
		: 100;

	return {
		// Current period totals
		totalScheduledHours: Math.round(totalScheduledHours * 10) / 10,
		totalScheduledCost: Math.round(totalScheduledCost * 100) / 100,
		totalActualHours: Math.round(totalActualHours * 10) / 10,
		totalActualCost: Math.round(totalActualCost * 100) / 100,
		totalShifts: shifts.length,
		unassignedShifts,
		completedTimeEntries: completedEntries,

		// Averages
		avgHoursPerEmployee: Math.round(avgHoursPerEmployee * 10) / 10,
		avgCostPerShift: Math.round(avgCostPerShift * 100) / 100,
		coverageRate: Math.round(coverageRate * 10) / 10,

		// Comparisons
		hoursChange: Math.round(hoursChange * 10) / 10,
		costChange: Math.round(costChange * 10) / 10,

		// Breakdowns
		byLocation: Array.from(locationMetrics.values()).sort((a, b) => b.hours - a.hours),
		byEmployee: Array.from(employeeMetrics.values()).sort((a, b) => b.hours - a.hours),

		// Active employees
		activeEmployees: employees.length
	};
}

function calculateHours(startTime: Date | string, endTime: Date | string, breakMinutes: number = 30): number {
	const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
	const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

	const totalMinutes = differenceInMinutes(end, start);
	const workedMinutes = totalMinutes - breakMinutes;

	return workedMinutes / 60;
}

// Helper function to calculate future projections
function calculateProjections(futureShifts: any[]) {
	// Group by week
	const weeklyProjections = [];
	const shiftsByWeek = new Map<number, any[]>();

	futureShifts.forEach((shift) => {
		const shiftDate = new Date(shift.startTime);
		const weekNumber = Math.floor((shiftDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)) + 1;

		if (!shiftsByWeek.has(weekNumber)) {
			shiftsByWeek.set(weekNumber, []);
		}
		shiftsByWeek.get(weekNumber)!.push(shift);
	});

	// Calculate projections for each week
	for (const [weekNumber, shifts] of shiftsByWeek.entries()) {
		let totalHours = 0;
		let totalCost = 0;
		let assignedCount = 0;

		shifts.forEach((shift) => {
			const hours = calculateHours(shift.startTime, shift.endTime, shift.breakMinutes);
			totalHours += hours;

			if (shift.User) {
				assignedCount++;
				const rate = shift.User.defaultHourlyRate || 15;
				totalCost += hours * rate;
			}
		});

		weeklyProjections.push({
			week: weekNumber,
			totalShifts: shifts.length,
			assignedShifts: assignedCount,
			totalHours: Math.round(totalHours * 10) / 10,
			projectedCost: Math.round(totalCost * 100) / 100,
			coverageRate: shifts.length > 0 ? Math.round((assignedCount / shifts.length) * 100) : 0
		});
	}

	// Calculate 4-week total
	const totalProjectedCost = weeklyProjections.reduce((sum, week) => sum + week.projectedCost, 0);
	const totalProjectedHours = weeklyProjections.reduce((sum, week) => sum + week.totalHours, 0);
	const totalShifts = weeklyProjections.reduce((sum, week) => sum + week.totalShifts, 0);
	const totalAssigned = weeklyProjections.reduce((sum, week) => sum + week.assignedShifts, 0);

	return {
		weekly: weeklyProjections.sort((a, b) => a.week - b.week),
		fourWeekTotal: {
			totalCost: Math.round(totalProjectedCost * 100) / 100,
			totalHours: Math.round(totalProjectedHours * 10) / 10,
			totalShifts,
			assignedShifts: totalAssigned,
			coverageRate: totalShifts > 0 ? Math.round((totalAssigned / totalShifts) * 100) : 0
		}
	};
}
