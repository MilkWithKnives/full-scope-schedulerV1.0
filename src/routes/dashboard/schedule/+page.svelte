<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import ShiftModal from '$lib/components/ShiftModal.svelte';
	import AutoScheduleModal from '$lib/components/AutoScheduleModal.svelte';
	import BulkActionsModal from '$lib/components/BulkActionsModal.svelte';
	import { toast } from 'svelte-sonner';
	import {
		getWeekDays,
		formatWeekRange,
		nextWeek,
		previousWeek,
		isToday,
		formatDayOfWeek,
		formatDayNumber,
		formatTime,
		calculateShiftHours,
		calculateLaborCost
	} from '$lib/utils/date';

	let { data }: { data: PageData } = $props();

	let currentWeekStart = $state(new Date(data.weekStart));
	let selectedLocation = $state<string | null>(data.locations[0]?.id || null);
	let showShiftModal = $state(false);
	let showAutoScheduleModal = $state(false);
	let showBulkActionsModal = $state(false);
	let selectedDate = $state<Date | null>(null);
	let selectedShift = $state<any | null>(null);
	let selectionMode = $state(false);
	let selectedShiftIds = $state<Set<string>>(new Set());

	// Calculate week days
	const weekDays = $derived(getWeekDays(currentWeekStart));
	const weekRange = $derived(formatWeekRange(currentWeekStart));

	// Filter shifts by selected location
	const filteredShifts = $derived(
		data.shifts.filter((shift) => !selectedLocation || shift.location.id === selectedLocation)
	);

	// Group shifts by date
	const shiftsByDate = $derived(() => {
		const grouped = new Map();
		weekDays.forEach((day) => {
			const dayKey = day.toISOString().split('T')[0];
			grouped.set(dayKey, []);
		});

		filteredShifts.forEach((shift) => {
			const shiftDate = new Date(shift.startTime);
			const dayKey = shiftDate.toISOString().split('T')[0];
			if (grouped.has(dayKey)) {
				grouped.get(dayKey).push(shift);
			}
		});

		return grouped;
	});

	// Calculate total labor cost for the week
	const weeklyLaborCost = $derived(() => {
		let total = 0;
		filteredShifts.forEach((shift) => {
			const hours = calculateShiftHours(shift.startTime, shift.endTime, shift.breakMinutes);
			const rate = shift.hourlyRate || shift.user?.defaultHourlyRate || 15;
			total += calculateLaborCost(hours, rate);
		});
		return total;
	});

	// Calculate total hours for the week
	const weeklyHours = $derived(() => {
		let total = 0;
		filteredShifts.forEach((shift) => {
			total += calculateShiftHours(shift.startTime, shift.endTime, shift.breakMinutes);
		});
		return total;
	});

	function handlePreviousWeek() {
		currentWeekStart = previousWeek(currentWeekStart);
		// TODO: Fetch new week's data
		toast.info('Loading previous week...');
	}

	function handleNextWeek() {
		currentWeekStart = nextWeek(currentWeekStart);
		// TODO: Fetch new week's data
		toast.info('Loading next week...');
	}

	function handleDayClick(day: Date) {
		selectedDate = day;
		selectedShift = null;
		showShiftModal = true;
	}

	function handleShiftClick(shift: any) {
		selectedShift = shift;
		selectedDate = null;
		showShiftModal = true;
	}

	function getShiftColor(shift: any) {
		// Color code by status
		if (shift.status === 'PUBLISHED') return 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800';
		if (shift.status === 'CONFIRMED') return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800';
		if (shift.status === 'CANCELLED') return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800';
		return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'; // DRAFT
	}

	function toggleShiftSelection(shiftId: string) {
		if (selectedShiftIds.has(shiftId)) {
			selectedShiftIds.delete(shiftId);
		} else {
			selectedShiftIds.add(shiftId);
		}
		selectedShiftIds = new Set(selectedShiftIds); // Trigger reactivity
	}

	function toggleSelectionMode() {
		selectionMode = !selectionMode;
		if (!selectionMode) {
			selectedShiftIds = new Set();
		}
	}

	function selectAllShifts() {
		selectedShiftIds = new Set(filteredShifts.map((shift) => shift.id));
	}

	function deselectAllShifts() {
		selectedShiftIds = new Set();
	}

	const selectedShifts = $derived(
		filteredShifts.filter((shift) => selectedShiftIds.has(shift.id))
	);
</script>

