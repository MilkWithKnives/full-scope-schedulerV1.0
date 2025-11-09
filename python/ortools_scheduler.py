#!/usr/bin/env python3
"""
Advanced OR-Tools Constraint Programming Scheduler for SvelteRoster
Implements sophisticated restaurant scheduling with all realistic constraints:
- Employee availability, skills, and preferences
- Shift coverage requirements and labor rules
- Daily/weekly hour caps and rest time requirements
- Fairness distribution and cost optimization
"""

import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass
from ortools.sat.python import cp_model
import argparse

# ----------------------------------------------------------------------
# Enhanced Data Structures
# ----------------------------------------------------------------------

@dataclass
class Employee:
    id: str
    name: str
    skills: Set[str]
    availability: List[Tuple[datetime, datetime]]
    max_daily_hours: float = 8.0
    max_weekly_hours: float = 40.0
    max_consecutive_days: int = 5
    min_rest_hours: int = 12
    preferences: Dict[str, int] = None  # shift_id → penalty (lower = preferred)
    hourly_rate: float = 15.0
    preferred_location_id: str = None

@dataclass
class Shift:
    id: str
    role: str  # required skill
    location_id: str
    start: datetime
    end: datetime
    required_count: int = 1
    required_skills: Set[str] = None
    penalty_factor: int = 1  # for night/weekend shifts

    @property
    def length_hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0

    @property
    def is_night_shift(self) -> bool:
        return self.start.hour >= 20 or self.end.hour <= 6

