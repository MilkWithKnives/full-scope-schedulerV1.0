<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Active tab
	let activeTab = $state<'profile' | 'company' | 'schedule' | 'locations' | 'timeclock' | 'notifications' | 'permissions' | 'scheduling'>('company');

	// Profile
	let userName = $state(data.user?.name || '');
	let userEmail = $state(data.user?.email || '');

	// Company
	let orgName = $state(data.organization?.name || '');
	let timezone = $state(data.organization?.timezone || 'America/New_York');

	// Schedule settings
	let firstDayOfWeek = $state('1'); // Monday
	let hoursOfOperationStart = $state('00:00');
	let hoursOfOperationEnd = $state('23:59');
	let scheduleVisibleToEmployees = $state(true);
	let coworkersVisibleToEmployees = $state(true);
	let timeOffVisibleToEmployees = $state(true);
	let scheduleVisibleToManagers = $state(true);

	// Locations
	let newLocationName = $state('');
	let newLocationAddress = $state('');
	let newLocationLatitude = $state('');
	let newLocationLongitude = $state('');
	let newLocationGeofenceRadius = $state('250');

	// Time Clock settings
	let timeClockEnabled = $state(true);
	let geofencingEnabled = $state(true);
	let earlyClockInMinutes = $state('15');
	let lateClockInMinutes = $state('15');
	let autoEndBeforeOvertime = $state(false);
	let overtimeThreshold = $state('40');
	let roundingEnabled = $state(false);
	let roundingMinutes = $state('15');

	// Break settings
	let breaksEnabled = $state(true);
	let breakType = $state<'standard' | 'automated'>('standard');
	let defaultBreakMinutes = $state('30');
	let breakPaid = $state(false);

	// Notifications
	let emailNotifications = $state(true);
	let smsNotifications = $state(false);
	let shiftReminderHours = $state('24');
	let swapRequestNotifications = $state(true);
	let schedulePublishedNotifications = $state(true);

	// Permissions
	let employeesCanSwapShifts = $state(true);
	let swapRequiresApproval = $state(false);
	let employeesCanRequestTimeOff = $state(true);
	let employeesCanViewCoworkers = $state(true);
	let managersCanEditAllLocations = $state(false);

	// Scheduling preferences (existing)
	const prefs = data.organization?.schedulingPreferences;
	let defaultMaxHoursPerWeek = $state(prefs?.defaultMaxHoursPerWeek?.toString() || '40');
	let defaultMaxConsecutiveDays = $state(prefs?.defaultMaxConsecutiveDays?.toString() || '6');
	let defaultMinRestHours = $state(prefs?.defaultMinRestHours?.toString() || '8');
	let preferredLocationWeight = $state(prefs?.preferredLocationWeight?.toString() || '1.2');
	let costOptimizationEnabled = $state(prefs?.costOptimizationEnabled ?? true);
	let fairDistributionEnabled = $state(prefs?.fairDistributionEnabled ?? true);
	let autoAssignEnabled = $state(prefs?.autoAssignEnabled ?? false);
	let minScoreThreshold = $state(prefs?.minScoreThreshold?.toString() || '60');

	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Settings updated successfully');
		} else if (form?.error) {
			toast.error(form.error);
		}
	});

	const isOwner = data.session.user.role === 'OWNER';
	const isManager = data.session.user.role === 'MANAGER' || isOwner;

	const timezones = [
		{ value: 'America/New_York', label: 'Eastern Time (ET)' },
		{ value: 'America/Chicago', label: 'Central Time (CT)' },
		{ value: 'America/Denver', label: 'Mountain Time (MT)' },
		{ value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
		{ value: 'America/Phoenix', label: 'Arizona (MST)' },
		{ value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
		{ value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' }
	];

	const dayOptions = [
		{ value: '0', label: 'Sunday' },
		{ value: '1', label: 'Monday' },
		{ value: '6', label: 'Saturday' }
	];
</script>

<svelte:head>
	<title>Settings - ShiftHappens</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
		<p class="text-slate-600 dark:text-slate-400">
			Manage your organization and account settings
		</p>
	</div>

	<!-- Tabs Navigation -->
	<div class="border-b border-slate-200 dark:border-slate-700">
		<nav class="-mb-px flex space-x-8 overflow-x-auto">
			<button
				type="button"
				onclick={() => activeTab = 'profile'}
				class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'profile'
					? 'border-primary-500 text-primary-600 dark:text-primary-400'
					: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
			>
				👤 Profile
			</button>
			{#if isOwner}
				<button
					type="button"
					onclick={() => activeTab = 'company'}
					class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'company'
						? 'border-primary-500 text-primary-600 dark:text-primary-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
				>
					🏢 Company
				</button>
			{/if}
			{#if isManager}
				<button
					type="button"
					onclick={() => activeTab = 'schedule'}
					class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'schedule'
						? 'border-primary-500 text-primary-600 dark:text-primary-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
				>
					📅 Schedule
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'locations'}
					class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'locations'
						? 'border-primary-500 text-primary-600 dark:text-primary-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
				>
					📍 Locations
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'timeclock'}
					class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'timeclock'
						? 'border-primary-500 text-primary-600 dark:text-primary-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
				>
					⏰ Time Clock
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'scheduling'}
					class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'scheduling'
						? 'border-primary-500 text-primary-600 dark:text-primary-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
				>
					⚙️ Auto-Scheduler
				</button>
				<button
					type="button"
					onclick={() => activeTab = 'permissions'}
					class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'permissions'
						? 'border-primary-500 text-primary-600 dark:text-primary-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
				>
					🔒 Permissions
				</button>
			{/if}
			<button
				type="button"
				onclick={() => activeTab = 'notifications'}
				class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'notifications'
					? 'border-primary-500 text-primary-600 dark:text-primary-400'
					: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300'}"
			>
				🔔 Notifications
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	<div class="pb-12">
		<!-- Profile Settings -->
		{#if activeTab === 'profile'}
			<div class="card p-6">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Profile Settings</h2>
				<form method="POST" action="?/updateProfile" class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							type="text"
							name="name"
							label="Your Name"
							bind:value={userName}
							required
						/>
						<Input
							type="email"
							name="email"
							label="Email"
							bind:value={userEmail}
							required
						/>
					</div>
					<div>
						<Button type="submit" variant="primary">
							Save Profile
						</Button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Company Settings -->
		{#if activeTab === 'company' && isOwner}
			<div class="space-y-6">
				<div class="card p-6">
					<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Company Information</h2>
					<form method="POST" action="?/updateOrganization" class="space-y-4">
						<Input
							type="text"
							name="name"
							label="Organization Name"
							bind:value={orgName}
							required
						/>

						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Timezone
							</label>
							<select
								name="timezone"
								bind:value={timezone}
								class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
							>
								{#each timezones as tz}
									<option value={tz.value}>{tz.label}</option>
								{/each}
							</select>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
								Affects shift times, reports, and availability windows
							</p>
						</div>

						<div>
							<Button type="submit" variant="primary">
								Save Company Settings
							</Button>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<!-- Schedule Settings -->
		{#if activeTab === 'schedule' && isManager}
			<div class="space-y-6">
				<div class="card p-6">
					<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">Schedule Configuration</h2>
					<form method="POST" action="?/updateScheduleSettings" class="space-y-6">
						<!-- Week Settings -->
						<div class="border-b border-slate-200 dark:border-slate-700 pb-6">
							<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
								Week & Hours
							</h3>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
										First Day of Week
									</label>
									<select
										name="firstDayOfWeek"
										bind:value={firstDayOfWeek}
										class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
									>
										{#each dayOptions as day}
											<option value={day.value}>{day.label}</option>
										{/each}
									</select>
									<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
										Changes schedule layout and report grouping
									</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
								<div>
									<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
										Hours of Operation Start
									</label>
									<input
										type="time"
										name="hoursOfOperationStart"
										bind:value={hoursOfOperationStart}
										class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
									/>
								</div>
								<div>
									<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
										Hours of Operation End
									</label>
									<input
										type="time"
										name="hoursOfOperationEnd"
										bind:value={hoursOfOperationEnd}
										class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
									/>
								</div>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
								Changes the day view layout and default shift creation times
							</p>
						</div>

						<!-- Visibility Settings -->
						<div>
							<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
								Schedule Visibility
							</h3>
							<div class="space-y-3">
								<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
									<input
										type="checkbox"
										name="scheduleVisibleToEmployees"
										bind:checked={scheduleVisibleToEmployees}
										class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
									/>
									<div>
										<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
											Employees can see full schedule
										</div>
										<div class="text-xs text-slate-500 dark:text-slate-400">
											When disabled, employees only see their own shifts
										</div>
									</div>
								</label>

								<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
									<input
										type="checkbox"
										name="coworkersVisibleToEmployees"
										bind:checked={coworkersVisibleToEmployees}
										class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
									/>
									<div>
										<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
											Employees can see coworkers on shifts
										</div>
										<div class="text-xs text-slate-500 dark:text-slate-400">
											Shows who's working on each shift
										</div>
									</div>
								</label>

								<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
									<input
										type="checkbox"
										name="timeOffVisibleToEmployees"
										bind:checked={timeOffVisibleToEmployees}
										class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
									/>
									<div>
										<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
											Show time off and unavailability
										</div>
										<div class="text-xs text-slate-500 dark:text-slate-400">
											Employees can see when coworkers are unavailable
										</div>
									</div>
								</label>

								<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
									<input
										type="checkbox"
										name="scheduleVisibleToManagers"
										bind:checked={scheduleVisibleToManagers}
										class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
									/>
									<div>
										<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
											Managers can see all locations
										</div>
										<div class="text-xs text-slate-500 dark:text-slate-400">
											When disabled, managers only see their assigned locations
										</div>
									</div>
								</label>
							</div>
						</div>

						<div>
							<Button type="submit" variant="primary">
								Save Schedule Settings
							</Button>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<!-- Locations -->
		{#if activeTab === 'locations' && isManager}
			<div class="space-y-6">
				<div class="card p-6">
					<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Locations</h2>

					<!-- Existing Locations -->
					{#if data.organization?.locations && data.organization.locations.length > 0}
						<div class="mb-6 space-y-3">
							{#each data.organization.locations as location}
								<div class="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
									<div class="flex-1">
										<div class="font-medium text-slate-900 dark:text-white">{location.name}</div>
										<div class="text-sm text-slate-600 dark:text-slate-400 mt-1">{location.address}</div>
										{#if location.latitude && location.longitude}
											<div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
												📍 Geofencing: {location.geofenceRadius || 250}m radius
											</div>
										{/if}
									</div>
									<!-- Add edit/delete buttons here later -->
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-slate-600 dark:text-slate-400 mb-4">No locations added yet.</p>
					{/if}

					<!-- Add Location Form -->
					<div class="pt-6 border-t border-slate-200 dark:border-slate-700">
						<h3 class="font-semibold text-slate-900 dark:text-white mb-4">Add New Location</h3>
						<form method="POST" action="?/addLocation" class="space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<Input
									type="text"
									name="name"
									label="Location Name"
									placeholder="Downtown Store"
									bind:value={newLocationName}
									required
								/>
								<Input
									type="text"
									name="address"
									label="Address"
									placeholder="123 Main St, City, State"
									bind:value={newLocationAddress}
									required
								/>
							</div>

							<!-- Geofencing Settings -->
							<div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
								<h4 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
									📍 Geofencing (Optional)
								</h4>
								<p class="text-xs text-blue-800 dark:text-blue-200 mb-3">
									Require employees to be within a certain distance when clocking in
								</p>
								<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
									<Input
										type="number"
										name="latitude"
										label="Latitude"
										placeholder="40.7128"
										bind:value={newLocationLatitude}
										step="0.000001"
									/>
									<Input
										type="number"
										name="longitude"
										label="Longitude"
										placeholder="-74.0060"
										bind:value={newLocationLongitude}
										step="0.000001"
									/>
									<Input
										type="number"
										name="geofenceRadius"
										label="Radius (meters)"
										bind:value={newLocationGeofenceRadius}
										min="50"
										max="1000"
									/>
								</div>
								<p class="text-xs text-blue-700 dark:text-blue-300 mt-2">
									💡 Use Google Maps to find coordinates, or leave blank to allow clock-in from anywhere
								</p>
							</div>

							<div>
								<Button type="submit" variant="secondary">
									Add Location
								</Button>
							</div>
						</form>
					</div>
				</div>
			</div>
		{/if}

		<!-- Time Clock Settings -->
		{#if activeTab === 'timeclock' && isManager}
			<div class="space-y-6">
				<div class="card p-6">
					<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">Time Clock Settings</h2>
					<form method="POST" action="?/updateTimeClockSettings" class="space-y-6">
						<!-- Enable/Disable -->
						<label class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
							<input
								type="checkbox"
								name="timeClockEnabled"
								bind:checked={timeClockEnabled}
								class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
							/>
							<div>
								<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
									Enable Time Clock
								</div>
								<div class="text-xs text-slate-500 dark:text-slate-400">
									Allow employees to clock in/out for shifts
								</div>
							</div>
						</label>

						{#if timeClockEnabled}
							<div class="space-y-6 border-t border-slate-200 dark:border-slate-700 pt-6">
								<!-- Geofencing -->
								<div>
									<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
										<input
											type="checkbox"
											name="geofencingEnabled"
											bind:checked={geofencingEnabled}
											class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
										/>
										<div>
											<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
												Enable Geofencing
											</div>
											<div class="text-xs text-slate-500 dark:text-slate-400">
												Require employees to be at the location to clock in
											</div>
										</div>
									</label>
								</div>

								<!-- Clock-in Window -->
								<div>
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
										Clock-in Window
									</h3>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
												Allow early clock-in (minutes before)
											</label>
											<input
												type="number"
												name="earlyClockInMinutes"
												bind:value={earlyClockInMinutes}
												min="0"
												max="120"
												class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
											/>
											<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
												Prevents early clock-ins to control labor costs
											</p>
										</div>
										<div>
											<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
												Allow late clock-in (minutes after)
											</label>
											<input
												type="number"
												name="lateClockInMinutes"
												bind:value={lateClockInMinutes}
												min="0"
												max="120"
												class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
											/>
										</div>
									</div>
								</div>

								<!-- Overtime Protection -->
								<div>
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
										Overtime Protection
									</h3>
									<label class="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg cursor-pointer">
										<input
											type="checkbox"
											name="autoEndBeforeOvertime"
											bind:checked={autoEndBeforeOvertime}
											class="w-5 h-5 text-amber-500 rounded focus:ring-2 focus:ring-amber-500"
										/>
										<div>
											<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
												Auto-end shifts before overtime
											</div>
											<div class="text-xs text-slate-500 dark:text-slate-400">
												⚠️ Automatically clock out employees approaching weekly overtime threshold
											</div>
										</div>
									</label>
									{#if autoEndBeforeOvertime}
										<div class="mt-3">
											<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
												Weekly Overtime Threshold (hours)
											</label>
											<input
												type="number"
												name="overtimeThreshold"
												bind:value={overtimeThreshold}
												min="35"
												max="50"
												class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
											/>
										</div>
									{/if}
								</div>

								<!-- Time Rounding -->
								<div>
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
										Time Rounding
									</h3>
									<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
										<input
											type="checkbox"
											name="roundingEnabled"
											bind:checked={roundingEnabled}
											class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
										/>
										<div>
											<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
												Enable time rounding
											</div>
											<div class="text-xs text-slate-500 dark:text-slate-400">
												Round clock-in/out times to nearest interval
											</div>
										</div>
									</label>
									{#if roundingEnabled}
										<div class="mt-3">
											<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
												Round to nearest (minutes)
											</label>
											<select
												name="roundingMinutes"
												bind:value={roundingMinutes}
												class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
											>
												<option value="5">5 minutes</option>
												<option value="10">10 minutes</option>
												<option value="15">15 minutes</option>
												<option value="30">30 minutes</option>
											</select>
										</div>
									{/if}
								</div>

								<!-- Breaks -->
								<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
										Break Settings
									</h3>
									<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer mb-4">
										<input
											type="checkbox"
											name="breaksEnabled"
											bind:checked={breaksEnabled}
											class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
										/>
										<div>
											<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
												Enable breaks on shifts
											</div>
											<div class="text-xs text-slate-500 dark:text-slate-400">
												Allow managers to schedule breaks
											</div>
										</div>
									</label>

									{#if breaksEnabled}
										<div class="space-y-4">
											<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
														Default break duration (minutes)
													</label>
													<input
														type="number"
														name="defaultBreakMinutes"
														bind:value={defaultBreakMinutes}
														min="15"
														max="60"
														step="15"
														class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
													/>
												</div>
											</div>

											<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
												<input
													type="checkbox"
													name="breakPaid"
													bind:checked={breakPaid}
													class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
												/>
												<div>
													<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
														Breaks are paid
													</div>
													<div class="text-xs text-slate-500 dark:text-slate-400">
														Include break time in hours worked
													</div>
												</div>
											</label>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<div>
							<Button type="submit" variant="primary">
								Save Time Clock Settings
							</Button>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<!-- Auto-Scheduler Settings -->
		{#if activeTab === 'scheduling' && isManager}
			<div class="card p-6">
				<div class="flex items-center gap-2 mb-6">
					<span class="text-2xl">⚙️</span>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white">Auto-Scheduler Preferences</h2>
				</div>

				<form method="POST" action="?/updateSchedulingPreferences" class="space-y-6">
					<!-- Global Constraints -->
					<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Global Constraints
						</h3>
						<p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
							Default scheduling limits applied organization-wide. Individual employees can override these.
						</p>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<Input
									type="number"
									name="defaultMaxHoursPerWeek"
									label="Max Hours Per Week"
									bind:value={defaultMaxHoursPerWeek}
									min="1"
									max="168"
								/>
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
									Default limit for all employees
								</p>
							</div>

							<div>
								<Input
									type="number"
									name="defaultMaxConsecutiveDays"
									label="Max Consecutive Days"
									bind:value={defaultMaxConsecutiveDays}
									min="1"
									max="14"
								/>
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
									Days before a rest day is required
								</p>
							</div>

							<div>
								<Input
									type="number"
									name="defaultMinRestHours"
									label="Min Rest Hours"
									bind:value={defaultMinRestHours}
									min="1"
									max="24"
								/>
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
									Between consecutive shifts
								</p>
							</div>
						</div>
					</div>

					<!-- Algorithm Settings -->
					<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Auto-Scheduler Algorithm
						</h3>
						<p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
							Fine-tune how the AI assigns shifts to employees.
						</p>

						<div class="space-y-4">
							<!-- Preferred Location Weight -->
							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
									Preferred Location Weight
								</label>
								<input
									type="range"
									name="preferredLocationWeight"
									bind:value={preferredLocationWeight}
									min="1"
									max="3"
									step="0.1"
									class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
								/>
								<div class="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
									<span>Low (1.0)</span>
									<span class="font-medium text-slate-900 dark:text-white">{parseFloat(preferredLocationWeight).toFixed(1)}x</span>
									<span>High (3.0)</span>
								</div>
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
									How much to prioritize assigning employees to their preferred locations
								</p>
							</div>

							<!-- Toggle Options -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
									<label class="flex items-center gap-3 cursor-pointer">
										<input
											type="checkbox"
											name="costOptimizationEnabled"
											bind:checked={costOptimizationEnabled}
											value="true"
											class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
										/>
										<div>
											<div class="font-medium text-slate-900 dark:text-white">
												Cost Optimization
											</div>
											<div class="text-xs text-slate-600 dark:text-slate-400">
												Prioritize lower-cost employees when assigning shifts
											</div>
										</div>
									</label>
								</div>

								<div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
									<label class="flex items-center gap-3 cursor-pointer">
										<input
											type="checkbox"
											name="fairDistributionEnabled"
											bind:checked={fairDistributionEnabled}
											value="true"
											class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
										/>
										<div>
											<div class="font-medium text-slate-900 dark:text-white">
												Fair Distribution
											</div>
											<div class="text-xs text-slate-600 dark:text-slate-400">
												Distribute hours evenly across all employees
											</div>
										</div>
									</label>
								</div>
							</div>
						</div>
					</div>

					<!-- Auto-Assignment Settings -->
					<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Auto-Assignment
						</h3>
						<p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
							Let the system automatically assign employees to shifts based on availability and preferences.
						</p>

						<div class="space-y-4">
							<div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
								<label class="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										name="autoAssignEnabled"
										bind:checked={autoAssignEnabled}
										value="true"
										class="w-5 h-5 text-amber-500 rounded focus:ring-2 focus:ring-amber-500"
									/>
									<div>
										<div class="font-medium text-slate-900 dark:text-white">
											Enable Auto-Assignment
										</div>
										<div class="text-xs text-slate-600 dark:text-slate-400">
											⚠️ Shifts will be automatically assigned without manual review
										</div>
									</div>
								</label>
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
									Minimum Match Score Threshold
								</label>
								<input
									type="range"
									name="minScoreThreshold"
									bind:value={minScoreThreshold}
									min="0"
									max="100"
									step="5"
									class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
								/>
								<div class="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
									<span>Lenient (0)</span>
									<span class="font-medium text-slate-900 dark:text-white">{minScoreThreshold}%</span>
									<span>Strict (100)</span>
								</div>
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
									Only auto-assign if match quality is above this threshold
								</p>
							</div>
						</div>
					</div>

					<!-- Save Button -->
					<div class="pt-4">
						<Button type="submit" variant="primary">
							Save Scheduling Preferences
						</Button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Permissions -->
		{#if activeTab === 'permissions' && isManager}
			<div class="card p-6">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">Permissions & Access Control</h2>
				<form method="POST" action="?/updatePermissions" class="space-y-6">
					<!-- Shift Management -->
					<div>
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Shift Management
						</h3>
						<div class="space-y-3">
							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="employeesCanSwapShifts"
									bind:checked={employeesCanSwapShifts}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Employees can swap shifts
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										Allow employees to trade shifts with coworkers
									</div>
								</div>
							</label>

							{#if employeesCanSwapShifts}
								<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer ml-8">
									<input
										type="checkbox"
										name="swapRequiresApproval"
										bind:checked={swapRequiresApproval}
										class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
									/>
									<div>
										<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
											Swap requests require manager approval
										</div>
										<div class="text-xs text-slate-500 dark:text-slate-400">
											When off, swaps with no conflicts are auto-approved
										</div>
									</div>
								</label>
							{/if}

							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="employeesCanRequestTimeOff"
									bind:checked={employeesCanRequestTimeOff}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Employees can request time off
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										Allow employees to submit time-off requests
									</div>
								</div>
							</label>
						</div>
					</div>

					<!-- Visibility -->
					<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Visibility & Privacy
						</h3>
						<div class="space-y-3">
							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="employeesCanViewCoworkers"
									bind:checked={employeesCanViewCoworkers}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Employees can see coworker profiles
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										Allow viewing names, roles, and contact info
									</div>
								</div>
							</label>

							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="managersCanEditAllLocations"
									bind:checked={managersCanEditAllLocations}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Managers can edit all locations
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										When off, managers only manage their assigned locations
									</div>
								</div>
							</label>
						</div>
					</div>

					<div>
						<Button type="submit" variant="primary">
							Save Permissions
						</Button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Notifications -->
		{#if activeTab === 'notifications'}
			<div class="card p-6">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">Notification Preferences</h2>
				<form method="POST" action="?/updateNotifications" class="space-y-6">
					<!-- Channels -->
					<div>
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							Notification Channels
						</h3>
						<div class="space-y-3">
							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="emailNotifications"
									bind:checked={emailNotifications}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Email notifications
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										Receive updates via email
									</div>
								</div>
							</label>

							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="smsNotifications"
									bind:checked={smsNotifications}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										SMS notifications (coming soon)
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										Receive text messages for important updates
									</div>
								</div>
							</label>
						</div>
					</div>

					<!-- Event Types -->
					<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
							What to Notify Me About
						</h3>
						<div class="space-y-3">
							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="schedulePublishedNotifications"
									bind:checked={schedulePublishedNotifications}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Schedule published
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										When a new schedule is published
									</div>
								</div>
							</label>

							<label class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer">
								<input
									type="checkbox"
									name="swapRequestNotifications"
									bind:checked={swapRequestNotifications}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div>
									<div class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Shift swap requests
									</div>
									<div class="text-xs text-slate-500 dark:text-slate-400">
										When someone requests to swap shifts with you
									</div>
								</div>
							</label>

							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
									Shift reminder (hours before)
								</label>
								<select
									name="shiftReminderHours"
									bind:value={shiftReminderHours}
									class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
								>
									<option value="0">No reminder</option>
									<option value="1">1 hour before</option>
									<option value="2">2 hours before</option>
									<option value="4">4 hours before</option>
									<option value="24">24 hours before</option>
									<option value="48">48 hours before</option>
								</select>
								<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
									Get reminded before your shifts start
								</p>
							</div>
						</div>
					</div>

					<div>
						<Button type="submit" variant="primary">
							Save Notification Settings
						</Button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>