<svelte:head>
	<title>Schedule - ShiftHappens</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Schedule</h1>
			<p class="text-slate-600 dark:text-slate-400 mt-1">{weekRange}</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Location Filter -->
			{#if data.locations.length > 1}
				<select
					bind:value={selectedLocation}
					class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
				>
					<option value={null}>All Locations</option>
					{#each data.locations as location}
						<option value={location.id}>{location.name}</option>
					{/each}
				</select>
			{/if}

			<Button variant="ghost" onclick={toggleSelectionMode}>
				{selectionMode ? '✕ Cancel' : '☑️ Select'}
			</Button>
			<Button variant="secondary" onclick={() => (showAutoScheduleModal = true)}>
				🤖 Auto-Schedule
			</Button>
			<Button variant="primary" onclick={() => (showShiftModal = true)}>
				➕ Add Shift
			</Button>
		</div>
	</div>

	<!-- Selection Mode Bar -->
	{#if selectionMode}
		<div class="card p-4 bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<span class="font-medium text-slate-900 dark:text-white">
						{selectedShiftIds.size} shift{selectedShiftIds.size !== 1 ? 's' : ''} selected
					</span>
					{#if selectedShiftIds.size < filteredShifts.length}
						<button
							type="button"
							onclick={selectAllShifts}
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
						>
							Select All ({filteredShifts.length})
						</button>
					{:else}
						<button
							type="button"
							onclick={deselectAllShifts}
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
						>
							Deselect All
						</button>
					{/if}
				</div>
				{#if selectedShiftIds.size > 0}
					<Button variant="primary" onclick={() => (showBulkActionsModal = true)}>
						⚡ Bulk Actions
					</Button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Week Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="card p-4">
			<div class="text-sm text-slate-600 dark:text-slate-400">Total Hours</div>
			<div class="text-2xl font-bold text-slate-900 dark:text-white">{weeklyHours().toFixed(1)}h</div>
		</div>
		<div class="card p-4">
			<div class="text-sm text-slate-600 dark:text-slate-400">Labor Cost</div>
			<div class="text-2xl font-bold text-green-600 dark:text-green-400">${weeklyLaborCost().toFixed(2)}</div>
		</div>
		<div class="card p-4">
			<div class="text-sm text-slate-600 dark:text-slate-400">Total Shifts</div>
			<div class="text-2xl font-bold text-slate-900 dark:text-white">{filteredShifts.length}</div>
		</div>
	</div>

	<!-- Week Navigation -->
	<div class="flex items-center justify-center gap-4">
		<Button variant="ghost" onclick={handlePreviousWeek}>
			← Previous
		</Button>
		<Button variant="ghost" onclick={() => (currentWeekStart = new Date())}>
			Today
		</Button>
		<Button variant="ghost" onclick={handleNextWeek}>
			Next →
		</Button>
	</div>

	<!-- Schedule Grid -->
	<div class="card overflow-hidden">
		<div class="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
			{#each weekDays as day}
				{@const dayKey = day.toISOString().split('T')[0]}
				{@const dayShifts = shiftsByDate().get(dayKey) || []}
				{@const today = isToday(day)}

				<div
					class="bg-white dark:bg-slate-800 min-h-[200px] {today ? 'ring-2 ring-primary-500' : ''}"
					role="button"
					tabindex="0"
					onclick={() => handleDayClick(day)}
				>
					<!-- Day Header -->
					<div class="p-3 border-b border-slate-200 dark:border-slate-700 {today ? 'bg-primary-50 dark:bg-primary-900/20' : ''}">
						<div class="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
							{formatDayOfWeek(day)}
						</div>
						<div class="text-lg font-bold text-slate-900 dark:text-white">
							{formatDayNumber(day)}
						</div>
					</div>

					<!-- Shifts for this day -->
					<div class="p-2 space-y-2">
						{#each dayShifts as shift}
							<button
								type="button"
								class="w-full text-left p-2 rounded border {getShiftColor(shift)} hover:shadow-md transition-shadow relative"
								onclick={(e) => {
									e.stopPropagation();
									if (selectionMode) {
										toggleShiftSelection(shift.id);
									} else {
										handleShiftClick(shift);
									}
								}}
							>
								{#if selectionMode}
									<div class="absolute top-1 right-1">
										<input
											type="checkbox"
											checked={selectedShiftIds.has(shift.id)}
											onchange={() => toggleShiftSelection(shift.id)}
											class="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
											onclick={(e) => e.stopPropagation()}
										/>
									</div>
								{/if}
								<div class="text-xs font-medium text-slate-900 dark:text-white">
									{formatTime(shift.startTime)} - {formatTime(shift.endTime)}
								</div>
								<div class="text-xs text-slate-600 dark:text-slate-400 truncate">
									{shift.user?.name || 'Unassigned'}
								</div>
								<div class="text-xs text-slate-500 dark:text-slate-500">
									{shift.role}
								</div>
							</button>
						{/each}

						{#if dayShifts.length === 0}
							<div class="text-center py-8 text-slate-400 dark:text-slate-600 text-sm">
								No shifts
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Empty State -->
	{#if filteredShifts.length === 0}
		<div class="card p-12 text-center">
			<div class="text-5xl mb-4">📅</div>
			<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">No shifts scheduled yet</h3>
			<p class="text-slate-600 dark:text-slate-400 mb-6">
				Get started by adding your first shift to the schedule
			</p>
			<Button variant="primary" onclick={() => (showShiftModal = true)}>
				➕ Create First Shift
			</Button>
		</div>
	{/if}
</div>

<!-- Shift Creation/Edit Modal -->
<ShiftModal
	bind:open={showShiftModal}
	onClose={() => {
		showShiftModal = false;
		selectedDate = null;
		selectedShift = null;
	}}
	locations={data.locations}
	users={data.users}
	{selectedDate}
	shift={selectedShift}
/>

<!-- Auto-Schedule Modal -->
<AutoScheduleModal
	bind:open={showAutoScheduleModal}
	onClose={() => (showAutoScheduleModal = false)}
	weekStart={data.weekStart}
	shifts={data.shifts}
	employees={data.users}
/>

<!-- Bulk Actions Modal -->
<BulkActionsModal
	bind:open={showBulkActionsModal}
	onClose={() => {
		showBulkActionsModal = false;
	}}
	selectedShifts={selectedShifts}
	users={data.users}
/>
