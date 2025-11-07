<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let selectedLocation: any = $state(null);
	let submitting = $state(false);

	// Form state
	let formData = $state({
		id: '',
		name: '',
		address: '',
		latitude: '',
		longitude: '',
		geofenceRadius: '250'
	});

	function openAddModal() {
		formData = {
			id: '',
			name: '',
			address: '',
			latitude: '',
			longitude: '',
			geofenceRadius: '250'
		};
		showAddModal = true;
	}

	function openEditModal(location: any) {
		selectedLocation = location;
		formData = {
			id: location.id,
			name: location.name,
			address: location.address,
			latitude: location.latitude?.toString() || '',
			longitude: location.longitude?.toString() || '',
			geofenceRadius: location.geofenceRadius?.toString() || '250'
		};
		showEditModal = true;
	}

	async function handleSubmit(e: Event, action: string) {
		e.preventDefault();
		submitting = true;

		const form = new FormData();
		Object.entries(formData).forEach(([key, value]) => {
			if (value) form.append(key, value);
		});

		try {
			const response = await fetch(`?/${action}`, {
				method: 'POST',
				body: form
			});

			if (response.ok) {
				toast.success(action === 'addLocation' ? 'Location added!' : 'Location updated!');
				showAddModal = false;
				showEditModal = false;
				window.location.reload();
			} else {
				toast.error('Failed to save location');
			}
		} catch (error) {
			console.error('Submit error:', error);
			toast.error('Something went wrong');
		} finally {
			submitting = false;
		}
	}

	async function handleDelete(locationId: string, locationName: string) {
		if (!confirm(`Are you sure you want to delete "${locationName}"? This will also delete all shifts at this location.`)) {
			return;
		}

		const form = new FormData();
		form.append('id', locationId);

		try {
			const response = await fetch('?/deleteLocation', {
				method: 'POST',
				body: form
			});

			if (response.ok) {
				toast.success('Location deleted');
				window.location.reload();
			} else {
				toast.error('Failed to delete location');
			}
		} catch (error) {
			console.error('Delete error:', error);
			toast.error('Something went wrong');
		}
	}
</script>

<svelte:head>
	<title>Locations - Roster86</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Locations</h1>
			<p class="mt-1 text-slate-600 dark:text-slate-400">
				Manage your restaurant locations and geofencing settings
			</p>
		</div>
		<Button variant="primary" onclick={openAddModal}>
			Add Location
		</Button>
	</div>

	<!-- Locations Grid -->
	{#if data.locations.length === 0}
		<div class="p-12 text-center card">
			<div class="mb-4 text-5xl">📍</div>
			<h3 class="mb-2 text-xl font-bold text-slate-900 dark:text-white">
				No locations yet
			</h3>
			<p class="mb-6 text-slate-600 dark:text-slate-400">
				Add your first location to start scheduling shifts
			</p>
			<Button variant="primary" onclick={openAddModal}>
				Add First Location
			</Button>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.locations as location}
				<div class="p-6 transition-shadow card hover:shadow-lg">
					<div class="flex items-start justify-between mb-4">
						<div class="flex-1">
							<h3 class="mb-1 text-lg font-bold text-slate-900 dark:text-white">
								{location.name}
							</h3>
							<p class="text-sm text-slate-600 dark:text-slate-400">
								{location.address}
							</p>
						</div>
					</div>

					<!-- Stats -->
					<div class="grid grid-cols-2 gap-4 pt-4 mb-4 border-t border-slate-200 dark:border-slate-700">
						<div>
							<div class="text-xs text-slate-500 dark:text-slate-400">Shifts</div>
							<div class="text-lg font-bold text-slate-900 dark:text-white">
								{location._count.Shift}
							</div>
						</div>
						<div>
							<div class="text-xs text-slate-500 dark:text-slate-400">Geofence</div>
							<div class="text-lg font-bold text-slate-900 dark:text-white">
								{location.geofenceRadius || 250}m
							</div>
						</div>
					</div>

					{#if location.latitude && location.longitude}
						<div class="mb-4 text-xs text-slate-500 dark:text-slate-400">
							📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex gap-2">
						<Button
							variant="secondary"
							size="sm"
							class="flex-1"
							onclick={() => openEditModal(location)}
						>
							Edit
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => handleDelete(location.id, location.name)}
						>
							Delete
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Location Modal -->
<Modal
	bind:open={showAddModal}
	onClose={() => (showAddModal = false)}
	title="Add Location"
>
	<form on:submit={(e) => handleSubmit(e, 'addLocation')} class="space-y-4">
		<Input
			type="text"
			name="name"
			label="Location Name"
			bind:value={formData.name}
			required
			placeholder="Downtown Restaurant"
		/>

		<Input
			type="text"
			name="address"
			label="Address"
			bind:value={formData.address}
			required
			placeholder="123 Main St, City, State 12345"
		/>

		<div class="grid grid-cols-2 gap-4">
			<Input
				type="number"
				name="latitude"
				label="Latitude (optional)"
				bind:value={formData.latitude}
				placeholder="40.7128"
				step="any"
			/>

			<Input
				type="number"
				name="longitude"
				label="Longitude (optional)"
				bind:value={formData.longitude}
				placeholder="-74.0060"
				step="any"
			/>
		</div>

		<Input
			type="number"
			name="geofenceRadius"
			label="Geofence Radius (meters)"
			bind:value={formData.geofenceRadius}
			placeholder="250"
		/>

		<div class="flex gap-3 pt-4">
			<Button type="submit" variant="primary" loading={submitting} class="flex-1">
				{submitting ? 'Adding...' : 'Add Location'}
			</Button>
			<Button type="button" variant="ghost" onclick={() => (showAddModal = false)}>
				Cancel
			</Button>
		</div>
	</form>
</Modal>

<!-- Edit Location Modal -->
<Modal
	bind:open={showEditModal}
	onClose={() => (showEditModal = false)}
	title="Edit Location"
>
	<form on:submit={(e) => handleSubmit(e, 'updateLocation')} class="space-y-4">
		<Input
			type="text"
			name="name"
			label="Location Name"
			bind:value={formData.name}
			required
			placeholder="Downtown Restaurant"
		/>

		<Input
			type="text"
			name="address"
			label="Address"
			bind:value={formData.address}
			required
			placeholder="123 Main St, City, State 12345"
		/>

		<div class="grid grid-cols-2 gap-4">
			<Input
				type="number"
				name="latitude"
				label="Latitude (optional)"
				bind:value={formData.latitude}
				placeholder="40.7128"
				step="any"
			/>

			<Input
				type="number"
				name="longitude"
				label="Longitude (optional)"
				bind:value={formData.longitude}
				placeholder="-74.0060"
				step="any"
			/>
		</div>

		<Input
			type="number"
			name="geofenceRadius"
			label="Geofence Radius (meters)"
			bind:value={formData.geofenceRadius}
			placeholder="250"
		/>

		<div class="flex gap-3 pt-4">
			<Button type="submit" variant="primary" loading={submitting} class="flex-1">
				{submitting ? 'Saving...' : 'Save Changes'}
			</Button>
			<Button type="button" variant="ghost" onclick={() => (showEditModal = false)}>
				Cancel
			</Button>
		</div>
	</form>
</Modal>
