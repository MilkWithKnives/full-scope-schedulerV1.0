import { prisma } from '$lib/server/prisma';
import type { User, Shift, Availability, Location, SchedulingPreferences } from '@prisma/client';

// Import existing schedulers
import { generateScheduleSuggestions } from './scheduler'; // Current greedy algorithm
import { ORToolsScheduler } from './ortools-scheduler';

interface SchedulingProblem {
	shifts: Array<Shift & { Location: Location }>;
	employees: Array<User & { Availability: Availability[] }>;
	organizationId: string;
	preferences?: SchedulingPreferences;
	constraints?: {
		maxHoursPerWeek?: number;
		maxConsecutiveDays?: number;
		minRestHours?: number;
		fairnessWeight?: number;
		costOptimization?: boolean;
	};
}

interface SchedulingSolution {
	assignments: Array<{
		shiftId: string;
		employeeId: string;
		score: number;
		reasons: string[];
		warnings: string[];
	}>;
	unassignable: Array<{
		shiftId: string;
		reasons: string[];
	}>;
	solver: 'greedy' | 'ortools' | 'universal';
	status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';
	solveTime: number;
	explanation: string;
	metrics: {
		totalScore: number;
		fairnessScore: number;
		costEfficiency: number;
		coverageRate: number;
	};
}

type ProblemComplexity = 'simple' | 'complex' | 'multi-stage';

/**
 * Multi-Solver Scheduler
 * Automatically chooses the best optimization approach based on problem characteristics
 */
export class MultiSolverScheduler {
	private ortoolsScheduler: ORToolsScheduler;

	constructor() {
		this.ortoolsScheduler = new ORToolsScheduler();
	}

	/**
	 * Main entry point - analyzes problem and routes to best solver
	 */
	async solve(problem: SchedulingProblem): Promise<SchedulingSolution> {
		const complexity = this.classifyProblem(problem);
		const startTime = Date.now();

		console.log(`🎯 Problem classified as: ${complexity}`);
		console.log(`📊 ${problem.shifts.length} shifts, ${problem.employees.length} employees`);

		try {
			let solution: SchedulingSolution;

			switch (complexity) {
				case 'simple':
					solution = await this.solveWithGreedy(problem);
					break;
				case 'complex':
					solution = await this.solveWithORTools(problem);
					break;
				case 'multi-stage':
					solution = await this.solveWithUniversalSolver(problem);
					break;
				default:
					throw new Error(`Unknown complexity: ${complexity}`);
			}

			solution.solveTime = Date.now() - startTime;
			return solution;

		} catch (error) {
			console.error(`❌ Solver failed:`, error);
			// Fallback to greedy algorithm
			const fallbackSolution = await this.solveWithGreedy(problem);
			fallbackSolution.explanation = `Primary solver failed, using fallback. Error: ${error}`;
			fallbackSolution.solveTime = Date.now() - startTime;
			return fallbackSolution;
		}
	}

	/**
	 * Classify problem complexity to choose appropriate solver
	 */
	private classifyProblem(problem: SchedulingProblem): ProblemComplexity {
		const { shifts, employees, constraints } = problem;

		// Multi-stage indicators (most complex problems)
		if (this.hasMultiObjectiveOptimization(problem) && this.hasBudgetConstraints(problem)) return 'multi-stage';
		if (this.hasLocationOptimization(problem) && shifts.length > 20) return 'multi-stage';
		if (constraints?.costOptimization && this.hasFairnessRequirements(problem)) return 'multi-stage';

		// Complex indicators (use OR-Tools)
		if (shifts.length > 15) return 'complex';
		if (employees.length > 10) return 'complex';
		if (this.hasFairnessRequirements(problem)) return 'complex';
		if (this.hasMultipleLocations(problem) && shifts.length > 5) return 'complex';
		if (this.hasComplexConstraints(problem)) return 'complex';

		// Simple cases (use greedy)
		return 'simple';
	}

	/**
	 * Solve using current greedy algorithm
	 */
	private async solveWithGreedy(problem: SchedulingProblem): Promise<SchedulingSolution> {
		console.log('🏃 Using Greedy Algorithm');

		// Convert to format expected by existing scheduler
		const result = await generateScheduleSuggestions(
			problem.shifts.map(s => s.id),
			problem.organizationId,
			{
				maxHoursPerWeek: problem.constraints?.maxHoursPerWeek || 40,
				maxConsecutiveDays: problem.constraints?.maxConsecutiveDays || 6,
				minRestHoursBetweenShifts: problem.constraints?.minRestHours || 8,
				costOptimization: problem.constraints?.costOptimization || false
			}
		);

		return {
			assignments: result.suggestions.map(s => ({
				shiftId: s.shiftId,
				employeeId: s.employeeId,
				score: s.score,
				reasons: s.reasons,
				warnings: s.warnings
			})),
			unassignable: result.unassignable,
			solver: 'greedy',
			status: result.suggestions.length > 0 ? 'FEASIBLE' : 'INFEASIBLE',
			solveTime: 0, // Will be set by caller
			explanation: `Greedy algorithm assigned ${result.suggestions.length} shifts`,
			metrics: this.calculateMetrics(result.suggestions, problem)
		};
	}

