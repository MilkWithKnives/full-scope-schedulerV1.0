import { prisma } from '$lib/server/prisma';
import { differenceInMinutes, subMonths, subYears, startOfWeek, endOfWeek } from 'date-fns';

interface OrganizationMetrics {
	monthlyGrowthRate: number;
	yearOverYearGrowth: number;
	laborCostPercentage: number;
	efficiency: number; // revenue per labor hour
	averageTurnoverCost: number;
	seasonalTrends: {
		month: number;
		averageLaborCost: number;
		averageHours: number;
	}[];
}

interface FinancialContext {
	currentWeekLaborCost: number;
	averageHourlyRate: number;
	totalScheduledHours: number;
	overtimeHours: number;
	overtimeCost: number;
	lastYearSameWeek?: {
		laborCost: number;
		totalHours: number;
		averageHourlyRate: number;
		revenue?: number;
		profitMargin?: number;
	};
	organizationMetrics: OrganizationMetrics;
}

/**
 * Calculate comprehensive financial analytics for an organization
 */
export async function calculateFinancialAnalytics(
	organizationId: string,
	weekStart: Date,
	weekEnd: Date,
	currentWeekLaborCost: number,
	totalScheduledHours: number
): Promise<Partial<FinancialContext>> {
	try {
		// Get last year same week data
		const lastYearStart = new Date(weekStart);
		lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
		const lastYearEnd = new Date(weekEnd);
		lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

		const lastYearShifts = await prisma.shift.findMany({
			where: {
				Location: { organizationId },
				startTime: { gte: lastYearStart, lte: lastYearEnd },
				userId: { not: null }
			},
			include: {
				User: { select: { defaultHourlyRate: true } }
			}
		});

		// Calculate last year metrics
		const lastYearMetrics = lastYearShifts.length > 0 ? {
			laborCost: lastYearShifts.reduce((total, shift) => {
				const hours = differenceInMinutes(shift.endTime, shift.startTime) / 60;
				const rate = shift.hourlyRate || shift.User?.defaultHourlyRate || 15;
				return total + (hours * rate);
			}, 0),
			totalHours: lastYearShifts.reduce((total, shift) => {
				return total + differenceInMinutes(shift.endTime, shift.startTime) / 60;
			}, 0),
			averageHourlyRate: 0
		} : null;

		if (lastYearMetrics && lastYearMetrics.totalHours > 0) {
			lastYearMetrics.averageHourlyRate = lastYearMetrics.laborCost / lastYearMetrics.totalHours;
		}

		// Calculate monthly growth rate (last 3 months)
		const threeMonthsAgo = subMonths(weekStart, 3);
		const monthlyShifts = await prisma.shift.findMany({
			where: {
				Location: { organizationId },
				startTime: { gte: threeMonthsAgo, lte: weekEnd },
				userId: { not: null }
			},
			include: {
				User: { select: { defaultHourlyRate: true } }
			}
		});

		// Group by month and calculate growth
		const monthlyData = new Map<string, { cost: number; hours: number }>();
		monthlyShifts.forEach(shift => {
			const monthKey = shift.startTime.toISOString().substring(0, 7); // YYYY-MM
			const hours = differenceInMinutes(shift.endTime, shift.startTime) / 60;
			const rate = shift.hourlyRate || shift.User?.defaultHourlyRate || 15;
			const cost = hours * rate;

			if (!monthlyData.has(monthKey)) {
				monthlyData.set(monthKey, { cost: 0, hours: 0 });
			}
			const data = monthlyData.get(monthKey)!;
			data.cost += cost;
			data.hours += hours;
		});

		const monthlyValues = Array.from(monthlyData.values());
		const monthlyGrowthRate = monthlyValues.length >= 2 ? 
			((monthlyValues[monthlyValues.length - 1].cost - monthlyValues[0].cost) / monthlyValues[0].cost * 100) / monthlyValues.length : 0;

		// Calculate year-over-year growth
		const yearOverYearGrowth = lastYearMetrics ? 
			((currentWeekLaborCost - lastYearMetrics.laborCost) / lastYearMetrics.laborCost * 100) : 0;

		// Calculate organization metrics
		const organizationMetrics: OrganizationMetrics = {
			monthlyGrowthRate,
			yearOverYearGrowth,
			laborCostPercentage: 25, // TODO: Calculate from revenue data when available
			efficiency: 45, // TODO: Calculate revenue per labor hour when revenue data available
			averageTurnoverCost: 3200, // Industry average - could be customized per organization
			seasonalTrends: [] // TODO: Calculate seasonal patterns
		};

		return {
			lastYearSameWeek: lastYearMetrics,
			organizationMetrics
		};

	} catch (error) {
		console.error('Financial analytics calculation failed:', error);
		return {
			organizationMetrics: {
				monthlyGrowthRate: 0,
				yearOverYearGrowth: 0,
				laborCostPercentage: 25,
				efficiency: 45,
				averageTurnoverCost: 3200,
				seasonalTrends: []
			}
		};
	}
}

/**
 * Calculate employee performance metrics for P&L analysis
 */
export async function calculateEmployeePerformanceMetrics(
	organizationId: string,
	employeeId: string,
	weekStart: Date,
	weekEnd: Date
): Promise<{
	currentWeekHours: number;
	currentWeekCost: number;
	lastYearSameWeekHours: number;
	lastYearSameWeekCost: number;
	productivityTrend: number; // % change in efficiency
	costEfficiency: number; // cost per productive hour
}> {
	// Implementation for individual employee analytics
	// This would track individual performance, productivity trends, etc.
	return {
		currentWeekHours: 0,
		currentWeekCost: 0,
		lastYearSameWeekHours: 0,
		lastYearSameWeekCost: 0,
		productivityTrend: 0,
		costEfficiency: 0
	};
}
