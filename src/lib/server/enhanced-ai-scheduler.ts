import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import type { SchedulingSolution } from './multi-solver-scheduler';

const anthropic = new Anthropic({
	apiKey: env.ANTHROPIC_API_KEY
});

interface EnhancedSchedulingContext {
	problem: {
		shifts: Array<{ id: string; startTime: Date; endTime: Date; role: string; location: string; requiredSkills: string[] }>;
		employees: Array<{ id: string; name: string; skills: string[]; availability: any[]; preferences: any }>;
		constraints: any;
	};
	solution: SchedulingSolution;
	alternatives?: SchedulingSolution[];
}

/**
 * Enhanced AI Assistant for Multi-Solver Scheduling
 * Provides intelligent explanations and suggestions for all solver types
 */
export class EnhancedAIScheduler {
	/**
	 * Explain a scheduling solution in natural language
	 */
	async explainSolution(context: EnhancedSchedulingContext): Promise<string> {
		const prompt = this.buildExplanationPrompt(context);

		try {
			const message = await anthropic.messages.create({
				model: 'claude-3-5-sonnet-20241022',
				max_tokens: 3000,
				messages: [{ role: 'user', content: prompt }]
			});

			const response = message.content[0];
			return response.type === 'text' ? response.text : 'Unable to generate explanation';
		} catch (error) {
			console.error('AI explanation error:', error);
			return this.generateFallbackExplanation(context);
		}
	}

	/**
	 * Suggest improvements for infeasible or suboptimal solutions
	 */
	async suggestImprovements(context: EnhancedSchedulingContext): Promise<string> {
		const prompt = this.buildImprovementPrompt(context);

		try {
			const message = await anthropic.messages.create({
				model: 'claude-3-5-sonnet-20241022',
				max_tokens: 2500,
				messages: [{ role: 'user', content: prompt }]
			});

			const response = message.content[0];
			return response.type === 'text' ? response.text : 'Unable to generate suggestions';
		} catch (error) {
			console.error('AI improvement error:', error);
			return 'AI assistant temporarily unavailable for suggestions.';
		}
	}

	/**
	 * Help formulate constraints from natural language
	 */
	async formulateConstraints(userRequest: string, currentConstraints: any): Promise<{
		constraints: any;
		explanation: string;
	}> {
		const prompt = `You are a scheduling constraint expert. Help translate this natural language request into specific scheduling constraints.

Current constraints: ${JSON.stringify(currentConstraints, null, 2)}

User request: "${userRequest}"

Analyze the request and suggest specific constraint modifications. Consider:
- Employee availability and preferences
- Fairness and work-life balance
- Business requirements and coverage
- Labor laws and regulations
- Cost optimization

Respond with:
1. **Suggested Constraints**: Specific constraint modifications
2. **Reasoning**: Why these constraints address the request
3. **Trade-offs**: What this might impact
4. **Implementation**: How to apply these changes

Be practical and consider real-world scheduling challenges.`;

		try {
			const message = await anthropic.messages.create({
				model: 'claude-3-5-sonnet-20241022',
				max_tokens: 2000,
				messages: [{ role: 'user', content: prompt }]
			});

			const response = message.content[0];
			const explanation = response.type === 'text' ? response.text : 'Unable to process request';

			// TODO: Parse AI response to extract actual constraint modifications
			return {
				constraints: currentConstraints, // For now, return unchanged
				explanation
			};
		} catch (error) {
			console.error('AI constraint formulation error:', error);
			return {
				constraints: currentConstraints,
				explanation: 'AI assistant temporarily unavailable for constraint formulation.'
			};
		}
	}

	/**
	 * Compare solutions from different solvers
	 */
	async compareSolutions(solutions: SchedulingSolution[]): Promise<string> {
		const prompt = this.buildComparisonPrompt(solutions);

		try {
			const message = await anthropic.messages.create({
				model: 'claude-3-5-sonnet-20241022',
				max_tokens: 2500,
				messages: [{ role: 'user', content: prompt }]
			});

			const response = message.content[0];
			return response.type === 'text' ? response.text : 'Unable to compare solutions';
		} catch (error) {
			console.error('AI comparison error:', error);
			return 'AI assistant temporarily unavailable for solution comparison.';
		}
	}

