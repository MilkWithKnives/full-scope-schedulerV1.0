<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let orgName = $state(data.organization?.name || '');
	let userName = $state(data.user?.name || '');
	let userEmail = $state(data.user?.email || '');
	let newLocationName = $state('');
	let newLocationAddress = $state('');

	// Scheduling preferences
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
</script>

<svelte:head>
	<title>Settings - ShiftHappens</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
		<p class="text-slate-600 dark:text-slate-400">
			Manage your organization and account settings
		</p>
	</div>

	<!-- Profile Settings -->
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

	<!-- Organization Settings (Owner only) -->
	{#if isOwner}
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Organization Settings</h2>
			<form method="POST" action="?/updateOrganization" class="space-y-4">
				<Input
					type="text"
					name="name"
					label="Organization Name"
					bind:value={orgName}
					required
				/>
				<div>
					<Button type="submit" variant="primary">
						Save Organization
					</Button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Locations -->
	<div class="card p-6">
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Locations</h2>

		<!-- Existing Locations -->
		{#if data.organization?.locations && data.organization.locations.length > 0}
			<div class="mb-6 space-y-2">
				{#each data.organization.locations as location}
					<div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
						<div>
							<div class="font-medium text-slate-900 dark:text-white">{location.name}</div>
							<div class="text-sm text-slate-600 dark:text-slate-400">{location.address}</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-slate-600 dark:text-slate-400 mb-4">No locations added yet.</p>
		{/if}

		<!-- Add Location Form -->
		<div class="pt-4 border-t border-slate-200 dark:border-slate-700">
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
						placeholder="123 Main St"
						bind:value={newLocationAddress}
						required
					/>
				</div>
				<div>
					<Button type="submit" variant="secondary">
						Add Location
					</Button>
				</div>
			</form>
		</div>
	</div>

	<!-- Scheduling Preferences -->
	<div class="card p-6">
		<div class="flex items-center gap-2 mb-6">
			<span class="text-2xl">⚙️</span>
			<h2 class="text-xl font-bold text-slate-900 dark:text-white">Scheduling Preferences</h2>
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
</div>
