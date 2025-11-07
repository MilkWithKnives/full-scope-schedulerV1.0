import { prisma } from '$lib/server/prisma';
import type { User, Shift, Availability, Location } from '@prisma/client';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface SchedulingProblem {
	employees: Array<User & { Availability: Availability[] }>;
	shifts: Array<Shift & { Location: Location }>;
	organizationId: string;
	constraints?: {
		maxHoursPerWeek?: number;
		maxConsecutiveDays?: number;
		minRestHours?: number;
		fairnessWeight?: number;
		costOptimization?: boolean;
	};
}

/**
 * Advanced scheduler using OR-Tools constraint programming
 * Handles complex scheduling scenarios that the greedy algorithm can't solve optimally
 */
export class ORToolsScheduler {
	/**
	 * Generate optimal schedule using OR-Tools CP-SAT solver
	 */
	async generateOptimalSchedule(problem: SchedulingProblem): Promise<{
		assignments: Array<{ shiftId: string; employeeId: string; score: number; reasons: string[]; warnings: string[] }>;
		status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN' | 'ERROR';
		solveTime: number;
		explanation: string;
		unassignable: Array<{ shiftId: string; reasons: string[] }>;
		metrics: {
			totalScore: number;
			fairnessScore: number;
			costEfficiency: number;
			coverageRate: number;
		};
	}> {
		const tempId = randomUUID();
		const inputFile = join(process.cwd(), `temp_input_${tempId}.json`);
		const outputFile = join(process.cwd(), `temp_output_${tempId}.json`);

		try {
			// Prepare data for Python script
			const problemData = this.prepareProblemData(problem);
			await writeFile(inputFile, JSON.stringify(problemData, null, 2));

			// Call Python OR-Tools solver
			const solution = await this.callPythonSolver(inputFile, outputFile);

			return solution;

		} catch (error) {
			console.error('OR-Tools solver error:', error);
			return {
				assignments: [],
				unassignable: problem.shifts.map(s => ({ shiftId: s.id, reasons: ['Solver error'] })),
				status: 'ERROR',
				solveTime: 0,
				explanation: `OR-Tools solver failed: ${error}`,
				metrics: { totalScore: 0, fairnessScore: 0, costEfficiency: 0, coverageRate: 0 }
			};
		} finally {
			// Clean up temp files
			try {
				await unlink(inputFile);
				await unlink(outputFile);
			} catch (e) {
				// Ignore cleanup errors
			}
		}
	}

	/**
	 * Prepare problem data for Python solver
	 */
	private prepareProblemData(problem: SchedulingProblem) {
		return {
			organizationId: problem.organizationId,
			employees: problem.employees.map(emp => ({
				id: emp.id,
				name: emp.name,
				skills: emp.skills,
				maxHoursPerWeek: emp.maxHoursPerWeek,
				preferredLocationId: emp.preferredLocationId,
				Availability: emp.Availability.map(avail => ({
					dayOfWeek: avail.dayOfWeek,
					startTime: avail.startTime,
					endTime: avail.endTime
				}))
			})),
			shifts: problem.shifts.map(shift => ({
				id: shift.id,
				startTime: shift.startTime.toISOString(),
				endTime: shift.endTime.toISOString(),
				role: shift.role,
				locationId: shift.locationId,
				requiredSkills: shift.requiredSkills,
				hourlyRate: shift.hourlyRate
			})),
			constraints: problem.constraints || {}
		};
	}

	/**
	 * Call Python OR-Tools solver
	 */
	private async callPythonSolver(inputFile: string, outputFile: string): Promise<any> {
		return new Promise((resolve, reject) => {
			const pythonScript = join(process.cwd(), 'python', 'ortools_scheduler.py');
			const pythonProcess = spawn('python', [pythonScript, '--input', inputFile, '--output', outputFile]);

			let stderr = '';
			pythonProcess.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			pythonProcess.on('close', async (code) => {
				if (code !== 0) {
					reject(new Error(`Python solver exited with code ${code}: ${stderr}`));
					return;
				}

				try {
					const fs = await import('fs/promises');
					const resultData = await fs.readFile(outputFile, 'utf-8');
					const solution = JSON.parse(resultData);
					resolve(solution);
				} catch (error) {
					reject(new Error(`Failed to read solution: ${error}`));
				}
			});

			pythonProcess.on('error', (error) => {
				reject(new Error(`Failed to start Python solver: ${error}`));
			});
		});
	}
}