class SchedulingProblem:
    def __init__(self, data: Dict[str, Any]):
        self.raw_data = data
        self.employees = self._parse_employees(data['employees'])
        self.shifts = self._parse_shifts(data['shifts'])
        self.constraints = data.get('constraints', {})
        self.organization_id = data['organizationId']

    def _parse_employees(self, emp_data: List[Dict]) -> List[Employee]:
        """Convert raw employee data to Employee objects"""
        employees = []
        for emp in emp_data:
            # Parse availability windows
            availability = []
            for avail in emp.get('Availability', []):
                # Convert day + time to datetime windows
                day_name = avail['dayOfWeek']
                start_time = datetime.strptime(avail['startTime'], '%H:%M').time()
                end_time = datetime.strptime(avail['endTime'], '%H:%M').time()

                # For now, use a sample week - in real implementation,
                # you'd generate for the actual scheduling period
                base_date = datetime(2025, 11, 10)  # Sunday
                day_offset = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY',
                             'THURSDAY', 'FRIDAY', 'SATURDAY'].index(day_name)

                avail_date = base_date + timedelta(days=day_offset)
                start_dt = datetime.combine(avail_date.date(), start_time)
                end_dt = datetime.combine(avail_date.date(), end_time)

                # Make timezone-aware to match shift times
                from datetime import timezone
                start_dt = start_dt.replace(tzinfo=timezone.utc)
                end_dt = end_dt.replace(tzinfo=timezone.utc)
                availability.append((start_dt, end_dt))

            employees.append(Employee(
                id=emp['id'],
                name=emp['name'],
                skills=set(emp.get('skills', [])),
                availability=availability,
                max_daily_hours=emp.get('maxHoursPerWeek', 40) / 5,  # rough daily estimate
                max_weekly_hours=emp.get('maxHoursPerWeek', 40),
                max_consecutive_days=emp.get('maxConsecutiveDays', 5),
                min_rest_hours=emp.get('minRestHours', 12),
                preferences=emp.get('preferences', {}),
                hourly_rate=emp.get('defaultHourlyRate', 15.0),
                preferred_location_id=emp.get('preferredLocationId')
            ))
        return employees

    def _parse_shifts(self, shift_data: List[Dict]) -> List[Shift]:
        """Convert raw shift data to Shift objects"""
        shifts = []
        for shift in shift_data:
            start_dt = datetime.fromisoformat(shift['startTime'].replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(shift['endTime'].replace('Z', '+00:00'))

            shifts.append(Shift(
                id=shift['id'],
                role=shift.get('role', 'general'),
                location_id=shift.get('locationId', ''),
                start=start_dt,
                end=end_dt,
                required_count=shift.get('requiredCount', 1),
                required_skills=set(shift.get('requiredSkills', [])),
                penalty_factor=2 if start_dt.hour >= 20 or start_dt.weekday() >= 5 else 1
            ))
        return shifts

# ----------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------

def overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    """True if two time intervals intersect"""
    return max(a_start, b_start) < min(a_end, b_end)

def employee_can_work(employee: Employee, shift: Shift) -> bool:
    """Check if employee can work the shift (availability + skills)"""
    # Check skills
    if shift.required_skills and not shift.required_skills.issubset(employee.skills):
        return False
    if shift.role not in employee.skills and shift.role != 'general':
        return False

    # Check availability
    for avail_start, avail_end in employee.availability:
        if shift.start >= avail_start and shift.end <= avail_end:
            return True
    return False

class AdvancedSchedulingSolver:
    def __init__(self, problem: SchedulingProblem):
        self.problem = problem
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.x = {}  # Decision variables: x[emp_id, shift_id] = 1 if assigned
        self.worked_on_day = {}  # Helper variables for consecutive day constraints

    def solve(self) -> Dict[str, Any]:
        """Advanced constraint-based scheduling with all restaurant rules"""
        try:
            print("🚀 Starting advanced OR-Tools scheduling...")

            # Build the constraint model
            self._create_variables()
            self._add_coverage_constraints()
            self._add_availability_constraints()
            self._add_hour_limit_constraints()
            self._add_rest_time_constraints()
            self._add_consecutive_day_constraints()
            self._add_skill_constraints()
            self._set_preference_objective()

            # Configure solver
            self.solver.parameters.max_time_in_seconds = 30.0
            self.solver.parameters.num_search_workers = 4

            # Solve the model
            start_time = datetime.now()
            status = self.solver.Solve(self.model)
            solve_time = (datetime.now() - start_time).total_seconds() * 1000

            print(f"⏱️  Solve time: {solve_time:.1f}ms")

            # Extract solution
            if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
                assignments = self._extract_assignments()
                metrics = self._calculate_advanced_metrics(assignments)

                return {
                    'status': 'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE',
                    'assignments': assignments,
                    'unassignable': self._find_unassignable_shifts(assignments),
                    'solveTime': solve_time,
                    'explanation': self._generate_solution_explanation(assignments, metrics),
                    'metrics': metrics
                }
            else:
                unassignable = [{'shiftId': shift.id, 'reasons': ['No feasible assignment found']}
                               for shift in self.problem.shifts]
                return {
                    'status': 'INFEASIBLE',
                    'assignments': [],
                    'unassignable': unassignable,
                    'solveTime': solve_time,
                    'explanation': 'No feasible solution exists with current constraints. Try relaxing some constraints.',
                    'metrics': {'totalScore': 0, 'fairnessScore': 0, 'costEfficiency': 0, 'coverageRate': 0}
                }

        except Exception as e:
            print(f"❌ Solver error: {str(e)}")
            return {
                'status': 'ERROR',
                'assignments': [],
                'unassignable': [],
                'solveTime': 0,
                'explanation': f'Solver error: {str(e)}',
                'metrics': {'totalScore': 0, 'fairnessScore': 0, 'costEfficiency': 0, 'coverageRate': 0}
            }

    def _create_variables(self):
        """Create decision variables: x[emp_id, shift_id] = 1 if employee assigned to shift"""
        print(f"📊 Creating variables for {len(self.problem.employees)} employees and {len(self.problem.shifts)} shifts...")

        for employee in self.problem.employees:
            for shift in self.problem.shifts:
                if employee_can_work(employee, shift):
                    var_name = f'x_{employee.id}_{shift.id}'
                    self.x[(employee.id, shift.id)] = self.model.NewBoolVar(var_name)

        print(f"✅ Created {len(self.x)} feasible assignment variables")

    def _add_coverage_constraints(self):
        """Each shift must have exactly the required number of staff"""
        print("🎯 Adding coverage constraints...")

        for shift in self.problem.shifts:
            eligible_vars = [self.x[(emp.id, shift.id)]
                           for emp in self.problem.employees
                           if (emp.id, shift.id) in self.x]

            if eligible_vars:
                self.model.Add(sum(eligible_vars) == shift.required_count)
            else:
                print(f"⚠️  Warning: No eligible employees for shift {shift.id}")

    def _add_availability_constraints(self):
        """Employees can only work when available"""
        print("📅 Adding availability constraints...")
        # Already handled in _create_variables by only creating variables for feasible assignments
        pass

    def _add_skill_constraints(self):
        """Employees must have required skills"""
        print("🎓 Adding skill constraints...")
        # Already handled in employee_can_work function
        pass

    def _add_hour_limit_constraints(self):
        """Add daily and weekly hour limits per employee"""
        print("⏰ Adding hour limit constraints...")

        # Group shifts by calendar day
        shifts_by_day = {}
        for shift in self.problem.shifts:
            day = shift.start.date()
            shifts_by_day.setdefault(day, []).append(shift)

        for employee in self.problem.employees:
            # Daily hour limits
            for day, day_shifts in shifts_by_day.items():
                day_vars = []
                for shift in day_shifts:
                    if (employee.id, shift.id) in self.x:
                        # Scale by 100 to work with integers (OR-Tools requirement)
                        hours_scaled = int(shift.length_hours * 100)
                        day_vars.append(self.x[(employee.id, shift.id)] * hours_scaled)

                if day_vars:
                    max_daily_scaled = int(employee.max_daily_hours * 100)
                    self.model.Add(sum(day_vars) <= max_daily_scaled)

            # Weekly hour limits (simplified - use all shifts in the period)
            week_vars = []
            for shift in self.problem.shifts:
                if (employee.id, shift.id) in self.x:
                    hours_scaled = int(shift.length_hours * 100)
                    week_vars.append(self.x[(employee.id, shift.id)] * hours_scaled)

            if week_vars:
                max_weekly_scaled = int(employee.max_weekly_hours * 100)
                self.model.Add(sum(week_vars) <= max_weekly_scaled)

    def _add_rest_time_constraints(self):
        """Ensure minimum rest time between shifts for same employee"""
        print("😴 Adding rest time constraints...")

        for employee in self.problem.employees:
            for shift1 in self.problem.shifts:
                for shift2 in self.problem.shifts:
                    if shift1.id >= shift2.id:  # Avoid duplicate checks
                        continue

                    if ((employee.id, shift1.id) not in self.x or
                        (employee.id, shift2.id) not in self.x):
                        continue

                    # Check if shifts are too close together
                    rest_needed = timedelta(hours=employee.min_rest_hours)
                    if (shift1.end + rest_needed > shift2.start and
                        shift2.end + rest_needed > shift1.start):
                        # Cannot assign both shifts to same employee
                        self.model.Add(self.x[(employee.id, shift1.id)] +
                                     self.x[(employee.id, shift2.id)] <= 1)

    def _add_consecutive_day_constraints(self):
        """Limit consecutive working days per employee"""
        print("📆 Adding consecutive day constraints...")

        # Group shifts by day and create "worked on day" variables
        shifts_by_day = {}
        for shift in self.problem.shifts:
            day = shift.start.date()
            shifts_by_day.setdefault(day, []).append(shift)

        for employee in self.problem.employees:
            # Create binary variable for each day: worked_on_day[emp_id, day]
            worked_vars = {}
            for day, day_shifts in shifts_by_day.items():
                day_var = self.model.NewBoolVar(f'worked_{employee.id}_{day}')
                worked_vars[day] = day_var

                # worked_on_day = 1 if employee works any shift that day
                day_assignment_vars = [self.x[(employee.id, shift.id)]
                                     for shift in day_shifts
                                     if (employee.id, shift.id) in self.x]

                if day_assignment_vars:
                    # worked_on_day >= any individual shift assignment
                    for var in day_assignment_vars:
                        self.model.Add(day_var >= var)
                    # worked_on_day <= sum of all assignments (could be multiple shifts per day)
                    self.model.Add(day_var <= sum(day_assignment_vars))

            # Consecutive day sliding window constraint
            days_sorted = sorted(worked_vars.keys())
            max_consecutive = employee.max_consecutive_days

            for i in range(len(days_sorted) - max_consecutive):
                window_days = days_sorted[i:i + max_consecutive + 1]
                window_vars = [worked_vars[day] for day in window_days]
                self.model.Add(sum(window_vars) <= max_consecutive)

    def _set_preference_objective(self):
        """Set objective to minimize total penalty (maximize preferences)"""
        print("🎯 Setting preference-based objective...")

        penalty_terms = []
        for (emp_id, shift_id), var in self.x.items():
            employee = next(e for e in self.problem.employees if e.id == emp_id)
            shift = next(s for s in self.problem.shifts if s.id == shift_id)

            # Base penalty
            penalty = shift.penalty_factor * (10 if shift.is_night_shift else 1)

            # Employee-specific preferences
            if employee.preferences and shift_id in employee.preferences:
                penalty += employee.preferences[shift_id]

            # Location preference bonus (negative penalty)
            if employee.preferred_location_id == shift.location_id:
                penalty -= 15

            # Cost optimization (higher rate = higher penalty)
            if employee.hourly_rate > 20:
                penalty += int((employee.hourly_rate - 20) * 2)

            penalty_terms.append(var * penalty)

        if penalty_terms:
            self.model.Minimize(sum(penalty_terms))

    def _extract_assignments(self) -> List[Dict[str, Any]]:
        """Extract shift assignments from the solution"""
        assignments = []
        for (emp_id, shift_id), var in self.x.items():
            if self.solver.Value(var) == 1:
                employee = next(e for e in self.problem.employees if e.id == emp_id)
                shift = next(s for s in self.problem.shifts if s.id == shift_id)

                score = self._calculate_assignment_score(employee, shift)
                reasons = ['Optimal assignment by advanced OR-Tools solver']
                warnings = []

                # Add specific reasons
                if employee.preferred_location_id == shift.location_id:
                    reasons.append('Matches preferred location')
                if shift.is_night_shift:
                    warnings.append('Night shift assignment')
                if employee.hourly_rate > 25:
                    warnings.append('High-cost employee')

                assignments.append({
                    'shiftId': shift_id,
                    'employeeId': emp_id,
                    'score': score,
                    'reasons': reasons,
                    'warnings': warnings
                })
        return assignments

    def _find_unassignable_shifts(self, assignments: List[Dict]) -> List[Dict]:
        """Find shifts that couldn't be assigned"""
        assigned_shift_ids = {a['shiftId'] for a in assignments}
        unassignable = []

        for shift in self.problem.shifts:
            if shift.id not in assigned_shift_ids:
                reasons = []
                eligible_count = sum(1 for emp in self.problem.employees
                                   if employee_can_work(emp, shift))

                if eligible_count == 0:
                    reasons.append('No employees available or qualified')
                else:
                    reasons.append('Conflicts with other constraints')

                unassignable.append({
                    'shiftId': shift.id,
                    'reasons': reasons
                })

        return unassignable

    def _calculate_assignment_score(self, employee: Employee, shift: Shift) -> int:
        """Calculate assignment score for metrics"""
        base_score = 50

        # Location preference bonus
        if employee.preferred_location_id == shift.location_id:
            base_score += 20

        # Skill match bonus
        if shift.required_skills and shift.required_skills.issubset(employee.skills):
            base_score += 15

        # Cost penalty for expensive employees
        if employee.hourly_rate > 25:
            base_score -= int((employee.hourly_rate - 25) * 2)

        # Night shift penalty
        if shift.is_night_shift:
            base_score -= 10

        return max(0, base_score)

    def _calculate_advanced_metrics(self, assignments: List[Dict]) -> Dict[str, float]:
        """Calculate comprehensive solution metrics"""
        if not assignments:
            return {'totalScore': 0, 'fairnessScore': 0, 'costEfficiency': 0, 'coverageRate': 0}

        total_score = sum(a['score'] for a in assignments)
        coverage_rate = len(assignments) / len(self.problem.shifts)

        # Calculate fairness (distribution of shifts per employee)
        emp_shift_counts = {}
        total_cost = 0
        night_shift_distribution = {}

        for assignment in assignments:
            emp_id = assignment['employeeId']
            emp_shift_counts[emp_id] = emp_shift_counts.get(emp_id, 0) + 1

            # Calculate cost
            employee = next(e for e in self.problem.employees if e.id == emp_id)
            shift = next(s for s in self.problem.shifts if s.id == assignment['shiftId'])
            total_cost += employee.hourly_rate * shift.length_hours

            # Track night shift distribution
            if shift.is_night_shift:
                night_shift_distribution[emp_id] = night_shift_distribution.get(emp_id, 0) + 1

        # Fairness score (lower variance = more fair)
        if len(emp_shift_counts) > 1:
            shift_counts = list(emp_shift_counts.values())
            mean_shifts = sum(shift_counts) / len(shift_counts)
            variance = sum((x - mean_shifts) ** 2 for x in shift_counts) / len(shift_counts)
            fairness_score = max(0, 1 - (variance / mean_shifts)) if mean_shifts > 0 else 1
        else:
            fairness_score = 1.0

        # Cost efficiency (lower cost per hour = better)
        total_hours = sum(s.length_hours for s in self.problem.shifts if any(a['shiftId'] == s.id for a in assignments))
        avg_cost_per_hour = total_cost / total_hours if total_hours > 0 else 0
        cost_efficiency = max(0, 1 - (avg_cost_per_hour - 15) / 20)  # Normalize around $15/hour

        return {
            'totalScore': total_score,
            'fairnessScore': round(fairness_score, 3),
            'costEfficiency': round(cost_efficiency, 3),
            'coverageRate': round(coverage_rate, 3),
            'totalCost': round(total_cost, 2),
            'avgCostPerHour': round(avg_cost_per_hour, 2),
            'employeesUsed': len(emp_shift_counts),
            'nightShiftsAssigned': sum(night_shift_distribution.values())
        }

    def _generate_solution_explanation(self, assignments: List[Dict], metrics: Dict) -> str:
        """Generate human-readable explanation of the solution"""
        explanation_parts = [
            f"✅ Successfully assigned {len(assignments)} out of {len(self.problem.shifts)} shifts",
            f"📊 Coverage rate: {metrics['coverageRate']:.1%}",
            f"⚖️ Fairness score: {metrics['fairnessScore']:.2f}/1.0",
            f"💰 Cost efficiency: {metrics['costEfficiency']:.2f}/1.0",
            f"👥 Using {metrics.get('employeesUsed', 0)} employees"
        ]

        if metrics.get('nightShiftsAssigned', 0) > 0:
            explanation_parts.append(f"🌙 {metrics['nightShiftsAssigned']} night shifts distributed")

        return " | ".join(explanation_parts)

def main():
    parser = argparse.ArgumentParser(description='Advanced OR-Tools Scheduler for SvelteRoster')
    parser.add_argument('--input', required=True, help='Input JSON file with scheduling problem')
    parser.add_argument('--output', help='Output JSON file for solution (default: stdout)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose output')

    args = parser.parse_args()

    try:
        # Read input
        with open(args.input, 'r') as f:
            data = json.load(f)

        if args.verbose:
            print(f"📋 Loaded problem with {len(data['employees'])} employees and {len(data['shifts'])} shifts")

        # Solve problem with advanced solver
        problem = SchedulingProblem(data)
        solver = AdvancedSchedulingSolver(problem)
        solution = solver.solve()

        if args.verbose:
            print(f"🎯 Solution status: {solution['status']}")
            print(f"📊 {solution['explanation']}")

        # Write output
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(solution, f, indent=2)
            if args.verbose:
                print(f"💾 Solution saved to {args.output}")
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

        if args.verbose:
            print(f"❌ Error: {str(e)}")

        if args.output:
            with open(args.output, 'w') as f:
                json.dump(error_response, f, indent=2)
        else:
            print(json.dumps(error_response, indent=2))

        sys.exit(1)

# Example usage and testing
def create_sample_problem():
    """Create a sample scheduling problem for testing"""
    return {
        "organizationId": "test-org",
        "employees": [
            {
                "id": "emp1",
                "name": "Alice Chef",
                "skills": ["chef", "linecook"],
                "maxHoursPerWeek": 40,
                "defaultHourlyRate": 22.0,
                "preferredLocationId": "loc1",
                "Availability": [
                    {"dayOfWeek": "MONDAY", "startTime": "06:00", "endTime": "14:00"},
                    {"dayOfWeek": "TUESDAY", "startTime": "06:00", "endTime": "14:00"},
                    {"dayOfWeek": "WEDNESDAY", "startTime": "12:00", "endTime": "20:00"}
                ]
            },
            {
                "id": "emp2",
                "name": "Bob Server",
                "skills": ["server", "host"],
                "maxHoursPerWeek": 35,
                "defaultHourlyRate": 18.0,
                "preferredLocationId": "loc1",
                "Availability": [
                    {"dayOfWeek": "MONDAY", "startTime": "10:00", "endTime": "22:00"},
                    {"dayOfWeek": "TUESDAY", "startTime": "10:00", "endTime": "22:00"},
                    {"dayOfWeek": "WEDNESDAY", "startTime": "10:00", "endTime": "22:00"}
                ]
            }
        ],
        "shifts": [
            {
                "id": "shift1",
                "locationId": "loc1",
                "startTime": "2025-11-11T08:00:00Z",  # Monday
                "endTime": "2025-11-11T12:00:00Z",
                "role": "chef",
                "requiredSkills": ["chef"]
            },
            {
                "id": "shift2",
                "locationId": "loc1",
                "startTime": "2025-11-11T12:00:00Z",  # Monday
                "endTime": "2025-11-11T18:00:00Z",
                "role": "server",
                "requiredSkills": ["server"]
            }
        ]
    }

if __name__ == '__main__':
    # If no arguments provided, run with sample data
    if len(sys.argv) == 1:
        print("🧪 Running with sample data...")
        sample_data = create_sample_problem()
        problem = SchedulingProblem(sample_data)
        solver = AdvancedSchedulingSolver(problem)
        solution = solver.solve()
        print(json.dumps(solution, indent=2))
    else:
        main()

if __name__ == '__main__':
    main()
