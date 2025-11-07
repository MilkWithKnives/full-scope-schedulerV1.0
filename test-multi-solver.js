#!/usr/bin/env node

/**
 * Test script for Multi-Solver Scheduler
 * Tests the problem classifier and solver routing
 */

import { MultiSolverScheduler } from './src/lib/server/multi-solver-scheduler.js';

// Test cases with different complexity levels
const testCases = [
  {
    name: 'Simple Problem (should use Greedy)',
    problem: {
      organizationId: 'test-org',
      employees: [
        {
          id: 'emp1',
          name: 'Alice',
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
      constraints: {
        maxHoursPerWeek: 40
      }
    }
  },
  {
    name: 'Complex Problem (should use OR-Tools)',
    problem: {
      organizationId: 'test-org',
      employees: Array.from({ length: 25 }, (_, i) => ({
        id: `emp${i + 1}`,
        name: `Employee ${i + 1}`,
        skills: ['cashier', 'customer_service'][i % 2] ? ['cashier'] : ['customer_service'],
        maxHoursPerWeek: 35 + (i % 10),
        preferredLocationId: `loc${(i % 3) + 1}`,
        Availability: [
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00' }
        ]
      })),
      shifts: Array.from({ length: 60 }, (_, i) => ({
        id: `shift${i + 1}`,
        startTime: new Date(`2024-11-${11 + (i % 5)}T${9 + (i % 8)}:00:00Z`),
        endTime: new Date(`2024-11-${11 + (i % 5)}T${13 + (i % 8)}:00:00Z`),
        role: ['cashier', 'customer_service'][i % 2],
        locationId: `loc${(i % 3) + 1}`,
        requiredSkills: [['cashier'], ['customer_service']][i % 2],
        hourlyRate: 18 + (i % 5),
        Location: { id: `loc${(i % 3) + 1}`, name: `Store ${(i % 3) + 1}` }
      })),
      constraints: {
        maxHoursPerWeek: 40,
        fairnessWeight: 0.3
      }
    }
  },
  {
    name: 'Multi-Stage Problem (should use Universal Solver)',
    problem: {
      organizationId: 'test-org',
      employees: Array.from({ length: 15 }, (_, i) => ({
        id: `emp${i + 1}`,
        name: `Employee ${i + 1}`,
        skills: ['cashier', 'supervisor', 'inventory'][i % 3] ? ['cashier'] : i % 3 === 1 ? ['supervisor'] : ['inventory'],
        maxHoursPerWeek: 30 + (i % 15),
        preferredLocationId: `loc${(i % 4) + 1}`,
        Availability: [
          { dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '18:00' },
          { dayOfWeek: 'TUESDAY', startTime: '08:00', endTime: '18:00' },
          { dayOfWeek: 'WEDNESDAY', startTime: '08:00', endTime: '18:00' }
        ]
      })),
      shifts: Array.from({ length: 30 }, (_, i) => ({
        id: `shift${i + 1}`,
        startTime: new Date(`2024-11-${11 + (i % 3)}T${9 + (i % 6)}:00:00Z`),
        endTime: new Date(`2024-11-${11 + (i % 3)}T${13 + (i % 6)}:00:00Z`),
        role: ['cashier', 'supervisor', 'inventory'][i % 3],
        locationId: `loc${(i % 4) + 1}`,
        requiredSkills: [['cashier'], ['supervisor'], ['inventory']][i % 3],
        hourlyRate: 20 + (i % 8),
        Location: { id: `loc${(i % 4) + 1}`, name: `Location ${(i % 4) + 1}` }
      })),
      constraints: {
        maxHoursPerWeek: 40,
        fairnessWeight: 0.5,
        costOptimization: true
      }
    }
  }
];

async function testMultiSolver() {
  console.log('🚀 Testing Multi-Solver Scheduler...\n');

  const scheduler = new MultiSolverScheduler();

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`   ${testCase.problem.employees.length} employees, ${testCase.problem.shifts.length} shifts`);

    try {
      const startTime = Date.now();
      const solution = await scheduler.solve(testCase.problem);
      const totalTime = Date.now() - startTime;

      console.log(`   ✅ Solver: ${solution.solver.toUpperCase()}`);
      console.log(`   📊 Status: ${solution.status}`);
      console.log(`   ⏱️  Total Time: ${totalTime}ms (Solve: ${solution.solveTime}ms)`);
      console.log(`   📈 Coverage: ${(solution.metrics.coverageRate * 100).toFixed(1)}%`);
      console.log(`   🎯 Score: ${solution.metrics.totalScore}`);
      console.log(`   📝 ${solution.explanation}`);

      if (solution.assignments.length > 0) {
        console.log(`   🎉 Successfully assigned ${solution.assignments.length} shifts`);
      }

      if (solution.unassignable.length > 0) {
        console.log(`   ⚠️  ${solution.unassignable.length} unassignable shifts`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('');
  }
}

// Run the test
testMultiSolver().catch(console.error);
