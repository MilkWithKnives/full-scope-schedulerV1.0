<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import { toast } from 'svelte-sonner';
	import { format, formatDistanceToNow, differenceInHours } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let pickingUp = $state<string | null>(null);

	function calculateDuration(start: Date, end: Date, breakMinutes: number = 30): number {
		const hours = differenceInHours(new Date(end), new Date(start));
		return hours - breakMinutes / 60;
	}

	function isTimeConflict(shiftStart: Date, shiftEnd: Date): boolean {
		return data.myShifts.some((myShift) => {
			const myStart = new Date(myShift.startTime);
			const myEnd = new Date(myShift.endTime);
			const checkStart = new Date(shiftStart);
			const checkEnd = new Date(shiftEnd);

			return (
				(checkStart >= myStart && checkStart < myEnd) ||
				(checkEnd > myStart && checkEnd <= myEnd) ||
				(checkStart <= myStart && checkEnd >= myEnd)
			);
		});
	}

	async function handlePickup(shiftId: string) {
		pickingUp = shiftId;

		const formData = new FormData();
		formData.append('shiftId', shiftId);

		try {
			const response = await fetch('?/pickupShift', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				toast.success('Shift claimed successfully!');
				window.location.reload();
			} else {
				toast.error(result.error || 'Failed to claim shift');
			}
		} catch (error) {
			console.error('Pickup error:', error);
			toast.error('Something went wrong');
		} finally {
			pickingUp = null;
		}
	}

	function getStatusColor(hasConflict: boolean): string {
		return hasConflict
			? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
			: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
	}

	// Group shifts by date
	const shiftsByDate = $derived.by(() => {
		const groups = new Map<string, typeof data.availableShifts>();

		data.availableShifts.forEach((shift) => {
			const dateKey = format(new Date(shift.startTime), 'yyyy-MM-dd');
			if (!groups.has(dateKey)) {
				groups.set(dateKey, []);
			}
			groups.get(dateKey)!.push(shift);
		});

		return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	});
</script>

<svelte:head>
	<title>Available Shifts - Roster86</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Available Shifts</h1>
			<p class="text-slate-600 dark:text-slate-400 mt-1">
				Pick up open shifts that need coverage
			</p>
		</div>
		<div class="text-right">
			<div class="text-sm text-slate-600 dark:text-slate-400">Available</div>
			<div class="text-2xl font-bold text-green-600 dark:text-green-400">
				{data.availableShifts.length}
			</div>
		</div>
	</div>

	<!-- Shifts List -->
	{#if data.availableShifts.length === 0}
		<div class="card p-12 text-center">
			<div class="text-5xl mb-4">✨</div>
			<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
				No available shifts
			</h3>
			<p class="text-slate-600 dark:text-slate-400">
				Check back later for shifts that need coverage
			</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each shiftsByDate as [dateStr, shifts]}
				<div>
					<h2 class="text-lg font-bold text-slate-900 dark:text-white mb-3">
						{format(new Date(dateStr), 'EEEE, MMMM d, yyyy')}
					</h2>

					<div class="space-y-3">
						{#each shifts as shift}
							{@const hasConflict = isTimeConflict(shift.startTime, shift.endTime)}
							{@const duration = calculateDuration(shift.startTime, shift.endTime, shift.breakMinutes)}

							<div class="card p-6">
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1">
										<!-- Time and Location -->
										<div class="flex items-center gap-4 mb-3">
											<div>
												<div class="text-2xl font-bold text-slate-900 dark:text-white">
													{format(new Date(shift.startTime), 'h:mm a')} - {format(new Date(shift.endTime), 'h:mm a')}
												</div>
												<div class="text-sm text-slate-600 dark:text-slate-400">
													{duration.toFixed(1)} hours
													{#if shift.breakMinutes > 0}
														<span class="text-slate-400">({shift.breakMinutes}min break)</span>
													{/if}
												</div>
											</div>

											<div class="flex-1">
												<div class="font-medium text-slate-900 dark:text-white">
													{shift.Location.name}
												</div>
												<div class="text-sm text-slate-500 dark:text-slate-400">
													{shift.Location.address}
												</div>
											</div>
										</div>

										<!-- Role and Pay -->
										<div class="flex items-center gap-6 mb-3">
											<div>
												<div class="text-xs text-slate-500 dark:text-slate-400">Role</div>
												<div class="font-medium text-slate-900 dark:text-white">{shift.role}</div>
											</div>

											{#if shift.hourlyRate}
												<div>
													<div class="text-xs text-slate-500 dark:text-slate-400">Rate</div>
													<div class="font-medium text-green-600 dark:text-green-400">
														${shift.hourlyRate.toFixed(2)}/hr
													</div>
												</div>

												<div>
													<div class="text-xs text-slate-500 dark:text-slate-400">Est. Pay</div>
													<div class="font-medium text-green-600 dark:text-green-400">
														${(shift.hourlyRate * duration).toFixed(2)}
													</div>
												</div>
											{/if}
										</div>

										{#if shift.notes}
											<div class="text-sm text-slate-600 dark:text-slate-400 italic mb-3">
												{shift.notes}
											</div>
										{/if}

										<!-- Status Badge -->
										<div class="flex items-center gap-2">
											{#if hasConflict}
												<span class="px-2 py-1 text-xs font-medium rounded border {getStatusColor(true)}">
													Time Conflict
												</span>
											{:else}
												<span class="px-2 py-1 text-xs font-medium rounded border {getStatusColor(false)}">
													Available
												</span>
											{/if}

											<span class="text-xs text-slate-500 dark:text-slate-400">
												Posted {formatDistanceToNow(new Date(shift.createdAt), { addSuffix: true })}
											</span>
										</div>
									</div>

									<!-- Action -->
									<div class="flex-shrink-0">
										<Button
											variant={hasConflict ? 'ghost' : 'primary'}
											disabled={hasConflict || pickingUp === shift.id}
											loading={pickingUp === shift.id}
											onclick={() => handlePickup(shift.id)}
										>
											{#if hasConflict}
												Conflict
											{:else if pickingUp === shift.id}
												Claiming...
											{:else}
												Claim Shift
											{/if}
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
