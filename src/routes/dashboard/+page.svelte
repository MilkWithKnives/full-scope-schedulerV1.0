<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';

	let { data }: { data: PageData } = $props();

	const isAdmin = $derived(data.user.role === 'OWNER' || data.user.role === 'MANAGER');

	// Mock stats (in real app, this would come from server)
	const stats = [
		{ label: 'Upcoming Shifts', value: '12', icon: '📅', color: 'primary' },
		{ label: 'Team Members', value: '24', icon: '👥', color: 'blue' },
		{ label: 'Locations', value: '3', icon: '📍', color: 'green' },
		{ label: 'Hours This Week', value: '38', icon: '⏰', color: 'orange' }
	];
</script>

<div class="max-w-7xl mx-auto space-y-6">
	<!-- Welcome Header -->
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
			Hey {data.user.name.split(' ')[0]} 👋
		</h1>
		<p class="text-slate-600 dark:text-slate-400">
			{isAdmin ? "Here's how your team is doing" : "Your schedule at a glance"}
		</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each stats as stat}
			<div class="card p-6">
				<div class="flex items-center justify-between mb-2">
					<span class="text-2xl">{stat.icon}</span>
					<span
						class="text-3xl font-bold {stat.color === 'primary'
							? 'text-primary-500'
							: stat.color === 'blue'
								? 'text-blue-500'
								: stat.color === 'green'
									? 'text-green-500'
									: 'text-orange-500'}"
					>
						{stat.value}
					</span>
				</div>
				<div class="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
			</div>
		{/each}
	</div>

	<!-- Quick Actions -->
	<div class="card p-6">
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			{#if isAdmin}
				<Button variant="primary" class="w-full" onclick={() => window.location.href = '/dashboard/schedule'}>
					➕ Create Schedule
				</Button>
				<Button variant="secondary" class="w-full" onclick={() => window.location.href = '/dashboard/team'}>
					👤 Add Team Member
				</Button>
				<Button variant="secondary" class="w-full" onclick={() => window.location.href = '/dashboard/team'}>
					📍 Add Location
				</Button>
			{:else}
				<Button variant="primary" class="w-full" onclick={() => window.location.href = '/dashboard/my-schedule'}>
					📅 View My Schedule
				</Button>
				<Button variant="secondary" class="w-full" onclick={() => window.location.href = '/dashboard/availability'}>
					⏰ Update Availability
				</Button>
				<Button variant="ghost" class="w-full" onclick={() => window.location.href = '/dashboard/my-schedule'}>
					📊 View Time Reports
				</Button>
			{/if}
		</div>
	</div>

	<!-- Recent Activity / Upcoming Shifts -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Upcoming Shifts -->
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Upcoming Shifts</h2>
			<div class="space-y-3">
				{#each [1, 2, 3] as i}
					<div class="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
						<div class="text-center">
							<div class="text-xs text-slate-500 dark:text-slate-400">MON</div>
							<div class="text-xl font-bold text-slate-900 dark:text-white">15</div>
						</div>
						<div class="flex-1">
							<div class="font-medium text-slate-900 dark:text-white">Morning Shift</div>
							<div class="text-sm text-slate-600 dark:text-slate-400">
								9:00 AM - 5:00 PM • Downtown Location
							</div>
						</div>
						<div class="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded">
							Confirmed
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Team Activity (Admin only) or My Stats (Employee) -->
		{#if isAdmin}
			<div class="card p-6">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Team Activity</h2>
				<div class="space-y-3">
					<div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
						<div class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
							J
						</div>
						<div class="flex-1">
							<div class="font-medium text-slate-900 dark:text-white">John Doe</div>
							<div class="text-sm text-slate-600 dark:text-slate-400">
								Updated availability
							</div>
						</div>
						<div class="text-xs text-slate-500">2h ago</div>
					</div>

					<div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
						<div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
							S
						</div>
						<div class="flex-1">
							<div class="font-medium text-slate-900 dark:text-white">Sarah Smith</div>
							<div class="text-sm text-slate-600 dark:text-slate-400">
								Accepted shift swap request
							</div>
						</div>
						<div class="text-xs text-slate-500">4h ago</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="card p-6">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">My Statistics</h2>
				<div class="space-y-4">
					<div>
						<div class="flex justify-between mb-1">
							<span class="text-sm text-slate-600 dark:text-slate-400">Hours This Week</span>
							<span class="text-sm font-medium text-slate-900 dark:text-white">38 / 40</span>
						</div>
						<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
							<div class="bg-primary-500 h-2 rounded-full" style="width: 95%"></div>
						</div>
					</div>

					<div>
						<div class="flex justify-between mb-1">
							<span class="text-sm text-slate-600 dark:text-slate-400">Shifts This Month</span>
							<span class="text-sm font-medium text-slate-900 dark:text-white">18 / 20</span>
						</div>
						<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
							<div class="bg-green-500 h-2 rounded-full" style="width: 90%"></div>
						</div>
					</div>

					<div class="pt-4 border-t border-slate-200 dark:border-slate-700">
						<div class="text-sm text-slate-600 dark:text-slate-400 mb-2">Attendance Rate</div>
						<div class="text-3xl font-bold text-green-500">98%</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Info Banner -->
	<div class="card p-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
		<div class="flex items-start gap-4">
			<div class="text-2xl">💡</div>
			<div class="flex-1">
				<h3 class="font-semibold text-primary-900 dark:text-primary-100 mb-1">
					Phase 1: Foundation Complete! 🎉
				</h3>
				<p class="text-sm text-primary-800 dark:text-primary-200">
					Authentication and dashboard are set up. Scheduling features will be added in Phase 2.
				</p>
			</div>
		</div>
	</div>
</div>
