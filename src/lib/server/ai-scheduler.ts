import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

const anthropic = new Anthropic({
	apiKey: env.ANTHROPIC_API_KEY
});

interface SchedulingContext {
	employees: Array<{
		id: string;
		name: string;
		role: string;
		weeklyHours: number;
		hourlyRate?: number;
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
		hourlyRate?: number;
		laborCost?: number;
	}>;
	coverageGaps: Array<{
		day: string;
		timeRange: string;
		location: string;
		role: string;
		suggestions?: string[];
	}>;
	constraints?: {
		maxHoursPerWeek?: number;
		minRestHours?: number;
	};
	financialContext?: {
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
		organizationMetrics?: {
			monthlyGrowthRate: number;
			yearOverYearGrowth: number;
			laborCostPercentage: number; // % of revenue
			efficiency: number; // revenue per labor hour
		};
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
 * AI Assistant for analyzing completed schedules and providing tips
 */
export async function getScheduleAnalysisAndTips(
	context: SchedulingContext,
	scheduleResult: {
		suggestions: Array<{
			shiftId: string;
			employeeId: string;
			employeeName: string;
			score: number;
			reasons: string[];
			warnings: string[];
		}>;
		unassignableShifts: Array<{
			shiftId: string;
			reasons: string[];
		}>;
		coverageGaps: Array<{
			day: string;
			timeRange: string;
			location: string;
			role: string;
			suggestions: string[];
		}>;
		employeeInsights: Array<{
			employeeId: string;
			employeeName: string;
			weeklyHours: number;
			shiftCount: number;
			insights: string[];
		}>;
	}
): Promise<string> {
	const prompt = buildScheduleAnalysisPrompt(context, scheduleResult);

	try {
		const message = await anthropic.messages.create({
			model: 'claude-3-5-sonnet-20241022',
			max_tokens: 3000,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		});

		const response = message.content[0];
		return response.type === 'text' ? response.text : 'Unable to generate analysis';
	} catch (error) {
		console.error('AI schedule analysis error:', error);
		return 'AI assistant is temporarily unavailable. The schedule has been generated successfully.';
	}
}

/**
 * Build a detailed prompt for schedule analysis and tips
 */
function buildScheduleAnalysisPrompt(
	context: SchedulingContext,
	scheduleResult: any
): string {
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	return `You are an AI scheduling assistant analyzing a completed work schedule. Your job is to provide helpful tips, insights, and suggestions to improve the schedule.

## Schedule Analysis Results

**Successfully Assigned Shifts:**
${scheduleResult.suggestions.length > 0
	? scheduleResult.suggestions.map(s =>
		`- ${s.employeeName} assigned to shift ${s.shiftId} (Score: ${s.score}/100)
		  Reasons: ${s.reasons.join(', ')}
		  ${s.warnings.length > 0 ? `⚠️ Warnings: ${s.warnings.join(', ')}` : ''}`
	).join('\n')
	: 'No shifts were successfully assigned by the algorithm.'}

**Coverage Gaps (Unassigned Shifts):**
${scheduleResult.coverageGaps.length > 0
	? scheduleResult.coverageGaps.map(gap =>
		`- ${gap.day} ${gap.timeRange} at ${gap.location} (${gap.role} needed)
		  AI Suggestions: ${gap.suggestions.join(', ')}`
	).join('\n')
	: '✅ All shifts have been covered!'}

**Employee Insights:**
${scheduleResult.employeeInsights.map(emp =>
	`- **${emp.employeeName}**: ${emp.weeklyHours}h across ${emp.shiftCount} shifts
	  ${emp.insights.length > 0 ? emp.insights.join(', ') : 'No specific insights'}`
).join('\n')}

**Employee Availability & Rates:**
${context.employees.map(emp => {
	const availability = emp.availability
		.map(avail => `${dayNames[avail.dayOfWeek]} ${avail.startTime}-${avail.endTime}`)
		.join(', ');
	const rate = emp.hourlyRate ? `$${emp.hourlyRate}/hr` : 'Rate not set';
	return `- ${emp.name} (${emp.role}): ${rate}, Available ${availability || 'No availability set'}`;
}).join('\n')}

${context.financialContext ? `
**Financial Analysis:**
- Current Week Labor Cost: $${context.financialContext.currentWeekLaborCost.toFixed(2)}
- Average Hourly Rate: $${context.financialContext.averageHourlyRate.toFixed(2)}
- Total Scheduled Hours: ${context.financialContext.totalScheduledHours.toFixed(1)}h
- Overtime Hours: ${context.financialContext.overtimeHours.toFixed(1)}h (Cost: $${context.financialContext.overtimeCost.toFixed(2)})

${context.financialContext.lastYearSameWeek ? `
**Year-over-Year Comparison (Same Week Last Year):**
- Labor Cost: $${context.financialContext.lastYearSameWeek.laborCost.toFixed(2)} vs $${context.financialContext.currentWeekLaborCost.toFixed(2)} (${((context.financialContext.currentWeekLaborCost - context.financialContext.lastYearSameWeek.laborCost) / context.financialContext.lastYearSameWeek.laborCost * 100).toFixed(1)}% change)
- Total Hours: ${context.financialContext.lastYearSameWeek.totalHours.toFixed(1)}h vs ${context.financialContext.totalScheduledHours.toFixed(1)}h
- Average Rate: $${context.financialContext.lastYearSameWeek.averageHourlyRate.toFixed(2)} vs $${context.financialContext.averageHourlyRate.toFixed(2)}
${context.financialContext.lastYearSameWeek.revenue ? `- Revenue: $${context.financialContext.lastYearSameWeek.revenue.toFixed(2)} (${context.financialContext.lastYearSameWeek.profitMargin?.toFixed(1)}% margin)` : ''}
` : ''}

${context.financialContext.organizationMetrics ? `
**Organization Performance Metrics:**
- Monthly Growth Rate: ${context.financialContext.organizationMetrics.monthlyGrowthRate.toFixed(1)}%
- Year-over-Year Growth: ${context.financialContext.organizationMetrics.yearOverYearGrowth.toFixed(1)}%
- Labor Cost as % of Revenue: ${context.financialContext.organizationMetrics.laborCostPercentage.toFixed(1)}%
- Revenue per Labor Hour: $${context.financialContext.organizationMetrics.efficiency.toFixed(2)}
` : ''}
` : ''}

## Your Task

As a P&L expert and scheduling analyst, provide comprehensive insights covering:

1. **Coverage Solutions**: For any gaps, suggest specific employees who could fill them
   - Example: "4-9pm not covered Friday July 7th. Mike has elected for extra hours and is available - maybe try him?"

2. **Financial & P&L Analysis**: Analyze labor costs and profitability impact
   - Compare current costs vs last year same period
   - Identify cost optimization opportunities
   - Flag overtime risks and suggest alternatives
   - Analyze labor cost efficiency and ROI

3. **Historical Performance Insights**: Compare with last year's performance
   - Example: "Labor costs are up 12% vs last year, but you're scheduling 8% more hours. Consider if this aligns with revenue growth."
   - Example: "Last year this week you had $2,400 in labor costs with 15% higher profit margin. Current schedule may be over-staffed."

4. **Organization Growth Analysis**: Factor in business growth patterns
   - Example: "With 18% YoY growth, current labor increase of 12% is reasonable, but watch the 3% margin compression."
   - Example: "Your efficiency dropped from $45/labor hour to $42/hour. Consider optimizing high-cost shifts during slow periods."

5. **Workload Balance**: Identify employees who might be over/under-scheduled
   - Example: "Sarah is working 6 days straight. Consider giving her Sunday off and asking Tom who only has 2 shifts."

6. **Strategic Cost Optimization**: Suggest ways to improve profitability
   - Example: "Replace the $25/hr manager shift on slow Monday morning with a $18/hr senior employee - saves $56/week."
   - Example: "Your Tuesday lunch has 3 bartenders ($22/hr avg) but last year managed with 2. That's $132 weekly savings opportunity."

7. **Employee Wellness & Retention**: Flag potential burnout affecting long-term costs
   - Example: "Jake has back-to-back closing/opening shifts. Burnout could lead to turnover (avg replacement cost: $3,200)."

**Response Format:**
- Use a friendly, conversational tone
- Start with an overall assessment (Great job! or Needs attention)
- Use emojis for visual clarity (📅 💡 ⚠️ 💰 👥 📈 📉 🎯)
- Include specific dollar amounts and percentages when discussing costs
- Provide specific employee names, times, and financial impact
- Prioritize suggestions by financial impact and urgency
- Keep suggestions actionable with clear ROI when possible

**Structure your response as:**
1. **Overall Assessment** (2-3 sentences with key metrics)
2. **Financial Highlights** (costs, comparisons, efficiency)
3. **Priority Actions** (most impactful changes first)
4. **Coverage Solutions** (specific staffing suggestions)
5. **Long-term Recommendations** (strategic improvements)

Remember: You're a P&L expert helping a busy manager optimize both operations AND profitability.`;
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
