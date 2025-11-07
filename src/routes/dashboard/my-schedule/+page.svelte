<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import { toast } from 'svelte-sonner';
	import { formatTime, formatDayOfWeek, formatDayNumber } from '$lib/utils/date';
	import { getCurrentPosition, isWithinGeofence, formatDistance, calculateDistance } from '$lib/utils/geolocation';
	import { differenceInMinutes, format } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let userLocation = $state<{ lat: number; lon: number } | null>(null);
	let locationError = $state<string | null>(null);
	let checkingLocation = $state(false);
	let clockingIn = $state(false);
	let clockingOut = $state(false);

	// Calculate elapsed time for active shift
	const elapsedTime = $derived.by(() => {
		if (!data.activeTimeEntry) return null;
		const now = new Date();
		const clockIn = new Date(data.activeTimeEntry.clockIn);
		const minutes = differenceInMinutes(now, clockIn);
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}h ${mins}m`;
	});

	// Check if user is near any of their shift locations
	async function checkUserLocation() {
		checkingLocation = true;
		locationError = null;

		try {
			const position = await getCurrentPosition();
			userLocation = {
				lat: position.latitude,
				lon: position.longitude
			};
			toast.success('Location detected');
		} catch (error: any) {
			locationError = error.message;
			toast.error(error.message);
		} finally {
			checkingLocation = false;
		}
	}

	// Check if user can clock in to a specific shift
	function canClockInToShift(shift: any) {
		if (!userLocation) return false;
		if (!shift.location.latitude || !shift.location.longitude) return false;

		return isWithinGeofence(
			userLocation.lat,
			userLocation.lon,
			shift.location.latitude,
			shift.location.longitude,
			250 // 250 meters
		);
	}

	// Get distance to shift location
	function getDistanceToShift(shift: any) {
		if (!userLocation || !shift.location.latitude || !shift.location.longitude) return null;

		const distance = calculateDistance(
			userLocation.lat,
			userLocation.lon,
			shift.location.latitude,
			shift.location.longitude
		);

		return formatDistance(distance);
	}

	// Clock in to a shift
	async function handleClockIn(shift: any) {
		if (!userLocation) {
			toast.error('Location not detected');
			return;
		}

		if (!canClockInToShift(shift)) {
			toast.error('You must be at the location to clock in');
			return;
		}

		clockingIn = true;

		try {
			const formData = new FormData();
			formData.append('locationId', shift.location.id);
			formData.append('shiftId', shift.id);
			formData.append('latitude', userLocation.lat.toString());
			formData.append('longitude', userLocation.lon.toString());

			const response = await fetch('?/clockIn', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Clocked in successfully! ⏰');
				// Reload page data
				window.location.reload();
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to clock in');
			}
		} catch (error) {
			console.error('Clock in error:', error);
			toast.error('Something went wrong');
		} finally {
			clockingIn = false;
		}
	}

	// Clock out
	async function handleClockOut() {
		clockingOut = true;

		try {
			const response = await fetch('?/clockOut', {
				method: 'POST'
			});

			if (response.ok) {
				toast.success('Clocked out! See you next time 👋');
				window.location.reload();
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to clock out');
			}
		} catch (error) {
			console.error('Clock out error:', error);
			toast.error('Something went wrong');
		} finally {
			clockingOut = false;
		}
	}

	// Drop shift
	let droppingShift = $state<string | null>(null);

	async function handleDropShift(shiftId: string) {
		if (!confirm('Are you sure you want to drop this shift? It will become available for other servers to claim.')) {
			return;
		}

		droppingShift = shiftId;

		try {
			const formData = new FormData();
			formData.append('shiftId', shiftId);

			const response = await fetch('?/dropShift', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				toast.success('Shift dropped and is now available for others');
				window.location.reload();
			} else {
				toast.error(result.error || 'Failed to drop shift');
			}
		} catch (error) {
			console.error('Drop shift error:', error);
			toast.error('Something went wrong');
		} finally {
			droppingShift = null;
		}
	}

	// Auto-check location on mount
	$effect(() => {
		checkUserLocation();
	});
</script>

<svelte:head>
	<title>My Schedule - ShiftHappens</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6 pb-24">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-white">My Schedule</h1>
		<p class="text-slate-600 dark:text-slate-400 mt-1">
			{format(new Date(), 'EEEE, MMMM d, yyyy')}
		</p>
	</div>

	<!-- Active Time Entry (Clocked In) -->
	{#if data.activeTimeEntry}
		<div class="card p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
			<div class="flex items-start justify-between mb-4">
				<div>
					<div class="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
						Currently Clocked In
					</div>
					<div class="text-2xl font-bold text-slate-900 dark:text-white">
						{data.activeTimeEntry.location.name}
					</div>
				</div>
				<div class="text-right">
					<div class="text-sm text-slate-600 dark:text-slate-400">Time Elapsed</div>
					<div class="text-xl font-bold text-green-600 dark:text-green-400">
						{elapsedTime}
					</div>
				</div>
			</div>

			<div class="text-sm text-slate-600 dark:text-slate-400 mb-4">
				Clocked in at {formatTime(data.activeTimeEntry.clockIn)}
			</div>

			<Button variant="danger" onclick={handleClockOut} loading={clockingOut} class="w-full">
				{clockingOut ? 'Clocking Out...' : 'Clock Out'}
			</Button>
		</div>
	{/if}

	<!-- Location Status -->
	<div class="card p-4 {userLocation ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="text-2xl">
					{userLocation ? '📍' : '📍'}
				</div>
				<div>
					<div class="font-medium text-slate-900 dark:text-white">
						{userLocation ? 'Location detected' : locationError || 'We need your location'}
					</div>
					<div class="text-sm text-slate-600 dark:text-slate-400">
						{userLocation ? 'Get near your shift to clock in' : "We use this to verify you're at work"}
					</div>
				</div>
			</div>
			{#if !userLocation}
				<Button variant="ghost" size="sm" onclick={checkUserLocation} loading={checkingLocation}>
					{checkingLocation ? 'Checking...' : 'Enable'}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Today's Shifts -->
	<div>
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Today</h2>

		{#if data.todayShifts.length === 0}
			<div class="card p-12 text-center">
				<div class="text-5xl mb-4">🎉</div>
				<h3 class="text-lg font-medium text-slate-900 dark:text-white mb-2">You're off today!</h3>
				<p class="text-slate-600 dark:text-slate-400">Enjoy your day off</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.todayShifts as shift}
					{@const nearLocation = canClockInToShift(shift)}
					{@const distance = getDistanceToShift(shift)}

					<div class="card-elevated p-5 {nearLocation ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-900/10' : ''} hover:scale-[1.01] transition-all">
						<div class="flex items-start justify-between mb-3">
							<div>
								<div class="font-bold text-lg text-slate-900 dark:text-white">
									{shift.location.name}
								</div>
								<div class="text-slate-600 dark:text-slate-400 text-sm">
									{shift.role}
								</div>
							</div>
							<div class="text-right">
								<div class="font-bold text-slate-900 dark:text-white">
									{formatTime(shift.startTime)} - {formatTime(shift.endTime)}
								</div>
								{#if distance}
									<div class="text-xs font-medium {nearLocation ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}">
										📍 {distance}
									</div>
								{/if}
							</div>
						</div>

						<div class="text-sm text-slate-600 dark:text-slate-400 mb-3">
							{shift.location.address}
						</div>

						{#if !data.activeTimeEntry}
							{#if nearLocation}
								<Button variant="primary" onclick={() => handleClockIn(shift)} loading={clockingIn} class="w-full">
									{clockingIn ? 'Clocking In...' : '⏰ Clock In Now'}
								</Button>
							{:else}
								<Button variant="ghost" disabled class="w-full">
									🚶 Get closer to clock in
								</Button>
							{/if}
						{/if}

						{#if shift.notes}
							<div class="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm">
								<div class="font-medium text-slate-700 dark:text-slate-300 mb-1">Notes:</div>
								<div class="text-slate-600 dark:text-slate-400">{shift.notes}</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Upcoming Shifts -->
	{#if data.upcomingShifts.length > data.todayShifts.length}
		<div>
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Coming Up</h2>
			<div class="space-y-2">
				{#each data.upcomingShifts.slice(data.todayShifts.length, data.todayShifts.length + 5) as shift}
					<div class="card p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3 flex-1">
								<div class="text-center">
									<div class="text-xs text-slate-500 dark:text-slate-400">
										{formatDayOfWeek(new Date(shift.startTime))}
									</div>
									<div class="text-lg font-bold text-slate-900 dark:text-white">
										{formatDayNumber(new Date(shift.startTime))}
									</div>
								</div>
								<div>
									<div class="font-medium text-slate-900 dark:text-white">
										{shift.Location.name}
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400">
										{formatTime(shift.startTime)} - {formatTime(shift.endTime)} • {shift.role}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div class="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
									{shift.status}
								</div>
								{#if new Date(shift.startTime) > new Date()}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleDropShift(shift.id)}
										loading={droppingShift === shift.id}
									>
										{droppingShift === shift.id ? 'Dropping...' : 'Drop'}
									</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
