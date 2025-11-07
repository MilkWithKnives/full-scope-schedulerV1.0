<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	// Common time slots for restaurant workers
	const timeSlots = [
		{ label: 'Early Morning', start: '06:00', end: '12:00' },
		{ label: 'Afternoon', start: '12:00', end: '18:00' },
		{ label: 'Evening', start: '18:00', end: '23:00' },
		{ label: 'Late Night', start: '23:00', end: '02:00' }
	];

	let adding = $state<{ dayOfWeek: number; slotIndex: number } | null>(null);
	let clearing = $state<number | null>(null);

	// Group availability by day
	const availabilityByDay = $derived.by(() => {
		const grouped: Record<number, typeof data.availability> = {};
		for (let i = 0; i < 7; i++) {
			grouped[i] = [];
		}
		data.availability.forEach(avail => {
			grouped[avail.dayOfWeek].push(avail);
		});
		return grouped;
	});

	// Check if a time slot is available
	function hasAvailability(dayOfWeek: number, startTime: string, endTime: string): boolean {
		return availabilityByDay[dayOfWeek].some(
			avail => avail.startTime === startTime && avail.endTime === endTime
		);
	}

	// Get availability ID for a slot
	function getAvailabilityId(dayOfWeek: number, startTime: string, endTime: string): string | null {
		const avail = availabilityByDay[dayOfWeek].find(
			a => a.startTime === startTime && a.endTime === endTime
		);
		return avail?.id || null;
	}

	// Toggle availability slot
	async function toggleSlot(dayOfWeek: number, slotIndex: number, startTime: string, endTime: string) {
		const hasIt = hasAvailability(dayOfWeek, startTime, endTime);

		if (hasIt) {
			// Remove availability
			const availabilityId = getAvailabilityId(dayOfWeek, startTime, endTime);
			if (!availabilityId) return;

			adding = { dayOfWeek, slotIndex };

			const formData = new FormData();
			formData.append('availabilityId', availabilityId);

			try {
				const response = await fetch('?/deleteAvailability', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					toast.success('Availability removed');
					window.location.reload();
				} else {
					toast.error('Failed to remove availability');
				}
			} catch (error) {
				console.error('Toggle error:', error);
				toast.error('Something went wrong');
			} finally {
				adding = null;
			}
		} else {
			// Add availability
			adding = { dayOfWeek, slotIndex };

			const formData = new FormData();
			formData.append('dayOfWeek', dayOfWeek.toString());
			formData.append('startTime', startTime);
			formData.append('endTime', endTime);

			try {
				const response = await fetch('?/setAvailability', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					toast.success('Availability added!');
					window.location.reload();
				} else {
					toast.error('Failed to add availability');
				}
			} catch (error) {
				console.error('Toggle error:', error);
				toast.error('Something went wrong');
			} finally {
				adding = null;
			}
		}
	}

	// Clear entire day
	async function clearDay(dayOfWeek: number) {
		if (availabilityByDay[dayOfWeek].length === 0) return;

		clearing = dayOfWeek;

		const formData = new FormData();
		formData.append('dayOfWeek', dayOfWeek.toString());

		try {
			const response = await fetch('?/clearDay', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Day cleared');
				window.location.reload();
			} else {
				toast.error('Failed to clear day');
			}
		} catch (error) {
			console.error('Clear error:', error);
			toast.error('Something went wrong');
		} finally {
			clearing = null;
		}
	}
</script>

<svelte:head>
	<title>My Availability - ShiftHappens</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-white">My Availability</h1>
		<p class="text-slate-600 dark:text-slate-400 mt-1">
			Let us know when you can work. Tap a time slot to toggle it.
		</p>
	</div>

	<!-- Info Card -->
	<div class="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
		<div class="flex items-start gap-3">
			<div class="text-xl">💡</div>
			<div class="flex-1 text-sm text-blue-900 dark:text-blue-100">
				<p class="font-medium mb-1">How it works</p>
				<p class="text-blue-800 dark:text-blue-200">
					Select the time slots when you're generally available. Your manager will see this when creating schedules. You can update this anytime.
				</p>
			</div>
		</div>
	</div>

	<!-- Weekly Grid -->
	<div class="card p-6">
		<div class="space-y-6">
			{#each daysOfWeek as day, dayIndex}
				{@const dayAvailability = availabilityByDay[dayIndex]}
				{@const hasAny = dayAvailability.length > 0}

				<div>
					<div class="flex items-center justify-between mb-3">
						<h3 class="font-bold text-lg text-slate-900 dark:text-white">
							{day}
						</h3>
						{#if hasAny}
							<button
								type="button"
								onclick={() => clearDay(dayIndex)}
								disabled={clearing === dayIndex}
								class="text-sm text-red-600 dark:text-red-400 hover:underline"
							>
								{clearing === dayIndex ? 'Clearing...' : 'Clear day'}
							</button>
						{/if}
					</div>

					<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
						{#each timeSlots as slot, slotIndex}
							{@const isAvailable = hasAvailability(dayIndex, slot.start, slot.end)}
							{@const isLoading = adding?.dayOfWeek === dayIndex && adding?.slotIndex === slotIndex}

							<button
								type="button"
								onclick={() => toggleSlot(dayIndex, slotIndex, slot.start, slot.end)}
								disabled={isLoading}
								class="p-3 rounded-lg border-2 transition-all text-left {isAvailable
									? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
									: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}"
							>
								<div class="font-medium text-sm text-slate-900 dark:text-white">
									{slot.label}
								</div>
								<div class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
									{slot.start} - {slot.end}
								</div>
								{#if isAvailable}
									<div class="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
										✓ Available
									</div>
								{/if}
								{#if isLoading}
									<div class="text-xs text-slate-500 mt-1">
										Updating...
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Summary Card -->
	{#if data.availability.length > 0}
		<div class="card p-6">
			<h3 class="font-bold text-slate-900 dark:text-white mb-3">Your Availability Summary</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#each daysOfWeek as day, dayIndex}
					{@const count = availabilityByDay[dayIndex].length}
					{#if count > 0}
						<div class="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
							<div class="text-2xl font-bold text-primary-500">{count}</div>
							<div class="text-xs text-slate-600 dark:text-slate-400">{day.slice(0, 3)}</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{:else}
		<div class="card p-12 text-center">
			<div class="text-5xl mb-4">📅</div>
			<h3 class="text-lg font-medium text-slate-900 dark:text-white mb-2">
				No availability set yet
			</h3>
			<p class="text-slate-600 dark:text-slate-400">
				Tap the time slots above to let your manager know when you can work
			</p>
		</div>
	{/if}
</div>
