<script lang="ts">
	import type { PageData } from './$types';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	// Handle date range selection
	function handleRangeChange(range: string) {
		goto(`/dashboard/reports?range=${range}`);
	}

	// Export to CSV function
	function exportToCSV() {
		const rows = [
			['Metric', 'Value'],
			['Total Scheduled Hours', data.metrics.totalScheduledHours],
			['Total Scheduled Cost', `$${data.metrics.totalScheduledCost}`],
			['Total Actual Hours', data.metrics.totalActualHours],
			['Total Actual Cost', `$${data.metrics.totalActualCost}`],
			['Total Shifts', data.metrics.totalShifts],
			['Unassigned Shifts', data.metrics.unassignedShifts],
			['Coverage Rate', `${data.metrics.coverageRate}%`],
			['Active Employees', data.metrics.activeEmployees],
			['Avg Hours per Employee', data.metrics.avgHoursPerEmployee],
			['Avg Cost per Shift', `$${data.metrics.avgCostPerShift}`],
			[''],
			['Location Breakdown', ''],
			['Location', 'Hours', 'Cost', 'Shifts'],
			...data.metrics.byLocation.map((loc: any) => [
				loc.name,
				loc.hours.toFixed(1),
				`$${loc.cost.toFixed(2)}`,
				loc.shifts
			]),
			[''],
			['Employee Breakdown', ''],
			['Employee', 'Hours', 'Cost', 'Shifts'],
			...data.metrics.byEmployee.map((emp: any) => [
				emp.name,
				emp.hours.toFixed(1),
				`$${emp.cost.toFixed(2)}`,
				emp.shifts
			])
		];

		const csvContent = rows.map((row) => row.join(',')).join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `report-${data.dateRange.type}-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}

	const rangeLabel = $derived.by(() => {
		switch (data.dateRange.type) {
			case 'week':
				return 'This Week';
			case 'last-week':
				return 'Last Week';
			case 'month':
				return 'This Month';
			default:
				return 'Custom Range';
		}
	});

	// Prepare chart data
	const locationChartData = $derived(
		data.metrics.byLocation.slice(0, 10).map((loc: any) => ({
			label: loc.name,
			value: loc.hours,
			subtitle: `$${loc.cost.toFixed(2)} • ${loc.shifts} shifts`,
			color: 'blue'
		}))
	);

	const employeeChartData = $derived(
		data.metrics.byEmployee.slice(0, 10).map((emp: any) => ({
			label: emp.name,
			value: emp.hours,
			subtitle: `$${emp.cost.toFixed(2)} • ${emp.shifts} shifts`,
			color: 'green'
		}))
	);
</script>

<svelte:head>
	<title>Reports - ShiftHappens</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
			<p class="text-slate-600 dark:text-slate-400 mt-1">
				Performance insights for {rangeLabel}
			</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Date Range Selector -->
			<select
				value={data.dateRange.type}
				onchange={(e) => handleRangeChange(e.currentTarget.value)}
				class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
			>
				<option value="week">This Week</option>
				<option value="last-week">Last Week</option>
				<option value="month">This Month</option>
			</select>

			<!-- Export Button -->
			<Button variant="secondary" onclick={exportToCSV}>
				📊 Export CSV
			</Button>
		</div>
	</div>

	<!-- Key Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<MetricCard
			label="Total Labor Cost"
			value="${data.metrics.totalScheduledCost.toLocaleString()}"
			icon="💰"
			change={data.metrics.costChange}
			trend="down"
			color="green"
			subtitle="Scheduled"
		/>
		<MetricCard
			label="Total Hours"
			value={data.metrics.totalScheduledHours.toLocaleString()}
			icon="⏰"
			change={data.metrics.hoursChange}
			color="blue"
			subtitle="Scheduled"
		/>
		<MetricCard
			label="Coverage Rate"
			value="{data.metrics.coverageRate}%"
			icon="✓"
			color="purple"
			subtitle="{data.metrics.totalShifts - data.metrics.unassignedShifts}/{data.metrics.totalShifts} shifts assigned"
		/>
		<MetricCard
			label="Active Employees"
			value={data.metrics.activeEmployees}
			icon="👥"
			color="orange"
			subtitle="{data.metrics.avgHoursPerEmployee.toFixed(1)} avg hrs/employee"
		/>
	</div>

	<!-- Actual vs Scheduled -->
	{#if data.metrics.completedTimeEntries > 0}
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
				Actual vs Scheduled Performance
			</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<div class="text-sm text-slate-600 dark:text-slate-400 mb-2">Hours</div>
					<div class="space-y-3">
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span class="text-slate-700 dark:text-slate-300">Scheduled</span>
								<span class="font-medium">{data.metrics.totalScheduledHours}h</span>
							</div>
							<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
								<div
									class="bg-blue-500 h-3 rounded-full"
									style="width: {(data.metrics.totalScheduledHours /
										Math.max(data.metrics.totalScheduledHours, data.metrics.totalActualHours)) *
										100}%"
								></div>
							</div>
						</div>
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span class="text-slate-700 dark:text-slate-300">Actual</span>
								<span class="font-medium">{data.metrics.totalActualHours}h</span>
							</div>
							<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
								<div
									class="bg-green-500 h-3 rounded-full"
									style="width: {(data.metrics.totalActualHours /
										Math.max(data.metrics.totalScheduledHours, data.metrics.totalActualHours)) *
										100}%"
								></div>
							</div>
						</div>
					</div>
				</div>

				<div>
					<div class="text-sm text-slate-600 dark:text-slate-400 mb-2">Labor Cost</div>
					<div class="space-y-3">
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span class="text-slate-700 dark:text-slate-300">Scheduled</span>
								<span class="font-medium">${data.metrics.totalScheduledCost.toFixed(2)}</span>
							</div>
							<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
								<div
									class="bg-blue-500 h-3 rounded-full"
									style="width: {(data.metrics.totalScheduledCost /
										Math.max(data.metrics.totalScheduledCost, data.metrics.totalActualCost)) *
										100}%"
								></div>
							</div>
						</div>
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span class="text-slate-700 dark:text-slate-300">Actual</span>
								<span class="font-medium">${data.metrics.totalActualCost.toFixed(2)}</span>
							</div>
							<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
								<div
									class="bg-green-500 h-3 rounded-full"
									style="width: {(data.metrics.totalActualCost /
										Math.max(data.metrics.totalScheduledCost, data.metrics.totalActualCost)) *
										100}%"
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
				<div class="text-sm text-slate-600 dark:text-slate-400">
					Based on {data.metrics.completedTimeEntries} completed time entries
				</div>
			</div>
		</div>
	{/if}

	<!-- Charts -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Labor by Location -->
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Hours by Location</h2>
			{#if locationChartData.length > 0}
				<BarChart data={locationChartData} />
			{:else}
				<div class="text-center py-8 text-slate-500">No location data available</div>
			{/if}
		</div>

		<!-- Hours by Employee -->
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Hours by Employee</h2>
			{#if employeeChartData.length > 0}
				<BarChart data={employeeChartData} />
			{:else}
				<div class="text-center py-8 text-slate-500">No employee data available</div>
			{/if}
		</div>
	</div>

	<!-- Detailed Tables -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Location Breakdown Table -->
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
				Location Breakdown
			</h2>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-slate-200 dark:border-slate-700">
							<th class="text-left py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Location
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Hours
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Cost
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Shifts
							</th>
						</tr>
					</thead>
					<tbody>
						{#each data.metrics.byLocation as location}
							<tr class="border-b border-slate-100 dark:border-slate-800">
								<td class="py-3 text-sm text-slate-900 dark:text-white">{location.name}</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									{location.hours.toFixed(1)}h
								</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									${location.cost.toFixed(2)}
								</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									{location.shifts}
								</td>
							</tr>
						{/each}
						{#if data.metrics.byLocation.length === 0}
							<tr>
								<td colspan="4" class="py-8 text-center text-sm text-slate-500">
									No data available
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Employee Breakdown Table -->
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
				Top Employees by Hours
			</h2>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-slate-200 dark:border-slate-700">
							<th class="text-left py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Employee
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Hours
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Cost
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Shifts
							</th>
						</tr>
					</thead>
					<tbody>
						{#each data.metrics.byEmployee.slice(0, 10) as employee}
							<tr class="border-b border-slate-100 dark:border-slate-800">
								<td class="py-3 text-sm text-slate-900 dark:text-white">{employee.name}</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									{employee.hours.toFixed(1)}h
								</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									${employee.cost.toFixed(2)}
								</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									{employee.shifts}
								</td>
							</tr>
						{/each}
						{#if data.metrics.byEmployee.length === 0}
							<tr>
								<td colspan="4" class="py-8 text-center text-sm text-slate-500">
									No data available
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Summary Stats -->
	<div class="card p-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div>
				<div class="text-sm text-primary-600 dark:text-primary-400">Total Shifts</div>
				<div class="text-2xl font-bold text-primary-900 dark:text-primary-100">
					{data.metrics.totalShifts}
				</div>
			</div>
			<div>
				<div class="text-sm text-primary-600 dark:text-primary-400">Unassigned</div>
				<div class="text-2xl font-bold text-primary-900 dark:text-primary-100">
					{data.metrics.unassignedShifts}
				</div>
			</div>
			<div>
				<div class="text-sm text-primary-600 dark:text-primary-400">Avg Cost/Shift</div>
				<div class="text-2xl font-bold text-primary-900 dark:text-primary-100">
					${data.metrics.avgCostPerShift.toFixed(2)}
				</div>
			</div>
			<div>
				<div class="text-sm text-primary-600 dark:text-primary-400">Time Entries</div>
				<div class="text-2xl font-bold text-primary-900 dark:text-primary-100">
					{data.metrics.completedTimeEntries}
				</div>
			</div>
		</div>
	</div>

	<!-- Future Projections Section -->
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold text-slate-900 dark:text-white">
				📊 4-Week Labor Cost Projections
			</h2>
			<span class="text-sm text-slate-600 dark:text-slate-400">Next 4 Weeks</span>
		</div>

		<!-- 4-Week Total -->
		<div class="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
			<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Projected Totals</h3>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div>
					<div class="text-sm text-slate-600 dark:text-slate-400">Projected Cost</div>
					<div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
						${data.projections.fourWeekTotal.totalCost.toFixed(2)}
					</div>
				</div>
				<div>
					<div class="text-sm text-slate-600 dark:text-slate-400">Total Hours</div>
					<div class="text-2xl font-bold text-slate-900 dark:text-white">
						{data.projections.fourWeekTotal.totalHours}h
					</div>
				</div>
				<div>
					<div class="text-sm text-slate-600 dark:text-slate-400">Scheduled Shifts</div>
					<div class="text-2xl font-bold text-slate-900 dark:text-white">
						{data.projections.fourWeekTotal.totalShifts}
					</div>
				</div>
				<div>
					<div class="text-sm text-slate-600 dark:text-slate-400">Coverage Rate</div>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">
						{data.projections.fourWeekTotal.coverageRate}%
					</div>
				</div>
			</div>
		</div>

		<!-- Weekly Breakdown -->
		<div class="card p-6">
			<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Weekly Breakdown</h3>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-slate-200 dark:border-slate-700">
							<th class="text-left py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Week
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Projected Cost
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Hours
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Shifts
							</th>
							<th class="text-right py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
								Coverage
							</th>
						</tr>
					</thead>
					<tbody>
						{#each data.projections.weekly as week}
							<tr class="border-b border-slate-100 dark:border-slate-800">
								<td class="py-3 text-sm text-slate-900 dark:text-white">
									Week {week.week}
								</td>
								<td class="py-3 text-sm text-right font-medium text-purple-600 dark:text-purple-400">
									${week.projectedCost.toFixed(2)}
								</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									{week.totalHours}h
								</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									{week.assignedShifts}/{week.totalShifts}
								</td>
								<td class="py-3 text-sm text-right text-slate-900 dark:text-white">
									<span class="px-2 py-1 rounded text-xs font-medium {week.coverageRate >= 80 ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : week.coverageRate >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}">
										{week.coverageRate}%
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
