import { json } from '@sveltejs/kit';
import { MultiSolverScheduler } from '$lib/server/multi-solver-scheduler';
import { EnhancedAIScheduler } from '$lib/server/enhanced-ai-scheduler';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { testType } = await request.json();
		
		const scheduler = new MultiSolverScheduler();
		const aiScheduler = new EnhancedAIScheduler();

		// Create test problem based on type
		const problem = createTestProblem(testType);
		
		console.log(`🧪 Testing ${testType} problem...`);
		console.log(`📊 ${problem.employees.length} employees, ${problem.shifts.length} shifts`);

		// Solve with multi-solver
		const startTime = Date.now();
		const solution = await scheduler.solve(problem);
		const totalTime = Date.now() - startTime;

		// Get AI explanation
		const aiExplanation = await aiScheduler.explainSolution({
			problem: {
				shifts: problem.shifts.map(s => ({
					id: s.id,
					startTime: s.startTime,
					endTime: s.endTime,
					role: s.role,
					location: s.Location?.name || 'Unknown',
					requiredSkills: s.requiredSkills
				})),
				employees: problem.employees.map(e => ({
					id: e.id,
					name: e.name,
					skills: e.skills,
					availability: e.Availability,
					preferences: { preferredLocationId: e.preferredLocationId }
				})),
				constraints: problem.constraints || {}
			},
			solution
		});

		return json({
			success: true,
			testType,
			solver: solution.solver,
			status: solution.status,
			totalTime,
			solveTime: solution.solveTime,
			coverage: solution.metrics.coverageRate,
			score: solution.metrics.totalScore,
			assignments: solution.assignments.length,
			unassignable: solution.unassignable.length,
			explanation: solution.explanation,
			aiExplanation
		});

	} catch (error) {
		console.error('Scheduler test error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

function createTestProblem(testType: string) {
	const baseDate = new Date('2024-11-11');

	switch (testType) {
		case 'simple':
			return {
				organizationId: 'test-org',
				employees: [
					{
						id: 'emp1',
						name: 'Alice Johnson',
						skills: ['cashier'],
						maxHoursPerWeek: 40,
						preferredLocationId: 'loc1',
						Availability: [
							{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' }
						]
					}
				],
				shifts: [
					{
						id: 'shift1',
						startTime: new Date('2024-11-11T10:00:00Z'),
						endTime: new Date('2024-11-11T14:00:00Z'),
						role: 'cashier',
						locationId: 'loc1',
						requiredSkills: ['cashier'],
						hourlyRate: 18.50,
						Location: { id: 'loc1', name: 'Main Store' }
					}
				],
				constraints: { maxHoursPerWeek: 40 }
			};

		case 'complex':
			return {
				organizationId: 'test-org',
				employees: Array.from({ length: 25 }, (_, i) => ({
					id: `emp${i + 1}`,
					name: `Employee ${i + 1}`,
					skills: i % 2 === 0 ? ['cashier'] : ['customer_service'],
					maxHoursPerWeek: 35 + (i % 10),
					preferredLocationId: `loc${(i % 3) + 1}`,
					Availability: [
						{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' },
						{ dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00' }
					]
				})),
				shifts: Array.from({ length: 60 }, (_, i) => {
					const day = 11 + (i % 5);
					const startHour = 9 + (i % 8);
					const endHour = startHour + 4;
					return {
						id: `shift${i + 1}`,
						startTime: new Date(`2024-11-${day.toString().padStart(2, '0')}T${startHour.toString().padStart(2, '0')}:00:00Z`),
						endTime: new Date(`2024-11-${day.toString().padStart(2, '0')}T${endHour.toString().padStart(2, '0')}:00:00Z`),
						role: i % 2 === 0 ? 'cashier' : 'customer_service',
						locationId: `loc${(i % 3) + 1}`,
						requiredSkills: i % 2 === 0 ? ['cashier'] : ['customer_service'],
						hourlyRate: 18 + (i % 5),
						Location: { id: `loc${(i % 3) + 1}`, name: `Store ${(i % 3) + 1}` }
					};
				}),
				constraints: { maxHoursPerWeek: 40, fairnessWeight: 0.3 }
			};

		case 'multi-stage':
			return {
				organizationId: 'test-org',
				employees: Array.from({ length: 15 }, (_, i) => ({
					id: `emp${i + 1}`,
					name: `Employee ${i + 1}`,
					skills: i % 3 === 0 ? ['cashier'] : i % 3 === 1 ? ['supervisor'] : ['inventory'],
					maxHoursPerWeek: 30 + (i % 15),
					preferredLocationId: `loc${(i % 4) + 1}`,
					Availability: [
						{ dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '18:00' },
						{ dayOfWeek: 'TUESDAY', startTime: '08:00', endTime: '18:00' },
						{ dayOfWeek: 'WEDNESDAY', startTime: '08:00', endTime: '18:00' }
					]
				})),
				shifts: Array.from({ length: 30 }, (_, i) => {
					const day = 11 + (i % 3);
					const startHour = 9 + (i % 6);
					const endHour = startHour + 4;
					return {
						id: `shift${i + 1}`,
						startTime: new Date(`2024-11-${day.toString().padStart(2, '0')}T${startHour.toString().padStart(2, '0')}:00:00Z`),
						endTime: new Date(`2024-11-${day.toString().padStart(2, '0')}T${endHour.toString().padStart(2, '0')}:00:00Z`),
						role: i % 3 === 0 ? 'cashier' : i % 3 === 1 ? 'supervisor' : 'inventory',
						locationId: `loc${(i % 4) + 1}`,
						requiredSkills: i % 3 === 0 ? ['cashier'] : i % 3 === 1 ? ['supervisor'] : ['inventory'],
						hourlyRate: 20 + (i % 8),
						Location: { id: `loc${(i % 4) + 1}`, name: `Location ${(i % 4) + 1}` }
					};
				}),
				constraints: { maxHoursPerWeek: 40, fairnessWeight: 0.5, costOptimization: true }
			};

		default:
			throw new Error(`Unknown test type: ${testType}`);
	}
}
