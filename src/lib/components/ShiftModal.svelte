<script lang="ts">
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import { toast } from 'svelte-sonner';
	import { formatDate, formatTime as formatTimeUtil } from '$lib/utils/date';

	interface Props {
		open: boolean;
		onClose: () => void;
		locations: any[];
		users: any[];
		selectedDate?: Date | null;
		shift?: any | null; // For editing existing shifts
	}

	let { open = $bindable(), onClose, locations, users, selectedDate = null, shift = null }: Props = $props();

	// Form state
	let locationId = $state(shift?.locationId || locations[0]?.id || '');
	let userId = $state(shift?.userId || '');
	let role = $state(shift?.role || '');
	let date = $state(shift ? formatDate(new Date(shift.startTime)) : selectedDate ? formatDate(selectedDate) : formatDate(new Date()));
	let startTime = $state(shift ? formatTimeUtil(shift.startTime) : '09:00');
	let endTime = $state(shift ? formatTimeUtil(shift.endTime) : '17:00');
	let breakMinutes = $state(shift?.breakMinutes || 30);
	let hourlyRate = $state(shift?.hourlyRate || '');
	let notes = $state(shift?.notes || '');
	let submitting = $state(false);

	// Common restaurant roles
	const commonRoles = [
		'Server',
		'Bartender',
		'Host/Hostess',
		'Cook',
		'Line Cook',
		'Prep Cook',
		'Dishwasher',
		'Manager',
		'Assistant Manager',
		'Runner',
		'Busser',
		'Barback'
	];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		submitting = true;

		const formData = new FormData();
		if (shift?.id) formData.append('shiftId', shift.id);
		formData.append('locationId', locationId);
		formData.append('userId', userId || '');
		formData.append('role', role);
		formData.append('date', date);
		formData.append('startTime', startTime);
		formData.append('endTime', endTime);
		formData.append('breakMinutes', breakMinutes.toString());
		if (hourlyRate) formData.append('hourlyRate', hourlyRate.toString());
		if (notes) formData.append('notes', notes);

		try {
			const action = shift?.id ? '?/updateShift' : '?/createShift';
			const response = await fetch(action, {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success(shift?.id ? 'Shift updated!' : 'Shift created!');
				onClose();
				window.location.reload();
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to save shift');
			}
		} catch (error) {
			console.error('Submit error:', error);
			toast.error('Something went wrong');
		} finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		if (!shift?.id) return;
		if (!confirm('Are you sure you want to delete this shift?')) return;

		const formData = new FormData();
		formData.append('shiftId', shift.id);

		try {
			const response = await fetch('?/deleteShift', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Shift deleted');
				onClose();
				window.location.reload();
			} else {
				toast.error('Failed to delete shift');
			}
		} catch (error) {
			console.error('Delete error:', error);
			toast.error('Something went wrong');
		}
	}

	// Reset form when modal closes
	$effect(() => {
		if (!open) {
			// Reset form after animation
			setTimeout(() => {
				if (!shift) {
					userId = '';
					role = '';
					notes = '';
				}
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
			class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
				<h2 class="text-2xl font-bold text-slate-900 dark:text-white">
					{shift?.id ? 'Edit Shift' : 'Create Shift'}
				</h2>
				<button
					type="button"
					onclick={onClose}
					class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl"
				>
					✕
				</button>
			</div>

			<!-- Modal Body -->
			<form onsubmit={handleSubmit} class="p-6 space-y-6">
				<!-- Location Selection -->
				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Location *
					</label>
					<select
						bind:value={locationId}
						required
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
					>
						{#each locations as location}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</div>

				<!-- Employee Selection -->
				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Employee
					</label>
					<select
						bind:value={userId}
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
					>
						<option value="">Unassigned</option>
						{#each users as user}
							<option value={user.id}>{user.name} ({user.role.toLowerCase()})</option>
						{/each}
					</select>
					<p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
						Leave unassigned to create an open shift
					</p>
				</div>

				<!-- Role -->
				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Role/Position *
					</label>
					<input
						type="text"
						bind:value={role}
						required
						list="roles"
						placeholder="Select or type a role"
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
					<datalist id="roles">
						{#each commonRoles as commonRole}
							<option value={commonRole}></option>
						{/each}
					</datalist>
				</div>

				<!-- Date and Times -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<Input
							type="date"
							label="Date"
							bind:value={date}
							required
						/>
					</div>
					<div>
						<Input
							type="time"
							label="Start Time"
							bind:value={startTime}
							required
						/>
					</div>
					<div>
						<Input
							type="time"
							label="End Time"
							bind:value={endTime}
							required
						/>
					</div>
				</div>

				<!-- Break and Rate -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Break (minutes)
						</label>
						<input
							type="number"
							bind:value={breakMinutes}
							min="0"
							step="15"
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Hourly Rate (optional)
						</label>
						<input
							type="number"
							bind:value={hourlyRate}
							min="0"
							step="0.01"
							placeholder="Uses employee's default rate"
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
					</div>
				</div>

				<!-- Notes -->
				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Notes (optional)
					</label>
					<textarea
						bind:value={notes}
						rows="3"
						placeholder="Any special instructions or notes..."
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
					></textarea>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
					<div>
						{#if shift?.id}
							<Button
								type="button"
								variant="ghost"
								onclick={handleDelete}
								class="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
							>
								🗑️ Delete
							</Button>
						{/if}
					</div>
					<div class="flex gap-3">
						<Button type="button" variant="ghost" onclick={onClose}>
							Cancel
						</Button>
						<Button type="submit" variant="primary" loading={submitting}>
							{submitting ? 'Saving...' : (shift?.id ? 'Update Shift' : 'Create Shift')}
						</Button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
