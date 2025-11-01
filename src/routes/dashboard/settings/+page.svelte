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
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Scheduling Preferences</h2>
		<div class="space-y-4">
			<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
				<div>
					<div class="font-medium text-slate-900 dark:text-white">Auto-Scheduling</div>
					<div class="text-sm text-slate-600 dark:text-slate-400">
						Automatically suggest shift assignments based on availability
					</div>
				</div>
				<div class="text-green-500 font-medium">Enabled</div>
			</div>

			<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
				<div>
					<div class="font-medium text-slate-900 dark:text-white">Max Hours Per Week</div>
					<div class="text-sm text-slate-600 dark:text-slate-400">
						Default maximum hours per employee
					</div>
				</div>
				<div class="text-slate-900 dark:text-white font-medium">40 hours</div>
			</div>

			<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
				<div>
					<div class="font-medium text-slate-900 dark:text-white">Min Rest Between Shifts</div>
					<div class="text-sm text-slate-600 dark:text-slate-400">
						Minimum hours of rest between consecutive shifts
					</div>
				</div>
				<div class="text-slate-900 dark:text-white font-medium">8 hours</div>
			</div>
		</div>
	</div>
</div>