	/**
	 * Solve using OR-Tools constraint programming
	 */
	private async solveWithORTools(problem: SchedulingProblem): Promise<SchedulingSolution> {
		console.log('🔧 Using OR-Tools Constraint Programming');

		const result = await this.ortoolsScheduler.generateOptimalSchedule(problem);

		return {
			assignments: result.assignments,
			unassignable: result.unassignable,
			solver: 'ortools',
			status: result.status,
			solveTime: result.solveTime,
			explanation: result.explanation,
			metrics: result.metrics
		};
	}

	/**
	 * Solve using Universal Solver for multi-stage optimization
	 */
	private async solveWithUniversalSolver(problem: SchedulingProblem): Promise<SchedulingSolution> {
		console.log('🌟 Using Universal Solver (Multi-Stage)');

		try {
			// Stage 1: Optimize shift distribution across locations
			const locationOptimization = await this.optimizeLocationDistribution(problem);

			// Stage 2: Optimize employee assignments with location constraints
			const assignmentOptimization = await this.optimizeAssignments(problem, locationOptimization);

			// Stage 3: Fine-tune for cost and fairness
			const finalOptimization = await this.fineTuneSchedule(assignmentOptimization, problem);

			return {
				assignments: finalOptimization.assignments,
				unassignable: finalOptimization.unassignable,
				solver: 'universal',
				status: finalOptimization.status,
				solveTime: finalOptimization.solveTime,
				explanation: `Multi-stage optimization: ${finalOptimization.explanation}`,
				metrics: this.calculateMetrics(finalOptimization.assignments, problem)
			};
		} catch (error) {
			console.log('⚠️  Universal Solver failed, falling back to OR-Tools');
			return await this.solveWithORTools(problem);
		}
	}

	/**
	 * Stage 1: Optimize shift distribution across locations
	 */
	private async optimizeLocationDistribution(problem: SchedulingProblem): Promise<any> {
		// This would call Universal Solver with location optimization model
		// For now, return current distribution
		return { locationAssignments: problem.shifts.map(s => ({ shiftId: s.id, locationId: s.locationId })) };
	}

	/**
	 * Stage 2: Optimize employee assignments
	 */
	private async optimizeAssignments(problem: SchedulingProblem, locationOptimization: any): Promise<any> {
		// This would call Universal Solver with assignment optimization
		// For now, use OR-Tools
		return await this.ortoolsScheduler.generateOptimalSchedule(problem);
	}

	/**
	 * Stage 3: Fine-tune for cost and fairness
	 */
	private async fineTuneSchedule(assignments: any, problem: SchedulingProblem): Promise<any> {
		// This would call Universal Solver for final optimization
		// For now, return assignments as-is
		return assignments;
	}

	// Problem classification helpers
	private hasMultiObjectiveOptimization(problem: SchedulingProblem): boolean {
		// Check if we need to optimize multiple competing objectives
		return problem.constraints?.fairnessWeight !== undefined;
	}

	private hasBudgetConstraints(problem: SchedulingProblem): boolean {
		// Check if we have budget/cost constraints beyond simple optimization
		return problem.shifts.some(s => s.hourlyRate !== null);
	}

	private hasLocationOptimization(problem: SchedulingProblem): boolean {
		// Check if we need to optimize location assignments
		const locations = new Set(problem.shifts.map(s => s.locationId));
		return locations.size > 2;
	}

	private hasFairnessRequirements(problem: SchedulingProblem): boolean {
		return problem.preferences?.fairDistributionEnabled || false;
	}

	private hasMultipleLocations(problem: SchedulingProblem): boolean {
		const locations = new Set(problem.shifts.map(s => s.locationId));
		return locations.size > 1;
	}

	private hasComplexConstraints(problem: SchedulingProblem): boolean {
		// Check for complex constraints that benefit from constraint programming
		return problem.employees.some(e => 
			e.skills.length > 0 || 
			e.shiftTypePreferences.length > 0 ||
			e.preferredLocationId !== null
		);
	}

	private calculateMetrics(assignments: Array<{ shiftId: string; employeeId: string; score: number }>, problem: SchedulingProblem) {
		const totalScore = assignments.reduce((sum, a) => sum + a.score, 0);
		const coverageRate = assignments.length / problem.shifts.length;

		return {
			totalScore,
			fairnessScore: 0.8, // TODO: Calculate actual fairness
			costEfficiency: 0.7, // TODO: Calculate actual cost efficiency
			coverageRate
		};
	}
}
