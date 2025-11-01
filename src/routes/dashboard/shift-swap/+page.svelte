<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import { toast } from 'svelte-sonner';
	import { formatTime, formatDayOfWeek, formatDayNumber } from '$lib/utils/date';

	let { data }: { data: PageData } = $props();

	let selectedFromShift = $state<string | null>(null);
	let requesting = $state(false);
	let activeTab = $state<'available' | 'my-requests' | 'incoming'>('available');

	async function handleSwapRequest(toShiftId: string) {
		if (!selectedFromShift) {
			toast.error('Please select one of your shifts first');
			return;
		}

		requesting = true;

		const formData = new FormData();
		formData.append('fromShiftId', selectedFromShift);
		formData.append('toShiftId', toShiftId);

		try {
			const response = await fetch('?/requestSwap', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				if (result.data?.autoApproved) {
					toast.success('Swap approved instantly! ✨');
				} else {
					toast.success('Swap request sent!');
				}
				window.location.reload();
			} else {
				toast.error(result.error || 'Failed to request swap');
			}
		} catch (error) {
			console.error('Swap request error:', error);
			toast.error('Something went wrong');
		} finally {
			requesting = false;
		}
	}

	async function handleAcceptSwap(swapRequestId: string) {
		const formData = new FormData();
		formData.append('swapRequestId', swapRequestId);

		try {
			const response = await fetch('?/acceptSwap', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Swap accepted! 🎉');
				window.location.reload();
			} else {
				toast.error('Failed to accept swap');
			}
		} catch (error) {
			console.error('Accept swap error:', error);
			toast.error('Something went wrong');
		}
	}

	async function handleCancelSwap(swapRequestId: string) {
		const formData = new FormData();
		formData.append('swapRequestId', swapRequestId);

		try {
			const response = await fetch('?/cancelSwap', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Request cancelled');
				window.location.reload();
			} else {
				toast.error('Failed to cancel');
			}
		} catch (error) {
			console.error('Cancel swap error:', error);
			toast.error('Something went wrong');
		}
	}
</script>

