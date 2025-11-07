import { prisma } from '$lib/server/prisma';
import { differenceInMinutes, parseISO, isSameDay } from 'date-fns';
import { getScheduleAnalysisAndTips } from './ai-scheduler.js';
import { calculateFinancialAnalytics } from './financial-analytics.js';

interface SchedulingConstraints {
	maxHoursPerWeek?: number;
	maxConsecutiveDays?: number;
	minRestHoursBetweenShifts?: number;
	preferredLocationWeight?: number;
	costOptimization?: boolean;
}

interface ShiftRequirement {
	id: string;
	startTime: Date;
	endTime: Date;
	locationId: string;
	role: string;
	breakMinutes: number;
	requiredSkills: string[];
	shiftType: string | null;
	priority: number;
	minSeniority: number | null;
}

interface Employee {
	id: string;
	name: string;
	role: string;
	defaultHourlyRate: number | null;
	preferredLocationId: string | null;
	maxHoursPerWeek: number | null;
	minHoursPerWeek: number | null;
	maxConsecutiveDays: number | null;
	minRestHours: number | null;
	skills: string[];
	shiftTypePreferences: string[];
	seniority: number | null;
	availability: Array<{
		dayOfWeek: number;
		startTime: string;
		endTime: string;
		isPreferred: boolean;
	}>;
	existingShifts: Array<{
		startTime: Date;
		endTime: Date;
	}>;
}

interface ScheduleSuggestion {
	shiftId: string;
	employeeId: string;
	employeeName: string;
	score: number;
	reasons: string[];
	warnings: string[];
}

interface CoverageGap {
	day: string;
	timeRange: string;
	location: string;
	role: string;
	suggestions: string[];
}

interface ScheduleResult {
	suggestions: ScheduleSuggestion[];
	unassignableShifts: Array<{
		shiftId: string;
		reasons: string[];
	}>;
	coverageGaps: CoverageGap[];
	employeeInsights: Array<{
		employeeId: string;
		employeeName: string;
		weeklyHours: number;
		shiftCount: number;
		insights: string[];
	}>;
	stats: {
		totalShifts: number;
		assignableShifts: number;
		averageScore: number;
		coverageRate: number;
	};
	aiAnalysis?: string;
}

/**
 * Main auto-scheduling function
 * Analyzes unassigned shifts and suggests the best employee assignments
 */
