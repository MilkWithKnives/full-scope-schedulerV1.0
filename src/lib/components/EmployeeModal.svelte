<script lang="ts">
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		onClose: () => void;
		locations: any[];
		employee?: any | null; // For editing existing employees
	}

	let { open = $bindable(), onClose, locations, employee = null }: Props = $props();

	// Form state
	let name = $state(employee?.name || '');
	let email = $state(employee?.email || '');
	let role = $state(employee?.role || 'EMPLOYEE');
	let defaultHourlyRate = $state(employee?.defaultHourlyRate || '');
	let phoneNumber = $state(employee?.phoneNumber || '');
	let preferredLocationId = $state(employee?.preferredLocationId || locations[0]?.id || '');
	let submitting = $state(false);

	// Role options
	const roleOptions = [
		{ value: 'EMPLOYEE', label: 'Employee', description: 'Can view their own schedule and clock in/out' },
		{ value: 'MANAGER', label: 'Manager', description: 'Can manage schedules, view reports, and approve time off' },
		{ value: 'OWNER', label: 'Owner', description: 'Full access to all features and settings' }
	];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		submitting = true;

		const formData = new FormData();
		if (employee?.id) formData.append('employeeId', employee.id);
		formData.append('name', name);
		formData.append('email', email);
		formData.append('role', role);
		if (defaultHourlyRate) formData.append('defaultHourlyRate', defaultHourlyRate.toString());
		if (phoneNumber) formData.append('phoneNumber', phoneNumber);
		if (preferredLocationId) formData.append('preferredLocationId', preferredLocationId);

		try {
			const action = employee?.id ? '?/updateEmployee' : '?/inviteEmployee';
			const response = await fetch(action, {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success(employee?.id ? 'Employee updated!' : 'Invitation sent!');
				onClose();
				window.location.reload();
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to save employee');
			}
		} catch (error) {
			console.error('Submit error:', error);
			toast.error('Something went wrong');
		} finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		if (!employee?.id) return;
		if (!confirm(`Are you sure you want to remove ${employee.name} from your team?`)) return;

		const formData = new FormData();
		formData.append('employeeId', employee.id);

		try {
			const response = await fetch('?/removeEmployee', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Employee removed');
				onClose();
				window.location.reload();
			} else {
				toast.error('Failed to remove employee');
			}
		} catch (error) {
			console.error('Delete error:', error);
			toast.error('Something went wrong');
		}
	}

	// Reset form when modal closes
	$effect(() => {
		if (!open && !employee) {
			// Reset form after animation
			setTimeout(() => {
				name = '';
				email = '';
				role = 'EMPLOYEE';
				defaultHourlyRate = '';
				phoneNumber = '';
				preferredLocationId = locations[0]?.id || '';
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
					{employee?.id ? 'Edit Employee' : 'Invite Team Member'}
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
				<!-- Name -->
				<div>
					<Input
						type="text"
						label="Full Name"
						bind:value={name}
						required
						placeholder="John Doe"
					/>
				</div>

				<!-- Email -->
				<div>
					<Input
						type="email"
						label="Email"
						bind:value={email}
						required
						placeholder="john@example.com"
						disabled={!!employee?.id}
					/>
					{#if !employee?.id}
						<p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
							An invitation will be sent to this email address
						</p>
					{/if}
				</div>

				<!-- Phone Number -->
				<div>
					<Input
						type="tel"
						label="Phone Number (optional)"
						bind:value={phoneNumber}
						placeholder="+1 (555) 123-4567"
					/>
				</div>

				<!-- Role Selection -->
				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Role *
					</label>
					<div class="space-y-2">
						{#each roleOptions as option}
							<label class="flex items-start gap-3 p-3 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors {role === option.value ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500' : ''}">
								<input
									type="radio"
									bind:group={role}
									value={option.value}
									required
									class="mt-1"
								/>
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white">
										{option.label}
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400">
										{option.description}
									</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Preferred Location and Hourly Rate -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Preferred Location
						</label>
						<select
							bind:value={preferredLocationId}
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						>
							<option value="">No preference</option>
							{#each locations as location}
								<option value={location.id}>{location.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<Input
							type="number"
							label="Default Hourly Rate"
							bind:value={defaultHourlyRate}
							min="0"
							step="0.01"
							placeholder="15.00"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
					<div>
						{#if employee?.id}
							<Button
								type="button"
								variant="ghost"
								onclick={handleDelete}
								class="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
							>
								🗑️ Remove Employee
							</Button>
						{/if}
					</div>
					<div class="flex gap-3">
						<Button type="button" variant="ghost" onclick={onClose}>
							Cancel
						</Button>
						<Button type="submit" variant="primary" loading={submitting}>
							{submitting ? 'Saving...' : (employee?.id ? 'Update Employee' : 'Send Invitation')}
						</Button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
