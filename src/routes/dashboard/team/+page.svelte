<script lang="ts">
	import type { PageData } from './$types';
	import { formatTime, formatDayOfWeek, formatDayNumber } from '$lib/utils/date';
	import { eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
	import Button from '$lib/components/Button.svelte';
	import EmployeeModal from '$lib/components/EmployeeModal.svelte';

	let { data }: { data: PageData } = $props();

	let showEmployeeModal = $state(false);
	let selectedEmployee = $state<any | null>(null);

	function handleAddEmployee() {
		selectedEmployee = null;
		showEmployeeModal = true;
	}

	function handleEditEmployee(employee: any) {
		selectedEmployee = employee;
		showEmployeeModal = true;
	}

	const weekDays = $derived(
		eachDayOfInterval({
			start: new Date(data.weekStart),
			end: new Date(data.weekEnd)
		})
	);

	// Group shifts by day
	const shiftsByDay = $derived.by(() => {
		const grouped: Record<string, typeof data.shifts> = {};

		weekDays.forEach((day) => {
			const dayKey = day.toISOString().split('T')[0];
			grouped[dayKey] = data.shifts.filter((shift) =>
				isSameDay(new Date(shift.startTime), day)
			);
		});

		return grouped;
	});

	// Get initials for avatar
	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Get color based on index
	function getAvatarColor(index: number): string {
		const colors = [
			'bg-primary-500',
			'bg-blue-500',
			'bg-green-500',
			'bg-yellow-500',
			'bg-purple-500',
			'bg-pink-500',
			'bg-indigo-500'
		];
		return colors[index % colors.length];
	}

	function getRoleBadgeColor(role: string): string {
		switch (role) {
			case 'OWNER':
				return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
			case 'MANAGER':
				return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
			default:
				return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
		}
	}
</script>

<svelte:head>
	<title>Team - ShiftHappens</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Team</h1>
			<p class="text-slate-600 dark:text-slate-400 mt-1">
				Manage your team members
			</p>
		</div>
		{#if data.session?.user?.role === 'OWNER' || data.session?.user?.role === 'MANAGER'}
			<Button variant="primary" onclick={handleAddEmployee}>
				➕ Invite Team Member
			</Button>
		{/if}
	</div>

	<!-- Who's Working Right Now -->
	{#if data.activeClockIns.length > 0}
		<div class="card p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
			<div class="flex items-center gap-2 mb-4">
				<div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
				<h2 class="text-xl font-bold text-slate-900 dark:text-white">
					Working Right Now ({data.activeClockIns.length})
				</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				{#each data.activeClockIns as clockIn}
					<div class="p-4 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-700">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
								{getInitials(clockIn.user.name)}
							</div>
							<div class="flex-1">
								<div class="font-medium text-slate-900 dark:text-white">
									{clockIn.user.name}
								</div>
								<div class="text-sm text-slate-600 dark:text-slate-400">
									{clockIn.location.name} • Clocked in at {formatTime(clockIn.clockIn)}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Team Members -->
	<div class="card p-6">
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
			Everyone ({data.teamMembers.length})
		</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.teamMembers as member, index}
				<button
					type="button"
					onclick={() => handleEditEmployee(member)}
					class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left w-full"
				>
					<div class="flex items-center gap-3">
						<div class="{getAvatarColor(index)} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg">
							{getInitials(member.name)}
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-medium text-slate-900 dark:text-white truncate">
								{member.name}
							</div>
							<div class="text-sm text-slate-600 dark:text-slate-400 truncate">
								{member.email}
							</div>
						</div>
						<div class="px-2 py-1 text-xs font-medium rounded {getRoleBadgeColor(member.role)}">
							{member.role.toLowerCase()}
						</div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- This Week's Schedule -->
	<div class="card p-6">
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">This Week's Schedule</h2>

		<div class="space-y-6">
			{#each weekDays as day}
				{@const dayKey = day.toISOString().split('T')[0]}
				{@const dayShifts = shiftsByDay[dayKey] || []}
				{@const isToday = isSameDay(day, new Date())}

				<div class="{isToday ? 'ring-2 ring-primary-500 rounded-lg p-4' : ''}">
					<div class="flex items-center gap-3 mb-3">
						<div class="text-center min-w-[60px]">
							<div class="text-xs text-slate-500 dark:text-slate-400 uppercase">
								{formatDayOfWeek(day)}
							</div>
							<div class="text-2xl font-bold text-slate-900 dark:text-white">
								{formatDayNumber(day)}
							</div>
						</div>
						{#if isToday}
							<div class="px-2 py-1 bg-primary-500 text-white text-xs font-medium rounded">
								Today
							</div>
						{/if}
						<div class="text-sm text-slate-600 dark:text-slate-400">
							{dayShifts.length} {dayShifts.length === 1 ? 'shift' : 'shifts'}
						</div>
					</div>

					{#if dayShifts.length === 0}
						<div class="text-sm text-slate-500 dark:text-slate-400 italic pl-[76px]">
							No shifts scheduled
						</div>
					{:else}
						<div class="space-y-2 pl-[76px]">
							{#each dayShifts as shift}
								<div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
									<div class="flex items-center justify-between gap-4">
										<div class="flex items-center gap-3">
											<div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
												{shift.user ? getInitials(shift.user.name) : '?'}
											</div>
											<div>
												<div class="font-medium text-slate-900 dark:text-white">
													{shift.user?.name || 'Unassigned'}
												</div>
												<div class="text-sm text-slate-600 dark:text-slate-400">
													{shift.location.name} • {shift.role}
												</div>
											</div>
										</div>
										<div class="text-sm font-medium text-slate-900 dark:text-white">
											{formatTime(shift.startTime)} - {formatTime(shift.endTime)}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Employee Modal -->
<EmployeeModal
	bind:open={showEmployeeModal}
	onClose={() => {
		showEmployeeModal = false;
		selectedEmployee = null;
	}}
	locations={data.locations}
	employee={selectedEmployee}
/>