export async function generateScheduleSuggestions(
	organizationId: string,
	weekStart: Date,
	weekEnd: Date,
	constraints: SchedulingConstraints = {}
): Promise<ScheduleResult> {
	// Fetch scheduling preferences from database
	const schedulingPrefs = await prisma.schedulingPreferences.findUnique({
		where: { organizationId }
	});

	// Set default constraints (use DB preferences if available, then passed constraints, then hardcoded defaults)
	const config = {
		maxHoursPerWeek: constraints.maxHoursPerWeek || schedulingPrefs?.defaultMaxHoursPerWeek || 40,
		maxConsecutiveDays: constraints.maxConsecutiveDays || schedulingPrefs?.defaultMaxConsecutiveDays || 6,
		minRestHoursBetweenShifts: constraints.minRestHoursBetweenShifts || schedulingPrefs?.defaultMinRestHours || 8,
		preferredLocationWeight: constraints.preferredLocationWeight || schedulingPrefs?.preferredLocationWeight || 1.2,
		costOptimization: constraints.costOptimization ?? schedulingPrefs?.costOptimizationEnabled ?? true
	};

	// Fetch unassigned shifts in the date range
	const unassignedShifts = await prisma.shift.findMany({
		where: {
			Location: {
				organizationId
			},
			userId: null,
			startTime: {
				gte: weekStart,
				lte: weekEnd
			},
			status: { in: ['DRAFT', 'PUBLISHED'] }
		},
		include: {
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

	// Fetch all employees with their availability and existing shifts
	const employees = await prisma.user.findMany({
		where: {
			organizationId
		},
		include: {
			Availability: true,
			Shift: {
				where: {
					startTime: {
						gte: weekStart,
						lte: weekEnd
					}
				},
				orderBy: {
					startTime: 'asc'
				}
			}
		}
	});

	// Transform data for algorithm
	const employeeData: Employee[] = employees.map((emp) => ({
		id: emp.id,
		name: emp.name,
		role: emp.role,
		defaultHourlyRate: emp.defaultHourlyRate,
		preferredLocationId: emp.preferredLocationId,
		maxHoursPerWeek: emp.maxHoursPerWeek,
		minHoursPerWeek: emp.minHoursPerWeek,
		maxConsecutiveDays: emp.maxConsecutiveDays,
		minRestHours: emp.minRestHours,
		skills: emp.skills,
		shiftTypePreferences: emp.shiftTypePreferences,
		seniority: emp.seniority,
		availability: emp.Availability.map((a) => ({
			dayOfWeek: a.dayOfWeek,
			startTime: a.startTime,
			endTime: a.endTime,
			isPreferred: a.isPreferred
		})),
		existingShifts: emp.Shift.map((s) => ({
			startTime: s.startTime,
			endTime: s.endTime
		}))
	}));

	const shiftRequirements: ShiftRequirement[] = unassignedShifts.map((shift) => ({
		id: shift.id,
		startTime: shift.startTime,
		endTime: shift.endTime,
		locationId: shift.locationId,
		role: shift.role,
		breakMinutes: shift.breakMinutes,
		requiredSkills: shift.requiredSkills,
		shiftType: shift.shiftType,
		priority: shift.priority,
		minSeniority: shift.minSeniority
	}));

	// Run the scheduling algorithm
	const suggestions: ScheduleSuggestion[] = [];
	const unassignable: Array<{ shiftId: string; reasons: string[] }> = [];

	for (const shift of shiftRequirements) {
		const candidates = evaluateCandidates(shift, employeeData, config);

		if (candidates.length === 0) {
			unassignable.push({
				shiftId: shift.id,
				reasons: ['No available employees match this shift\'s requirements']
			});
		} else {
			// Get the best candidate
			const best = candidates[0];
			suggestions.push({
				shiftId: shift.id,
				employeeId: best.employeeId,
				employeeName: best.employeeName,
				score: best.score,
				reasons: best.reasons,
				warnings: best.warnings
			});

			// Update employee data to reflect this assignment (for subsequent shifts)
			const employee = employeeData.find((e) => e.id === best.employeeId);
			if (employee) {
				employee.existingShifts.push({
					startTime: shift.startTime,
					endTime: shift.endTime
				});
			}
		}
	}

	// Analyze coverage gaps and generate AI-style suggestions
	const coverageGaps = analyzeCoverageGaps(unassignable, unassignedShifts, employeeData);

	// Generate employee insights
	const employeeInsights = generateEmployeeInsights(employeeData);

	// Calculate stats
	const totalScore = suggestions.reduce((sum, s) => sum + s.score, 0);
	const averageScore = suggestions.length > 0 ? totalScore / suggestions.length : 0;
	const coverageRate = unassignedShifts.length > 0
		? (suggestions.length / unassignedShifts.length) * 100
		: 100;

	// Prepare result object
	const result = {
		suggestions,
		unassignableShifts: unassignable,
		coverageGaps,
		employeeInsights,
		stats: {
			totalShifts: unassignedShifts.length,
			assignableShifts: suggestions.length,
			averageScore: Math.round(averageScore * 10) / 10,
			coverageRate: Math.round(coverageRate * 10) / 10
		}
	};

	// Generate AI analysis and tips with financial context
	try {
		// Calculate financial metrics
		const currentWeekLaborCost = suggestions.reduce((total, s) => {
			const shift = unassignedShifts.find(shift => shift.id === s.shiftId);
			if (shift) {
				const hours = differenceInMinutes(shift.endTime, shift.startTime) / 60;
				const rate = shift.hourlyRate || employeeData.find(emp => emp.id === s.employeeId)?.defaultHourlyRate || 15;
				return total + (hours * rate);
			}
			return total;
		}, 0);

		const totalScheduledHours = suggestions.reduce((total, s) => {
			const shift = unassignedShifts.find(shift => shift.id === s.shiftId);
			if (shift) {
				return total + differenceInMinutes(shift.endTime, shift.startTime) / 60;
			}
			return total;
		}, 0);

		const averageHourlyRate = totalScheduledHours > 0 ? currentWeekLaborCost / totalScheduledHours : 0;

		// Calculate overtime
		const overtimeHours = employeeData.reduce((total, emp) => {
			const empSuggestions = suggestions.filter(s => s.employeeId === emp.id);
			const empHours = empSuggestions.reduce((hours, s) => {
				const shift = unassignedShifts.find(shift => shift.id === s.shiftId);
				return shift ? hours + differenceInMinutes(shift.endTime, shift.startTime) / 60 : hours;
			}, 0);
			return empHours > 40 ? total + (empHours - 40) : total;
		}, 0);

		const overtimeCost = overtimeHours * averageHourlyRate * 1.5; // 1.5x overtime rate

		// Get comprehensive financial analytics
		const financialAnalytics = await calculateFinancialAnalytics(
			organizationId,
			weekStart,
			weekEnd,
			currentWeekLaborCost,
			totalScheduledHours
		);

		const schedulingContext = {
			employees: employeeData.map(emp => ({
				id: emp.id,
				name: emp.name,
				role: emp.role,
				hourlyRate: emp.defaultHourlyRate,
				weeklyHours: emp.existingShifts.reduce((total, s) => {
					return total + differenceInMinutes(s.endTime, s.startTime) / 60;
				}, 0),
				availability: emp.availability
			})),
			shifts: unassignedShifts.map(shift => ({
				id: shift.id,
				day: shift.startTime.toLocaleDateString('en-US', { weekday: 'long' }),
				startTime: shift.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
				endTime: shift.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
				role: shift.role,
				location: shift.Location?.name || 'Unknown',
				assigned: suggestions.some(s => s.shiftId === shift.id),
				hourlyRate: shift.hourlyRate,
				laborCost: suggestions.find(s => s.shiftId === shift.id) ?
					(differenceInMinutes(shift.endTime, shift.startTime) / 60) *
					(shift.hourlyRate || employeeData.find(emp => emp.id === suggestions.find(s => s.shiftId === shift.id)?.employeeId)?.defaultHourlyRate || 15) : 0
			})),
			coverageGaps: coverageGaps,
			constraints: {
				maxHoursPerWeek: constraints.maxHoursPerWeek || 40,
				minRestHours: constraints.minRestHoursBetweenShifts || 8
			},
			financialContext: {
				currentWeekLaborCost,
				averageHourlyRate,
				totalScheduledHours,
				overtimeHours,
				overtimeCost,
				lastYearSameWeek: financialAnalytics.lastYearSameWeek,
				organizationMetrics: financialAnalytics.organizationMetrics
			}
		};

		const aiAnalysis = await getScheduleAnalysisAndTips(schedulingContext, result);
		result.aiAnalysis = aiAnalysis;
	} catch (error) {
		console.error('AI analysis failed:', error);
		result.aiAnalysis = 'AI analysis is temporarily unavailable, but your schedule has been generated successfully.';
	}

	return result;
}

/**
 * Evaluate all employees for a specific shift and return ranked candidates
 */
function evaluateCandidates(
	shift: ShiftRequirement,
	employees: Employee[],
	config: SchedulingConstraints
): Array<ScheduleSuggestion & { employeeId: string; employeeName: string }> {
	const candidates: Array<ScheduleSuggestion & { employeeId: string; employeeName: string }> = [];

	for (const employee of employees) {
		const evaluation = evaluateEmployeeForShift(shift, employee, config);

		if (evaluation.score > 0) {
			candidates.push({
				shiftId: shift.id,
				employeeId: employee.id,
				employeeName: employee.name,
				score: evaluation.score,
				reasons: evaluation.reasons,
				warnings: evaluation.warnings
			});
		}
	}

	// Sort by score (highest first)
	return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Evaluate a single employee for a shift assignment
 * Returns a score from 0-100 (0 = cannot assign, 100 = perfect match)
 */
function evaluateEmployeeForShift(
	shift: ShiftRequirement,
	employee: Employee,
	config: SchedulingConstraints
): { score: number; reasons: string[]; warnings: string[] } {
	let score = 50; // Base score
	const reasons: string[] = [];
	const warnings: string[] = [];

	// Check required skills
	if (shift.requiredSkills.length > 0) {
		const hasAllSkills = shift.requiredSkills.every((skill) => employee.skills.includes(skill));
		if (!hasAllSkills) {
			const missingSkills = shift.requiredSkills.filter((skill) => !employee.skills.includes(skill));
			return { score: 0, reasons: [`Missing required skills: ${missingSkills.join(', ')}`], warnings: [] };
		}
		score += 10;
		reasons.push('Has all required skills');
	}

	// Check minimum seniority requirement
	if (shift.minSeniority !== null && shift.minSeniority > 0) {
		const employeeSeniority = employee.seniority || 0;
		if (employeeSeniority < shift.minSeniority) {
			return { score: 0, reasons: [`Requires ${shift.minSeniority} years experience, has ${employeeSeniority}`], warnings: [] };
		}
		if (employeeSeniority >= shift.minSeniority) {
			score += 5;
			reasons.push('Meets seniority requirement');
		}
	}

	// Check availability
	const shiftDay = shift.startTime.getDay();
	const availabilities = employee.Availability.filter((a) => a.dayOfWeek === shiftDay);

	if (availabilities.length === 0) {
		return { score: 0, reasons: ['Employee not available on this day'], warnings: [] };
	}

	// Find matching availability block
	const shiftStartMinutes = shift.startTime.getHours() * 60 + shift.startTime.getMinutes();
	const shiftEndMinutes = shift.endTime.getHours() * 60 + shift.endTime.getMinutes();

	let matchingAvailability = null;
	for (const avail of availabilities) {
		const availStartMinutes = timeToMinutes(avail.startTime);
		const availEndMinutes = timeToMinutes(avail.endTime);

		if (shiftStartMinutes >= availStartMinutes && shiftEndMinutes <= availEndMinutes) {
			matchingAvailability = avail;
			break;
		}
	}

	if (!matchingAvailability) {
		return {
			score: 0,
			reasons: ['Shift time is outside employee availability window'],
			warnings: []
		};
	}

	// Bonus for preferred availability
	if (matchingAvailability.isPreferred) {
		score += 20;
		reasons.push('Preferred availability time');
	} else {
		score += 15;
		reasons.push('Available during shift time');
	}

	// Check for conflicts with existing shifts
	for (const existingShift of employee.existingShifts) {
		if (shiftsOverlap(shift.startTime, shift.endTime, existingShift.startTime, existingShift.endTime)) {
			return { score: 0, reasons: ['Conflicts with existing shift'], warnings: [] };
		}

		// Check minimum rest time between shifts (use employee preference if set, otherwise use config)
		const requiredRestHours = employee.minRestHours || config.minRestHoursBetweenShifts || 8;
		const hoursBetween = Math.abs(
			differenceInMinutes(shift.startTime, existingShift.endTime)
		) / 60;

		if (hoursBetween < requiredRestHours) {
			warnings.push(`Only ${hoursBetween.toFixed(1)} hours rest (needs ${requiredRestHours}h)`);
			score -= 10;
		}
	}

	// Calculate total hours for the week
	const shiftHours = differenceInMinutes(shift.endTime, shift.startTime) / 60;
	const existingHours = employee.existingShifts.reduce((total, s) => {
		return total + differenceInMinutes(s.endTime, s.startTime) / 60;
	}, 0);
	const totalHours = existingHours + shiftHours;

	// Use employee's max hours if set, otherwise use config default
	const maxHours = employee.maxHoursPerWeek || config.maxHoursPerWeek || 40;
	const minHours = employee.minHoursPerWeek || 0;

	if (totalHours > maxHours) {
		warnings.push(`Would exceed max hours (${totalHours.toFixed(1)}/${maxHours}h)`);
		score -= 15;
	} else if (totalHours < minHours) {
		// Bonus for helping employee reach minimum hours
		score += 8;
		reasons.push(`Helps reach minimum hours (${totalHours.toFixed(1)}/${minHours}h target)`);
	} else {
		score += 10;
		reasons.push('Within weekly hour limits');
	}

	// Check consecutive days (use employee preference if set)
	const maxConsecutive = employee.maxConsecutiveDays || config.maxConsecutiveDays || 6;
	const consecutiveDays = countConsecutiveDays(employee.existingShifts, shift.startTime);
	if (consecutiveDays >= maxConsecutive) {
		warnings.push(`Would work ${consecutiveDays + 1} consecutive days (max ${maxConsecutive})`);
		score -= 10;
	}

	// Preferred location bonus
	if (employee.preferredLocationId === shift.locationId) {
		score += 15 * (config.preferredLocationWeight || 1.2);
		reasons.push('Preferred location match');
	}

	// Shift type preference bonus
	if (shift.shiftType && employee.shiftTypePreferences.length > 0) {
		if (employee.shiftTypePreferences.includes(shift.shiftType)) {
			score += 12;
			reasons.push(`Preferred shift type (${shift.shiftType})`);
		}
	}

	// Priority shift bonus (higher priority = more important to fill)
	if (shift.priority > 5) {
		score += shift.priority * 2;
		reasons.push(`High priority shift (${shift.priority}/10)`);
	}

	// Cost optimization (prefer lower hourly rate if enabled)
	if (config.costOptimization && employee.defaultHourlyRate) {
		// Normalize rate (assuming $10-$30 range)
		const normalizedRate = 1 - (employee.defaultHourlyRate - 10) / 20;
		score += normalizedRate * 10;
		if (employee.defaultHourlyRate < 20) {
			reasons.push('Cost-effective option');
		}
	}

	// Fair distribution: penalize if employee already has many shifts
	const shiftCount = employee.existingShifts.length;
	if (shiftCount > 5) {
		score -= shiftCount * 2;
		warnings.push(`Already has ${shiftCount} shifts this week`);
	} else if (shiftCount < 3) {
		score += 5;
		reasons.push('Helps distribute shifts fairly');
	}

	// Ensure score is in valid range
	score = Math.max(0, Math.min(100, score));

	return { score, reasons, warnings };
}

/**
 * Check if two time ranges overlap
 */
function shiftsOverlap(
	start1: Date,
	end1: Date,
	start2: Date,
	end2: Date
): boolean {
	return start1 < end2 && start2 < end1;
}

/**
 * Count consecutive days of work
 */
function countConsecutiveDays(existingShifts: Array<{ startTime: Date }>, newShiftDate: Date): number {
	const sortedDates = [...existingShifts.map((s) => s.startTime), newShiftDate].sort(
		(a, b) => a.getTime() - b.getTime()
	);

	let consecutiveCount = 0;
	let currentStreak = 1;

	for (let i = 1; i < sortedDates.length; i++) {
		const dayDiff = Math.abs(
			(sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
		);

		if (dayDiff === 1) {
			currentStreak++;
			consecutiveCount = Math.max(consecutiveCount, currentStreak);
		} else if (dayDiff > 1) {
			currentStreak = 1;
		}
	}

	return consecutiveCount;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

/**
 * Analyze coverage gaps and generate AI-style suggestions
 */
function analyzeCoverageGaps(
	unassignableShifts: Array<{ shiftId: string; reasons: string[] }>,
	allShifts: any[],
	employees: Employee[]
): CoverageGap[] {
	const gaps: CoverageGap[] = [];

	for (const unassignable of unassignableShifts) {
		const shift = allShifts.find((s) => s.id === unassignable.shiftId);
		if (!shift) continue;

		const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const day = dayNames[shift.startTime.getDay()];
		const startTime = shift.startTime.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
		const endTime = shift.endTime.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});

		// Generate AI-style suggestions
		const suggestions: string[] = [];

		// Find employees who are close to being available
		const almostAvailable = employees.filter((emp) => {
			const shiftDay = shift.startTime.getDay();
			const availability = emp.Availability.find((a) => a.dayOfWeek === shiftDay);
			return !!availability; // Has some availability that day
		});

		if (almostAvailable.length > 0) {
			// Check if they're just outside the time range
			const needsTimeAdjustment = almostAvailable.filter((emp) => {
				const availability = emp.Availability.find((a) => a.dayOfWeek === shift.startTime.getDay());
				if (!availability) return false;

				const shiftStartMinutes = shift.startTime.getHours() * 60 + shift.startTime.getMinutes();
				const availStartMinutes = timeToMinutes(availability.startTime);
				const timeDiff = Math.abs(shiftStartMinutes - availStartMinutes);

				return timeDiff < 120; // Within 2 hours
			});

			if (needsTimeAdjustment.length > 0) {
				const names = needsTimeAdjustment.slice(0, 2).map((e) => e.name).join(' or ');
				suggestions.push(
					`💡 ${names} ${needsTimeAdjustment.length > 1 ? 'are' : 'is'} available on ${day} but not during these hours. Consider adjusting the shift time or asking if they can extend their availability.`
				);
			}
		}

		// Check for employees under minimum hours
		const underMinHours = employees.filter((emp) => {
			const totalHours = emp.existingShifts.reduce((sum, s) => {
				return sum + differenceInMinutes(s.endTime, s.startTime) / 60;
			}, 0);
			return totalHours < 20 && emp.Availability.some((a) => a.dayOfWeek === shift.startTime.getDay());
		});

		if (underMinHours.length > 0) {
			const names = underMinHours.slice(0, 2).map((e) => e.name).join(' and ');
			const hours = underMinHours[0].existingShifts.reduce(
				(sum, s) => sum + differenceInMinutes(s.endTime, s.startTime) / 60,
				0
			);
			suggestions.push(
				`📊 ${names} ${underMinHours.length > 1 ? 'have' : 'has'} only ${hours.toFixed(1)} hours this week. They might appreciate the extra shift if their availability can be adjusted.`
			);
		}

		// General suggestion
		if (suggestions.length === 0) {
			suggestions.push(
				`🔍 No employees are available during this time. Consider posting this shift for pickup or adjusting the schedule.`
			);
		}

		gaps.push({
			day,
			timeRange: `${startTime} - ${endTime}`,
			location: shift.Location?.name || 'Unknown',
			role: shift.role,
			suggestions
		});
	}

	return gaps;
}

/**
 * Generate insights about employee schedules
 */
function generateEmployeeInsights(employees: Employee[]): Array<{
	employeeId: string;
	employeeName: string;
	weeklyHours: number;
	shiftCount: number;
	insights: string[];
}> {
	return employees
		.map((emp) => {
			const weeklyHours = emp.existingShifts.reduce((total, s) => {
				return total + differenceInMinutes(s.endTime, s.startTime) / 60;
			}, 0);

			const insights: string[] = [];

			// Under-scheduled
			if (weeklyHours < 20 && weeklyHours > 0) {
				insights.push(`⚠️ Only ${weeklyHours.toFixed(1)} hours scheduled - may want more shifts`);
			}

			// Well-balanced
			if (weeklyHours >= 30 && weeklyHours <= 40) {
				insights.push(`✅ Well-balanced at ${weeklyHours.toFixed(1)} hours`);
			}

			// Over-scheduled
			if (weeklyHours > 40) {
				insights.push(`⚠️ ${weeklyHours.toFixed(1)} hours - approaching overtime`);
			}

			// Fair distribution
			if (emp.existingShifts.length < 3 && weeklyHours > 0) {
				insights.push(`📈 Could take on more shifts for better distribution`);
			}

			return {
				employeeId: emp.id,
				employeeName: emp.name,
				weeklyHours: Math.round(weeklyHours * 10) / 10,
				shiftCount: emp.existingShifts.length,
				insights
			};
		})
		.filter((insight) => insight.insights.length > 0);
}
