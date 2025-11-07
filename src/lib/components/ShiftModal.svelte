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
	let locationId = $state('');
	let userId = $state('');
	let role = $state('');
	let date = $state('');
	let startTime = $state('09:00');
	let endTime = $state('17:00');
	let breakMinutes = $state(30);
	let hourlyRate = $state('');
	let notes = $state('');

	// Shift requirements
	let requiredSkills = $state<string[]>([]);
	let shiftType = $state('');
	let priority = $state(0);
	let minSeniority = $state('');

	let submitting = $state(false);

	// Update form when shift or selectedDate changes
	$effect(() => {
		if (shift) {
			// Editing existing shift - populate form
			locationId = shift.locationId || locations[0]?.id || '';
			userId = shift.userId || '';
			role = shift.role || '';
			date = formatDate(new Date(shift.startTime));
			startTime = formatTimeUtil(shift.startTime);
			endTime = formatTimeUtil(shift.endTime);
			breakMinutes = shift.breakMinutes || 30;
			hourlyRate = shift.hourlyRate?.toString() || '';
			notes = shift.notes || '';
			requiredSkills = shift.requiredSkills || [];
			shiftType = shift.shiftType || '';
			priority = shift.priority || 0;
			minSeniority = shift.minSeniority?.toString() || '';
		} else {
			// Creating new shift - reset form
			locationId = locations[0]?.id || '';
			userId = '';
			role = '';
			date = selectedDate ? formatDate(selectedDate) : formatDate(new Date());
			startTime = '09:00';
			endTime = '17:00';
			breakMinutes = 30;
			hourlyRate = '';
			notes = '';
			requiredSkills = [];
			shiftType = '';
			priority = 0;
			minSeniority = '';
		}
	});

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

	// Skill options (same as employee modal for consistency)
	const skillOptions = [
		'Server', 'Bartender', 'Host', 'Busser', 'Cook', 'Prep Cook',
		'Line Cook', 'Dishwasher', 'Manager', 'Cash Handling', 'POS System',
		'Food Safety Certified', 'Alcohol Service Certified'
	];

	// Shift type options
	const shiftTypeOptions = [
		{ value: '', label: 'Not specified' },
		{ value: 'morning', label: 'Morning (6am-12pm)' },
		{ value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
		{ value: 'evening', label: 'Evening (5pm-11pm)' },
		{ value: 'overnight', label: 'Overnight (11pm-6am)' }
	];

	// Skill input
	let newSkill = $state('');

	function addSkill() {
		if (newSkill.trim() && !requiredSkills.includes(newSkill.trim())) {
			requiredSkills = [...requiredSkills, newSkill.trim()];
			newSkill = '';
		}
	}

	function removeSkill(skill: string) {
		requiredSkills = requiredSkills.filter(s => s !== skill);
	}

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

		// Shift requirements
		formData.append('requiredSkills', JSON.stringify(requiredSkills));
		if (shiftType) formData.append('shiftType', shiftType);
		formData.append('priority', priority.toString());
		if (minSeniority) formData.append('minSeniority', minSeniority.toString());

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
					requiredSkills = [];
					shiftType = '';
					priority = 0;
					minSeniority = '';
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

				<!-- Shift Requirements Section -->
				<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
					<div class="flex items-center gap-2 mb-4">
						<svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white">
							Shift Requirements
						</h3>
					</div>
					<p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
						Help the auto-scheduler find the right person for this shift
					</p>

					<!-- Required Skills -->
					<div class="mb-6">
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Required Skills
						</label>
						<div class="space-y-3">
							<!-- Skill Tags -->
							{#if requiredSkills.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each requiredSkills as skill}
										<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
											{skill}
											<button
												type="button"
												onclick={() => removeSkill(skill)}
												class="hover:bg-primary-200 dark:hover:bg-primary-800/50 rounded-full p-0.5 transition-colors"
												aria-label="Remove {skill}"
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
												</svg>
											</button>
										</span>
									{/each}
								</div>
							{/if}

							<!-- Add Skill Input -->
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={newSkill}
									placeholder="Add required skill"
									class="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
									onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
								/>
								<button
									type="button"
									onclick={addSkill}
									class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
								>
									Add
								</button>
							</div>

							<!-- Quick Add Skills -->
							<div class="flex flex-wrap gap-2">
								{#each skillOptions.filter(s => !requiredSkills.includes(s)) as skillOption}
									<button
										type="button"
										onclick={() => requiredSkills = [...requiredSkills, skillOption]}
										class="px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
									>
										+ {skillOption}
									</button>
								{/each}
							</div>
						</div>
					</div>

					<!-- Shift Type, Priority, Min Seniority -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Shift Type
							</label>
							<select
								bind:value={shiftType}
								class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
							>
								{#each shiftTypeOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Priority (0-10)
							</label>
							<input
								type="range"
								bind:value={priority}
								min="0"
								max="10"
								class="w-full"
							/>
							<div class="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
								<span>Low</span>
								<span class="font-medium text-slate-700 dark:text-slate-300">{priority}</span>
								<span>High</span>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								Min Seniority (Years)
							</label>
							<input
								type="number"
								bind:value={minSeniority}
								min="0"
								max="50"
								placeholder="0"
								class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
							/>
						</div>
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