	/**
	 * Build explanation prompt based on solver type and solution
	 */
	private buildExplanationPrompt(context: EnhancedSchedulingContext): string {
		const { solution, problem } = context;
		const solverName = this.getSolverDisplayName(solution.solver);

		return `You are an expert scheduling assistant explaining a ${solverName} solution to a manager.

## Solution Summary
- Solver: ${solverName}
- Status: ${solution.status}
- Assignments: ${solution.assignments.length}/${problem.shifts.length} shifts filled
- Coverage Rate: ${(solution.metrics.coverageRate * 100).toFixed(1)}%
- Total Score: ${solution.metrics.totalScore}
- Solve Time: ${solution.solveTime}ms

## Problem Context
- ${problem.shifts.length} shifts across ${new Set(problem.shifts.map(s => s.location)).size} locations
- ${problem.employees.length} employees available
- Constraints: ${JSON.stringify(problem.constraints)}

## Assignments
${solution.assignments.map(a => `- Shift ${a.shiftId} → Employee ${a.employeeId} (Score: ${a.score})`).join('\n')}

${solution.unassignable.length > 0 ? `## Unassignable Shifts\n${solution.unassignable.map(u => `- Shift ${u.shiftId}: ${u.reasons.join(', ')}`).join('\n')}` : ''}

Explain this solution in a friendly, conversational way. Focus on:
1. **Overall Assessment** - How well did the solver perform?
2. **Key Insights** - What patterns or optimizations were found?
3. **Coverage Analysis** - Which areas are well-covered vs. gaps?
4. **Recommendations** - Specific actions the manager should consider

Use emojis and clear formatting. Be encouraging but honest about limitations.`;
	}

	private buildImprovementPrompt(context: EnhancedSchedulingContext): string {
		const { solution, problem } = context;

		return `You are a scheduling optimization expert. Analyze this solution and suggest specific improvements.

## Current Solution Issues
- Status: ${solution.status}
- Coverage: ${(solution.metrics.coverageRate * 100).toFixed(1)}%
- Unassigned: ${solution.unassignable.length} shifts

## Problem Details
${JSON.stringify({ shifts: problem.shifts.length, employees: problem.employees.length, constraints: problem.constraints }, null, 2)}

Provide specific, actionable suggestions:
1. **Immediate Fixes** - Quick changes to improve coverage
2. **Constraint Adjustments** - Which constraints might be too restrictive
3. **Employee Development** - Skills or availability improvements needed
4. **Process Improvements** - Better scheduling practices

Be specific and practical. Focus on solutions the manager can implement.`;
	}

	private buildComparisonPrompt(solutions: SchedulingSolution[]): string {
		return `Compare these scheduling solutions and recommend the best approach:

${solutions.map((sol, i) => `
## Solution ${i + 1}: ${this.getSolverDisplayName(sol.solver)}
- Status: ${sol.status}
- Coverage: ${(sol.metrics.coverageRate * 100).toFixed(1)}%
- Score: ${sol.metrics.totalScore}
- Time: ${sol.solveTime}ms
- Assignments: ${sol.assignments.length}
`).join('\n')}

Provide a clear recommendation with pros/cons for each approach.`;
	}

	private getSolverDisplayName(solver: string): string {
		switch (solver) {
			case 'greedy': return 'Quick Scheduler';
			case 'ortools': return 'Optimal Scheduler (OR-Tools)';
			case 'universal': return 'Advanced Multi-Stage Optimizer';
			default: return solver;
		}
	}

	private generateFallbackExplanation(context: EnhancedSchedulingContext): string {
		const { solution } = context;
		return `${this.getSolverDisplayName(solution.solver)} completed with ${solution.assignments.length} assignments. Coverage: ${(solution.metrics.coverageRate * 100).toFixed(1)}%. ${solution.explanation}`;
	}
}
