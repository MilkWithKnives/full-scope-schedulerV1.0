<script lang="ts">
	import Button from './Button.svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		onClose: () => void;
		selectedShifts: any[];
		users: any[];
	}

	let { open = $bindable(), onClose, selectedShifts, users }: Props = $props();

	let loading = $state(false);
	let action = $state<'delete' | 'publish' | 'assign' | null>(null);
	let selectedUserId = $state<string | null>(null);

	async function handleBulkAction() {
		if (!action) return;

		loading = true;
		const shiftIds = selectedShifts.map((shift) => shift.id);
		const formData = new FormData();
		formData.append('shiftIds', JSON.stringify(shiftIds));

		let endpoint = '';
		if (action === 'delete') {
			endpoint = '?/bulkDeleteShifts';
		} else if (action === 'publish') {
			endpoint = '?/bulkPublishShifts';
		} else if (action === 'assign') {
			if (!selectedUserId) {
				toast.error('Please select an employee');
				loading = false;
				return;
			}
			endpoint = '?/bulkAssignShifts';
			formData.append('userId', selectedUserId);
		}

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				const count = result.data?.deletedCount || result.data?.publishedCount || result.data?.assignedCount || 0;
				const actionText = action === 'delete' ? 'deleted' : action === 'publish' ? 'published' : 'assigned';
				toast.success(`Successfully ${actionText} ${count} shifts!`);
				onClose();
				window.location.reload();
			} else {
				toast.error(result.data?.error || `Failed to ${action} shifts`);
			}
		} catch (error) {
			console.error('Bulk action error:', error);
			toast.error('Something went wrong');
		} finally {
			loading = false;
		}
	}

	// Reset when modal closes
	$effect(() => {
		if (!open) {
			setTimeout(() => {
				action = null;
				selectedUserId = null;
			}, 300);
		}
	});
</script>

{#if open}
	<!-- Modal Overlay -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
		onclick={onClose}
	>
		<!-- Modal Content -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700"
			>
				<div>
					<h2 class="text-2xl font-bold text-slate-900 dark:text-white">
						Bulk Actions
					</h2>
					<p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
						{selectedShifts.length} shift{selectedShifts.length !== 1 ? 's' : ''} selected
					</p>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl"
				>
					✕
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6 space-y-6">
				{#if !action}
					<!-- Action Selection -->
					<div class="space-y-3">
						<button
							type="button"
							onclick={() => (action = 'publish')}
							class="w-full p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left"
						>
							<div class="flex items-center gap-3">
								<span class="text-2xl">📢</span>
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white">
										Publish Shifts
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400">
										Make shifts visible to employees
									</div>
								</div>
							</div>
						</button>

						<button
							type="button"
							onclick={() => (action = 'assign')}
							class="w-full p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
						>
							<div class="flex items-center gap-3">
								<span class="text-2xl">👤</span>
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white">
										Assign to Employee
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400">
										Assign all shifts to one person
									</div>
								</div>
							</div>
						</button>

						<button
							type="button"
							onclick={() => (action = 'delete')}
							class="w-full p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-left"
						>
							<div class="flex items-center gap-3">
								<span class="text-2xl">🗑️</span>
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white">
										Delete Shifts
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400">
										Permanently remove these shifts
									</div>
								</div>
							</div>
						</button>
					</div>
				{:else if action === 'assign'}
					<!-- Assignment Form -->
					<div class="space-y-4">
						<button
							type="button"
							onclick={() => (action = null)}
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
						>
							← Back
						</button>

						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Select Employee
							</label>
							<select
								bind:value={selectedUserId}
								class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
							>
								<option value={null}>Choose an employee...</option>
								{#each users as user}
									<option value={user.id}>{user.name} - {user.role}</option>
								{/each}
							</select>
						</div>

						<div class="card p-4 bg-blue-50 dark:bg-blue-900/20">
							<p class="text-sm text-blue-900 dark:text-blue-100">
								This will assign all {selectedShifts.length} selected shifts to the chosen employee.
							</p>
						</div>

						<div class="flex gap-3">
							<Button variant="ghost" onclick={onClose} class="flex-1">
								Cancel
							</Button>
							<Button
								variant="primary"
								onclick={handleBulkAction}
								loading={loading}
								disabled={!selectedUserId}
								class="flex-1"
							>
								{loading ? 'Assigning...' : 'Assign Shifts'}
							</Button>
						</div>
					</div>
				{:else if action === 'publish'}
					<!-- Publish Confirmation -->
					<div class="space-y-4">
						<button
							type="button"
							onclick={() => (action = null)}
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
						>
							← Back
						</button>

						<div class="card p-4 bg-green-50 dark:bg-green-900/20">
							<p class="text-sm text-green-900 dark:text-green-100">
								Publishing will make these {selectedShifts.length} shifts visible to employees. They will
								receive notifications and can view them in their schedules.
							</p>
						</div>

						<div class="flex gap-3">
							<Button variant="ghost" onclick={onClose} class="flex-1">
								Cancel
							</Button>
							<Button
								variant="primary"
								onclick={handleBulkAction}
								loading={loading}
								class="flex-1"
							>
								{loading ? 'Publishing...' : 'Publish Shifts'}
							</Button>
						</div>
					</div>
				{:else if action === 'delete'}
					<!-- Delete Confirmation -->
					<div class="space-y-4">
						<button
							type="button"
							onclick={() => (action = null)}
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
						>
							← Back
						</button>

						<div class="card p-4 bg-red-50 dark:bg-red-900/20">
							<p class="text-sm text-red-900 dark:text-red-100 font-medium mb-2">
								⚠️ Warning: This action cannot be undone
							</p>
							<p class="text-sm text-red-800 dark:text-red-200">
								You are about to permanently delete {selectedShifts.length} shift{selectedShifts.length !==
								1
									? 's'
									: ''}. All associated data will be removed.
							</p>
						</div>

						<div class="flex gap-3">
							<Button variant="ghost" onclick={onClose} class="flex-1">
								Cancel
							</Button>
							<Button
								variant="danger"
								onclick={handleBulkAction}
								loading={loading}
								class="flex-1"
							>
								{loading ? 'Deleting...' : 'Delete Shifts'}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
