import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const anthropic = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

interface SchedulingContext {
	employees: Array<{
		id: string;
		name: string;
		role: string;
		weeklyHours: number;
		availability: Array<{
			dayOfWeek: number;
			startTime: string;
			endTime: string;
		}>;
	}>;
	shifts: Array<{
		id: string;
		day: string;
		startTime: string;
		endTime: string;
		role: string;
		location: string;
		assigned: boolean;
	}>;
	coverageGaps: Array<{
		day: string;
		timeRange: string;
		location: string;
		role: string;
	}>;
	constraints?: {
		maxHoursPerWeek?: number;
		minRestHours?: number;
	};
}

/**
 * Get AI scheduling suggestions when auto-scheduler fails
 */
export async function getAISchedulingSuggestions(
	context: SchedulingContext
): Promise<string> {
	const prompt = buildSchedulingPrompt(context);

	try {
		const message = await anthropic.messages.create({
			model: 'claude-3-5-sonnet-20241022',
			max_tokens: 2000,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		});

		const response = message.content[0];
		return response.type === 'text' ? response.text : 'Unable to generate suggestions';
	} catch (error) {
		console.error('AI scheduling error:', error);
		return 'AI assistant is temporarily unavailable. Please try adjusting shift times or employee availability manually.';
	}
}

/**
 * Get AI help to build a complete schedule from scratch
 */
export async function getAIScheduleBuilder(
	context: SchedulingContext,
	userRequest: string
): Promise<string> {
	const prompt = `You are a scheduling assistant helping a manager create a work schedule.

## Current Situation
Employees and their availability:
${context.employees
	.map((emp) => {
		const avail = emp.availability
			.map((a) => {
				const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
				return `${days[a.dayOfWeek]} ${a.startTime}-${a.endTime}`;
			})
			.join(', ');
		return `- ${emp.name} (${emp.role}): Available ${avail}`;
	})
	.join('\n')}

Current weekly hours:
${context.employees.map((emp) => `- ${emp.name}: ${emp.weeklyHours} hours`).join('\n')}

## Manager's Request
${userRequest}

## Your Task
Provide specific, actionable scheduling advice. Include:
1. Recommended shift assignments with employee names and times
2. Reasons for each recommendation (availability match, fair distribution, etc.)
3. Any warnings or considerations (overtime risk, rest time, etc.)
4. Alternative options if applicable

Be conversational and helpful. Format your response with clear sections and bullet points.`;

	try {
		const message = await anthropic.messages.create({
			model: 'claude-3-5-sonnet-20241022',
			max_tokens: 2000,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		});

		const response = message.content[0];
		return response.type === 'text' ? response.text : 'Unable to generate schedule';
	} catch (error) {
		console.error('AI schedule builder error:', error);
		return 'AI assistant is temporarily unavailable. Please try again later.';
	}
}

/**
 * Build a detailed prompt for scheduling problems
 */
function buildSchedulingPrompt(context: SchedulingContext): string {
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	return `You are an AI scheduling assistant helping a manager solve scheduling conflicts.

## Current Situation

**Coverage Gaps (Shifts that couldn't be filled):**
${
	context.coverageGaps.length > 0
		? context.coverageGaps
				.map(
					(gap) => `- ${gap.day} ${gap.timeRange} at ${gap.location} (${gap.role} needed)`
				)
				.join('\n')
		: 'No coverage gaps - all shifts filled!'
}

**Employees and Availability:**
${context.employees
	.map((emp) => {
		const availability = emp.availability
			.map((avail) => {
				return `${dayNames[avail.dayOfWeek]} ${avail.startTime}-${avail.endTime}`;
			})
			.join(', ');

		return `- **${emp.name}** (${emp.role})
  - Current hours this week: ${emp.weeklyHours}
  - Available: ${availability || 'No availability set'}`;
	})
	.join('\n')}

**Scheduling Constraints:**
- Maximum hours per week: ${context.constraints?.maxHoursPerWeek || 40}
- Minimum rest between shifts: ${context.constraints?.minRestHours || 8} hours

## Your Task

Analyze the coverage gaps and provide specific, actionable suggestions to solve them. For each gap:

1. **Identify potential solutions:** Which employees could cover this shift?
2. **Explain the tradeoffs:** What adjustments would be needed? (availability changes, hour limits, etc.)
3. **Prioritize recommendations:** Best option first, alternatives second
4. **Be specific:** Use employee names, exact times, and concrete next steps

Format your response as a friendly, conversational message that:
- Uses bullet points for clarity
- Highlights critical issues with ⚠️
- Suggests creative solutions with 💡
- Provides alternative options when available

Remember: The goal is to help the manager quickly understand the problem and take action.`;
}
