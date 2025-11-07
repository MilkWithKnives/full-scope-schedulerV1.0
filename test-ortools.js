#!/usr/bin/env node

/**
 * Test script for OR-Tools integration
 * Creates sample data and tests the Python OR-Tools solver
 */

import { writeFile, unlink } from 'fs/promises';
import { spawn } from 'child_process';
import { join } from 'path';

// Sample test data
const testProblem = {
  organizationId: 'test-org',
  employees: [
    {
      id: 'emp1',
      name: 'Alice Johnson',
      skills: ['cashier', 'customer_service'],
      maxHoursPerWeek: 40,
      preferredLocationId: 'loc1',
      Availability: [
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '17:00' }
      ]
    },
    {
      id: 'emp2',
      name: 'Bob Smith',
      skills: ['cashier', 'inventory'],
      maxHoursPerWeek: 35,
      preferredLocationId: 'loc1',
      Availability: [
        { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '18:00' },
        { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '18:00' },
        { dayOfWeek: 'THURSDAY', startTime: '10:00', endTime: '18:00' }
      ]
    },
    {
      id: 'emp3',
      name: 'Carol Davis',
      skills: ['customer_service', 'supervisor'],
      maxHoursPerWeek: 30,
      preferredLocationId: 'loc2',
      Availability: [
        { dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '16:00' },
        { dayOfWeek: 'WEDNESDAY', startTime: '08:00', endTime: '16:00' },
        { dayOfWeek: 'FRIDAY', startTime: '08:00', endTime: '16:00' }
      ]
    }
  ],
  shifts: [
    {
      id: 'shift1',
      startTime: '2024-11-11T10:00:00Z', // Monday - Alice available
      endTime: '2024-11-11T14:00:00Z',
      role: 'cashier',
      locationId: 'loc1',
      requiredSkills: ['cashier'],
      hourlyRate: 18.50
    },
    {
      id: 'shift2',
      startTime: '2024-11-12T11:00:00Z', // Tuesday - Bob available
      endTime: '2024-11-12T15:00:00Z',
      role: 'cashier',
      locationId: 'loc1',
      requiredSkills: ['cashier'],
      hourlyRate: 19.00
    },
    {
      id: 'shift3',
      startTime: '2024-11-13T09:00:00Z', // Wednesday - Alice available
      endTime: '2024-11-13T13:00:00Z',
      role: 'customer_service',
      locationId: 'loc1',
      requiredSkills: ['customer_service'],
      hourlyRate: 22.00
    },
    {
      id: 'shift4',
      startTime: '2024-11-15T10:00:00Z', // Friday - Carol available
      endTime: '2024-11-15T14:00:00Z',
      role: 'customer_service',
      locationId: 'loc2',
      requiredSkills: ['customer_service'],
      hourlyRate: 20.50
    }
  ],
  constraints: {
    maxHoursPerWeek: 40,
    maxConsecutiveDays: 5,
    minRestHours: 8,
    fairnessWeight: 0.3,
    costOptimization: true
  }
};

async function testORTools() {
  const inputFile = 'test_input.json';
  const outputFile = 'test_output.json';

  try {
    console.log('🧪 Testing OR-Tools Python Solver...');
    console.log(`📊 Problem: ${testProblem.employees.length} employees, ${testProblem.shifts.length} shifts`);

    // Write test data
    await writeFile(inputFile, JSON.stringify(testProblem, null, 2));
    console.log('✅ Test data written');

    // Call Python solver
    console.log('🐍 Calling Python OR-Tools solver...');
    const result = await callPythonSolver(inputFile, outputFile);

    console.log('\n🎉 OR-Tools Solution:');
    console.log(`Status: ${result.status}`);
    console.log(`Solve Time: ${result.solveTime}ms`);
    console.log(`Assignments: ${result.assignments.length}/${testProblem.shifts.length} shifts filled`);
    console.log(`Coverage: ${(result.metrics.coverageRate * 100).toFixed(1)}%`);
    console.log(`Total Score: ${result.metrics.totalScore}`);
    
    if (result.assignments.length > 0) {
      console.log('\n📋 Assignments:');
      result.assignments.forEach(assignment => {
        const employee = testProblem.employees.find(e => e.id === assignment.employeeId);
        const shift = testProblem.shifts.find(s => s.id === assignment.shiftId);
        console.log(`  • ${employee?.name} → ${shift?.role} (${new Date(shift?.startTime).toLocaleDateString()}) - Score: ${assignment.score}`);
      });
    }

    if (result.unassignable.length > 0) {
      console.log('\n⚠️  Unassignable Shifts:');
      result.unassignable.forEach(unassigned => {
        const shift = testProblem.shifts.find(s => s.id === unassigned.shiftId);
        console.log(`  • ${shift?.role} (${new Date(shift?.startTime).toLocaleDateString()}): ${unassigned.reasons.join(', ')}`);
      });
    }

    console.log(`\n💡 ${result.explanation}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Clean up
    try {
      await unlink(inputFile);
      await unlink(outputFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

function callPythonSolver(inputFile, outputFile) {
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

// Run the test
testORTools();