<svelte:head>
	<title>Shift Swap - ShiftHappens</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Shift Swap</h1>
		<p class="text-slate-600 dark:text-slate-400 mt-1">
			Pick up shifts or swap with your teammates
		</p>
	</div>

	<!-- Info Banner -->
	<div class="card p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
		<div class="flex items-start gap-3">
			<div class="text-xl">⚡</div>
			<div class="flex-1 text-sm text-green-900 dark:text-green-100">
				<p class="font-medium mb-1">Auto-approval is on</p>
				<p class="text-green-800 dark:text-green-200">
					Swaps with no scheduling conflicts get approved instantly—no manager needed!
				</p>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
		<button
			type="button"
			onclick={() => (activeTab = 'available')}
			class="flex-1 px-4 py-2 rounded-md font-medium transition-all {activeTab === 'available'
				? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm'
				: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
		>
			Available Shifts ({data.availableShifts.length})
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'my-requests')}
			class="flex-1 px-4 py-2 rounded-md font-medium transition-all {activeTab === 'my-requests'
				? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm'
				: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
		>
			My Requests ({data.mySwapRequests.length})
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'incoming')}
			class="flex-1 px-4 py-2 rounded-md font-medium transition-all {activeTab === 'incoming'
				? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm'
				: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
		>
			Incoming ({data.incomingSwapRequests.length})
		</button>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'available'}
		<div class="space-y-6">
			<!-- Select your shift first -->
			{#if data.myUpcomingShifts.length > 0}
				<div class="card p-6">
					<h2 class="font-bold text-slate-900 dark:text-white mb-4">
						Step 1: Select the shift you want to give away
					</h2>
					<div class="grid gap-3">
						{#each data.myUpcomingShifts as shift}
							<button
								type="button"
								onclick={() => (selectedFromShift = shift.id)}
								class="p-4 rounded-lg border-2 text-left transition-all {selectedFromShift === shift.id
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}"
							>
								<div class="flex items-center justify-between">
									<div>
										<div class="font-medium text-slate-900 dark:text-white">
											{shift.location.name} • {shift.role}
										</div>
										<div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
											{formatDayOfWeek(new Date(shift.startTime))} {formatDayNumber(new Date(shift.startTime))} • {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
										</div>
									</div>
									{#if selectedFromShift === shift.id}
										<div class="text-primary-500 font-medium">✓ Selected</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="card p-12 text-center">
					<div class="text-5xl mb-4">📅</div>
					<h3 class="text-lg font-medium text-slate-900 dark:text-white mb-2">
						No upcoming shifts
					</h3>
					<p class="text-slate-600 dark:text-slate-400">
						You need a shift to give away before you can swap
					</p>
				</div>
			{/if}

			<!-- Available shifts to pick up -->
			<div class="card p-6">
				<h2 class="font-bold text-slate-900 dark:text-white mb-4">
					Step 2: Pick a shift to swap into
				</h2>

				{#if data.availableShifts.length === 0}
					<div class="text-center py-8">
						<div class="text-4xl mb-3">🤷</div>
						<p class="text-slate-600 dark:text-slate-400">
							No shifts available to swap right now
						</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.availableShifts as shift}
							<div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<div class="font-medium text-slate-900 dark:text-white">
											{shift.location.name} • {shift.role}
										</div>
										<div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
											{formatDayOfWeek(new Date(shift.startTime))} {formatDayNumber(new Date(shift.startTime))} • {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
										</div>
										<div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
											Currently: {shift.user?.name}
										</div>
									</div>
									<Button
										variant="primary"
										onclick={() => handleSwapRequest(shift.id)}
										disabled={!selectedFromShift || requesting}
										loading={requesting}
									>
										{selectedFromShift ? 'Request Swap' : 'Select your shift first'}
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else if activeTab === 'my-requests'}
		<div class="card p-6">
			<h2 class="font-bold text-slate-900 dark:text-white mb-4">My Swap Requests</h2>

			{#if data.mySwapRequests.length === 0}
				<div class="text-center py-8">
					<div class="text-4xl mb-3">✅</div>
					<p class="text-slate-600 dark:text-slate-400">No pending swap requests</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each data.mySwapRequests as request}
						<div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white mb-2">
										Swap Request
									</div>
									<div class="text-sm space-y-1">
										<div class="text-slate-600 dark:text-slate-400">
											<span class="font-medium">Giving away:</span>
											{request.fromShift.location.name} • {formatTime(request.fromShift.startTime)} - {formatTime(request.fromShift.endTime)}
										</div>
										<div class="text-slate-600 dark:text-slate-400">
											<span class="font-medium">Picking up:</span>
											{request.toShift?.location.name} • {formatTime(request.toShift.startTime)} - {formatTime(request.toShift.endTime)}
											{#if request.toShift?.user}
												<span class="text-xs">(from {request.toShift.user.name})</span>
											{/if}
										</div>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleCancelSwap(request.id)}
								>
									Cancel
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="card p-6">
			<h2 class="font-bold text-slate-900 dark:text-white mb-4">Incoming Requests</h2>

			{#if data.incomingSwapRequests.length === 0}
				<div class="text-center py-8">
					<div class="text-4xl mb-3">📭</div>
					<p class="text-slate-600 dark:text-slate-400">
						No one wants to swap with your shifts yet
					</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each data.incomingSwapRequests as request}
						<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white mb-2">
										{request.requestedBy.name} wants to swap
									</div>
									<div class="text-sm space-y-1">
										<div class="text-slate-600 dark:text-slate-400">
											<span class="font-medium">They're giving:</span>
											{request.fromShift.location.name} • {formatTime(request.fromShift.startTime)} - {formatTime(request.fromShift.endTime)}
										</div>
										<div class="text-slate-600 dark:text-slate-400">
											<span class="font-medium">For your:</span>
											{request.toShift.location.name} • {formatTime(request.toShift.startTime)} - {formatTime(request.toShift.endTime)}
										</div>
									</div>
								</div>
								<div class="flex gap-2">
									<Button
										variant="primary"
										size="sm"
										onclick={() => handleAcceptSwap(request.id)}
									>
										Accept
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
