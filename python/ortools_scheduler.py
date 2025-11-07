#!/usr/bin/env python3
"""
OR-Tools Constraint Programming Scheduler for SvelteRoster
Handles complex scheduling optimization that the greedy algorithm can't solve optimally
"""

import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from ortools.sat.python import cp_model
import argparse

class SchedulingProblem:
    def __init__(self, data: Dict[str, Any]):
        self.employees = data['employees']
        self.shifts = data['shifts']
        self.constraints = data.get('constraints', {})
        self.organization_id = data['organizationId']

class SchedulingSolver:
    def __init__(self, problem: SchedulingProblem):
        self.problem = problem
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.variables = {}
        self.solution_assignments = []
        
    def solve(self) -> Dict[str, Any]:
        """Main solving method"""
        try:
            # Build the constraint model
            self._create_variables()
            self._add_constraints()
            self._set_objective()
            
            # Solve the model
            start_time = datetime.now()
            status = self.solver.Solve(self.model)
            solve_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Extract solution
            if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
                assignments = self._extract_assignments()
                return {
                    'status': 'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE',
                    'assignments': assignments,
                    'unassignable': [],
                    'solveTime': solve_time,
                    'explanation': f'OR-Tools found {"optimal" if status == cp_model.OPTIMAL else "feasible"} solution with {len(assignments)} assignments',
                    'metrics': self._calculate_metrics(assignments)
                }
            else:
                return {
                    'status': 'INFEASIBLE',
                    'assignments': [],
                    'unassignable': [{'shiftId': shift['id'], 'reasons': ['No feasible assignment found']} for shift in self.problem.shifts],
                    'solveTime': solve_time,
                    'explanation': 'No feasible solution exists with current constraints',
                    'metrics': {'totalScore': 0, 'fairnessScore': 0, 'costEfficiency': 0, 'coverageRate': 0}
                }
                
        except Exception as e:
            return {
                'status': 'ERROR',
                'assignments': [],
                'unassignable': [],
                'solveTime': 0,
                'explanation': f'Solver error: {str(e)}',
                'metrics': {'totalScore': 0, 'fairnessScore': 0, 'costEfficiency': 0, 'coverageRate': 0}
            }
    
    def _create_variables(self):
        """Create binary variables: x[i][j] = 1 if employee i is assigned to shift j"""
        for i, employee in enumerate(self.problem.employees):
            for j, shift in enumerate(self.problem.shifts):
                var_name = f'x_{i}_{j}'
                self.variables[var_name] = self.model.NewBoolVar(var_name)
    
    def _add_constraints(self):
        """Add all scheduling constraints"""
        # Constraint 1: Each shift must be assigned to exactly one employee
        for j, shift in enumerate(self.problem.shifts):
            shift_vars = [self.variables[f'x_{i}_{j}'] for i in range(len(self.problem.employees))]
            self.model.Add(sum(shift_vars) == 1)
        
        # Constraint 2: Employee availability
        for i, employee in enumerate(self.problem.employees):
            for j, shift in enumerate(self.problem.shifts):
                if not self._is_employee_available(employee, shift):
                    self.model.Add(self.variables[f'x_{i}_{j}'] == 0)
        
        # Constraint 3: Maximum hours per week per employee
        for i, employee in enumerate(self.problem.employees):
            max_hours = employee.get('maxHoursPerWeek', 40)
            hour_vars = []
            for j, shift in enumerate(self.problem.shifts):
                hours = self._calculate_shift_hours(shift)
                hour_vars.append(self.variables[f'x_{i}_{j}'] * hours)
            self.model.Add(sum(hour_vars) <= max_hours)
        
        # Constraint 4: No overlapping shifts for same employee
        for i in range(len(self.problem.employees)):
            for j1 in range(len(self.problem.shifts)):
                for j2 in range(j1 + 1, len(self.problem.shifts)):
                    if self._shifts_overlap(self.problem.shifts[j1], self.problem.shifts[j2]):
                        self.model.Add(self.variables[f'x_{i}_{j1}'] + self.variables[f'x_{i}_{j2}'] <= 1)
        
        # Constraint 5: Skills matching
        for i, employee in enumerate(self.problem.employees):
            for j, shift in enumerate(self.problem.shifts):
                if not self._employee_has_required_skills(employee, shift):
                    self.model.Add(self.variables[f'x_{i}_{j}'] == 0)
    
    def _set_objective(self):
        """Set optimization objective - maximize total assignment score"""
        objective_terms = []
        for i, employee in enumerate(self.problem.employees):
            for j, shift in enumerate(self.problem.shifts):
                score = self._calculate_assignment_score(employee, shift)
                if score > 0:
                    objective_terms.append(self.variables[f'x_{i}_{j}'] * score)
        
        if objective_terms:
            self.model.Maximize(sum(objective_terms))
    
    def _extract_assignments(self) -> List[Dict[str, Any]]:
        """Extract shift assignments from the solution"""
        assignments = []
        for i, employee in enumerate(self.problem.employees):
            for j, shift in enumerate(self.problem.shifts):
                if self.solver.Value(self.variables[f'x_{i}_{j}']) == 1:
                    assignments.append({
                        'shiftId': shift['id'],
                        'employeeId': employee['id'],
                        'score': self._calculate_assignment_score(employee, shift),
                        'reasons': ['Optimal assignment by OR-Tools'],
                        'warnings': []
                    })
        return assignments
    
    def _is_employee_available(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee is available for the shift"""
        availability = employee.get('Availability', [])
        shift_start = datetime.fromisoformat(shift['startTime'].replace('Z', '+00:00'))
        shift_day = shift_start.strftime('%A').upper()

        for avail in availability:
            if avail['dayOfWeek'] == shift_day:
                avail_start = datetime.strptime(avail['startTime'], '%H:%M').time()
                avail_end = datetime.strptime(avail['endTime'], '%H:%M').time()
                shift_start_time = shift_start.time()
                shift_end_time = datetime.fromisoformat(shift['endTime'].replace('Z', '+00:00')).time()

                if avail_start <= shift_start_time and shift_end_time <= avail_end:
                    return True
        return False
    
    def _calculate_shift_hours(self, shift: Dict) -> int:
        """Calculate shift duration in hours"""
        start = datetime.fromisoformat(shift['startTime'].replace('Z', '+00:00'))
        end = datetime.fromisoformat(shift['endTime'].replace('Z', '+00:00'))
        return int((end - start).total_seconds() / 3600)
    
    def _shifts_overlap(self, shift1: Dict, shift2: Dict) -> bool:
        """Check if two shifts overlap in time"""
        start1 = datetime.fromisoformat(shift1['startTime'].replace('Z', '+00:00'))
        end1 = datetime.fromisoformat(shift1['endTime'].replace('Z', '+00:00'))
        start2 = datetime.fromisoformat(shift2['startTime'].replace('Z', '+00:00'))
        end2 = datetime.fromisoformat(shift2['endTime'].replace('Z', '+00:00'))
        
        return start1 < end2 and start2 < end1
    
    def _employee_has_required_skills(self, employee: Dict, shift: Dict) -> bool:
        """Check if employee has required skills for the shift"""
        employee_skills = set(employee.get('skills', []))
        required_skills = set(shift.get('requiredSkills', []))
        return required_skills.issubset(employee_skills)
    
    def _calculate_assignment_score(self, employee: Dict, shift: Dict) -> int:
        """Calculate assignment score (simplified version)"""
        base_score = 50
        
        # Bonus for preferred location
        if employee.get('preferredLocationId') == shift.get('locationId'):
            base_score += 20
        
        # Bonus for matching skills
        employee_skills = set(employee.get('skills', []))
        required_skills = set(shift.get('requiredSkills', []))
        if required_skills.issubset(employee_skills):
            base_score += 15
        
        # Penalty for high hourly rate (cost optimization)
        if shift.get('hourlyRate', 0) > 25:
            base_score -= 10
        
        return max(0, base_score)
    
    def _calculate_metrics(self, assignments: List[Dict]) -> Dict[str, float]:
        """Calculate solution metrics"""
        total_score = sum(a['score'] for a in assignments)
        coverage_rate = len(assignments) / len(self.problem.shifts) if self.problem.shifts else 0
        
        return {
            'totalScore': total_score,
            'fairnessScore': 0.8,  # TODO: Calculate actual fairness
            'costEfficiency': 0.7,  # TODO: Calculate actual cost efficiency
            'coverageRate': coverage_rate
        }

def main():
    parser = argparse.ArgumentParser(description='OR-Tools Scheduler for SvelteRoster')
    parser.add_argument('--input', required=True, help='Input JSON file with scheduling problem')
    parser.add_argument('--output', help='Output JSON file for solution (default: stdout)')
    
    args = parser.parse_args()
    
    try:
        # Read input
        with open(args.input, 'r') as f:
            data = json.load(f)
        
        # Solve problem
        problem = SchedulingProblem(data)
        solver = SchedulingSolver(problem)
        solution = solver.solve()
        
        # Write output
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(solution, f, indent=2)
        else:
            print(json.dumps(solution, indent=2))
            
    except Exception as e:
        error_response = {
            'status': 'ERROR',
            'assignments': [],
            'unassignable': [],
            'solveTime': 0,
            'explanation': f'Script error: {str(e)}',
            'metrics': {'totalScore': 0, 'fairnessScore': 0, 'costEfficiency': 0, 'coverageRate': 0}
        }
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(error_response, f, indent=2)
        else:
            print(json.dumps(error_response, indent=2))
        
        sys.exit(1)

if __name__ == '__main__':
    main()
