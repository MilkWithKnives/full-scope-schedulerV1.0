<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let ScheduleXCalendarClient: any = $state(null);
	let mounted = $state(false);
	import Button from '$lib/components/Button.svelte';
	import ShiftModal from '$lib/components/ShiftModal.svelte';
	import AutoScheduleModal from '$lib/components/AutoScheduleModal.svelte';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { CalendarDays, Users, Clock, TrendingUp, Plus, Filter, Settings } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// State
	let showShiftModal = $state(false);
	let showAutoScheduleModal = $state(false);
	let selectedShift: any | null = $state(null);
	let selectedDate: Date | null = $state(null);
	let selectedLocation: string | null = $state(data.locations[0]?.id || null);

	// Dynamically import the calendar component on client-side only
	onMount(async () => {
		if (browser) {
			const module = await import('$lib/components/ScheduleXCalendarClient.svelte');
			ScheduleXCalendarClient = module.default;
			mounted = true;
		}
	});

	// Convert shifts to Schedule-X event format
	function convertShiftsToEvents(shifts: any[]) {
		return shifts
			.filter((shift) => !selectedLocation || (shift.location && shift.location.id === selectedLocation))
			.map((shift) => {
				const start = new Date(shift.startTime);
				const end = new Date(shift.endTime);

				// Get color based on shift status
				let colorScheme = 'default';
				if (shift.status === 'PUBLISHED') colorScheme = 'primary';
				else if (shift.status === 'CONFIRMED') colorScheme = 'success';
				else if (shift.status === 'CANCELLED') colorScheme = 'danger';

				// Convert to Temporal.ZonedDateTime (required by Schedule-X for timed events)
				const toTemporal = (date: Date) => {
					const year = date.getFullYear();
					const month = String(date.getMonth() + 1).padStart(2, '0');
					const day = String(date.getDate()).padStart(2, '0');
					const hour = String(date.getHours()).padStart(2, '0');
					const minute = String(date.getMinutes()).padStart(2, '0');
					const second = String(date.getSeconds()).padStart(2, '0');
					const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00[America/New_York]`;
					return Temporal.ZonedDateTime.from(isoString);
				};

				return {
					id: shift.id,
					title: `${shift.role}${shift.user ? ` - ${shift.user.name}` : ' (Unassigned)'}`,
					start: toTemporal(start),
					end: toTemporal(end),
					calendarId: colorScheme,
					description: shift.notes || '',
					_shift: shift // Store original shift data
				};
			});
	}

	// Derived calendar events that update when location filter changes
	const calendarEvents = $derived(convertShiftsToEvents(data.shifts));
	// Event handlers for the calendar
	function handleEventClick(calendarEvent: any) {
		const shift = data.shifts.find((s) => s.id === calendarEvent.id);
		if (shift) {
			selectedShift = shift;
			selectedDate = null;
			showShiftModal = true;
		}
	}

	function handleClickDateTime(dateTime: string) {
		const [datePart, timePart] = dateTime.split(' ');
		selectedDate = new Date(`${datePart}T${timePart}`);
		selectedShift = null;
		showShiftModal = true;
	}

	async function handleEventUpdate(updatedEvent: any) {
		try {
			console.log('🔄 handleEventUpdate called with:', updatedEvent);
			console.log('🔍 Looking for shift with ID:', updatedEvent.id);
			console.log('📋 Available shift IDs:', data.shifts.map(s => s.id));

			const shift = data.shifts.find((s) => s.id === updatedEvent.id);
			console.log('✅ Found existing shift:', !!shift, shift?.id);

			const [startDate, startTime] = updatedEvent.start.split(' ');
			const [endDate, endTime] = updatedEvent.end.split(' ');

			const formData = new FormData();

			if (shift) {
				// Update existing shift
				formData.append('shiftId', shift.id);
				formData.append('locationId', shift.location.id);
				formData.append('userId', shift.userId || '');
				formData.append('role', shift.role);
				formData.append('date', startDate);
				formData.append('startTime', startTime);
				formData.append('endTime', endTime);
				formData.append('breakMinutes', shift.breakMinutes.toString());
				formData.append('notes', shift.notes || '');
				formData.append('hourlyRate', shift.hourlyRate?.toString() || '');
				formData.append('requiredSkills', JSON.stringify(shift.requiredSkills || []));
				formData.append('shiftType', shift.shiftType || '');
				formData.append('priority', shift.priority?.toString() || '0');
				formData.append('minSeniority', shift.minSeniority?.toString() || '');

				const response = await fetch('?/updateShift', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					toast.success('Shift updated successfully');
					window.location.reload();
				} else {
					toast.error('Failed to update shift');
				}
			} else {
				// Create new shift - this happens when dragging creates a new event
				console.log('Creating new shift from drag and drop:', updatedEvent);

				// Use default values for new shift
				formData.append('locationId', data.locations[0]?.id || '');
				formData.append('userId', ''); // Unassigned initially
				formData.append('role', 'Staff'); // Default role
				formData.append('date', startDate);
				formData.append('startTime', startTime);
				formData.append('endTime', endTime);
				formData.append('breakMinutes', '30'); // Default break
				formData.append('notes', '');
				formData.append('hourlyRate', '');
				formData.append('requiredSkills', JSON.stringify([]));
				formData.append('shiftType', '');
				formData.append('priority', '0');
				formData.append('minSeniority', '');

				const response = await fetch('?/createShift', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					toast.success('Shift created successfully');
					window.location.reload();
				} else {
					const result = await response.json();
					toast.error(result.error || 'Failed to create shift');
				}
			}
		} catch (error) {
			console.error('Error handling event update:', error);
			toast.error('Failed to process shift change');
		}
	}

	// Calculate statistics
	const filteredShifts = $derived(data.shifts.filter((shift) => !selectedLocation || shift.location.id === selectedLocation));

	const weeklyHours = $derived(filteredShifts.reduce((total, shift) => {
		const start = new Date(shift.startTime);
		const end = new Date(shift.endTime);
		const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
		const netHours = hours - shift.breakMinutes / 60;
		return total + netHours;
	}, 0));

	const weeklyLaborCost = $derived(filteredShifts.reduce((total, shift) => {
		const start = new Date(shift.startTime);
		const end = new Date(shift.endTime);
		const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
		const netHours = hours - shift.breakMinutes / 60;
		const rate = shift.hourlyRate || shift.user?.defaultHourlyRate || 15;
		return total + netHours * rate;
	}, 0));
</script>

<svelte:head>
	<title>Schedule - ShiftHappens</title>
</svelte:head>

<div class="max-w-[1600px] mx-auto space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
		<div class="space-y-2">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
					<CalendarDays class="h-6 w-6 text-blue-600 dark:text-blue-400" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Schedule</h1>
					<p class="text-slate-600 dark:text-slate-400">
						Manage your team's schedule with drag-and-drop
					</p>
				</div>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<!-- Location Filter -->
			{#if data.locations.length > 1}
				<div class="flex items-center gap-2">
					<Filter class="h-4 w-4 text-slate-500" />
					<select
						bind:value={selectedLocation}
						class="px-3 py-2 bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
					>
						<option value={null}>All Locations</option>
						{#each data.locations as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<Button variant="ghost" onclick={() => (showAutoScheduleModal = true)} class="gap-2">
				<Settings class="h-4 w-4" />
				Auto-Schedule
			</Button>
			<Button variant="primary" onclick={() => {
				selectedShift = null;
				selectedDate = new Date();
				showShiftModal = true;
			}} class="gap-2">
				<Plus class="h-4 w-4" />
				Add Shift
			</Button>
		</div>
	</div>

	<!-- Week Stats -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<Card.Root class="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div class="space-y-2">
						<p class="text-sm font-medium text-blue-600 dark:text-blue-400">Total Hours</p>
						<p class="text-3xl font-bold text-blue-900 dark:text-blue-100">
							{weeklyHours.toFixed(1)}h
						</p>
					</div>
					<div class="p-3 bg-blue-100 dark:bg-blue-800/30 rounded-full">
						<Clock class="h-6 w-6 text-blue-600 dark:text-blue-400" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div class="space-y-2">
						<p class="text-sm font-medium text-green-600 dark:text-green-400">Labor Cost</p>
						<p class="text-3xl font-bold text-green-900 dark:text-green-100">
							${weeklyLaborCost.toFixed(2)}
						</p>
					</div>
					<div class="p-3 bg-green-100 dark:bg-green-800/30 rounded-full">
						<TrendingUp class="h-6 w-6 text-green-600 dark:text-green-400" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div class="space-y-2">
						<p class="text-sm font-medium text-purple-600 dark:text-purple-400">Total Shifts</p>
						<p class="text-3xl font-bold text-purple-900 dark:text-purple-100">
							{filteredShifts.length}
						</p>
					</div>
					<div class="p-3 bg-purple-100 dark:bg-purple-800/30 rounded-full">
						<Users class="h-6 w-6 text-purple-600 dark:text-purple-400" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Schedule-X Calendar -->
	<Card.Root class="border-0 shadow-lg">
		<Card.Header class="pb-4">
			<div class="flex items-center justify-between">
				<Card.Title class="flex items-center gap-2">
					<CalendarDays class="h-5 w-5 text-blue-600 dark:text-blue-400" />
					Weekly Schedule
				</Card.Title>
				<div class="text-sm text-slate-500 dark:text-slate-400">
					Drag and drop to create or move shifts
				</div>
			</div>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="sx-svelte-calendar-wrapper">
				{#if browser && mounted && ScheduleXCalendarClient}
					{@const CalendarComponent = ScheduleXCalendarClient}
					<CalendarComponent
						events={calendarEvents}
						onEventClick={handleEventClick}
						onClickDateTime={handleClickDateTime}
						onEventUpdate={handleEventUpdate}
					/>
				{:else}
					<div class="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
						<div class="text-center space-y-4">
							<div class="animate-spin">
								<CalendarDays class="h-12 w-12 text-blue-500 dark:text-blue-400" />
							</div>
							<p class="text-slate-600 dark:text-slate-400 font-medium">Loading calendar...</p>
						</div>
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Empty State -->
	{#if filteredShifts.length === 0}
		<Card.Root class="border-0 shadow-sm">
			<Card.Content class="p-12 text-center">
				<div class="space-y-6">
					<div class="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
						<CalendarDays class="h-10 w-10 text-blue-600 dark:text-blue-400" />
					</div>
					<div class="space-y-2">
						<h3 class="text-xl font-bold text-slate-900 dark:text-white">
							No shifts scheduled yet
						</h3>
						<p class="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
							Get started by adding your first shift to the schedule. You can also use drag and drop to create shifts directly on the calendar.
						</p>
					</div>
					<Button
						variant="primary"
						onclick={() => {
							selectedShift = null;
							selectedDate = new Date();
							showShiftModal = true;
						}}
						class="gap-2"
					>
						<Plus class="h-4 w-4" />
						Create First Shift
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
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

<style>
	:global(.sx-svelte-calendar-wrapper) {
		width: 100%;
		height: 900px;
		max-height: 90vh;
	}

	/* Custom styling for Schedule-X calendar */
	:global(.sx__calendar) {
		border-radius: 0;
		border: none;
	}

	:global(.sx__week-grid__event) {
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.sx__week-grid__event:hover) {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	/* Dark mode support */
	:global(.dark .sx__calendar) {
		background-color: #1e293b;
		color: #f1f5f9;
	}

	:global(.dark .sx__week-grid__header) {
		background-color: #0f172a;
		border-color: #334155;
	}

	:global(.dark .sx__week-grid__day) {
		border-color: #334155;
	}

	:global(.dark .sx__time-axis__hour) {
		color: #94a3b8;
		border-color: #334155;
	}
</style>
