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

	// Scheduling preferences
	let maxHoursPerWeek = $state(employee?.maxHoursPerWeek || '');
	let minHoursPerWeek = $state(employee?.minHoursPerWeek || '');
	let maxConsecutiveDays = $state(employee?.maxConsecutiveDays || '6');
	let minRestHours = $state(employee?.minRestHours || '8');
	let seniority = $state(employee?.seniority || '0');
	let isFullTime = $state(employee?.isFullTime || false);
	let skills = $state(employee?.skills || []);
	let shiftTypePreferences = $state(employee?.shiftTypePreferences || []);

	let submitting = $state(false);

	// Role options
	const roleOptions = [
		{ value: 'EMPLOYEE', label: 'Employee', description: 'Can view their own schedule and clock in/out' },
		{ value: 'MANAGER', label: 'Manager', description: 'Can manage schedules, view reports, and approve time off' },
		{ value: 'OWNER', label: 'Owner', description: 'Full access to all features and settings' }
	];

	// Skill options (common restaurant skills)
	const skillOptions = [
		'Server', 'Bartender', 'Host', 'Busser', 'Cook', 'Prep Cook',
		'Line Cook', 'Dishwasher', 'Manager', 'Cash Handling', 'POS System',
		'Food Safety Certified', 'Alcohol Service Certified'
	];

	// Shift type options
	const shiftTypeOptions = [
		{ value: 'morning', label: 'Morning (6am-12pm)' },
		{ value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
		{ value: 'evening', label: 'Evening (5pm-11pm)' },
		{ value: 'overnight', label: 'Overnight (11pm-6am)' }
	];

	// Skill input
	let newSkill = $state('');

	function addSkill() {
		if (newSkill.trim() && !skills.includes(newSkill.trim())) {
			skills = [...skills, newSkill.trim()];
			newSkill = '';
		}
	}

	function removeSkill(skill: string) {
		skills = skills.filter(s => s !== skill);
	}

	function toggleShiftType(type: string) {
		if (shiftTypePreferences.includes(type)) {
			shiftTypePreferences = shiftTypePreferences.filter(t => t !== type);
		} else {
			shiftTypePreferences = [...shiftTypePreferences, type];
		}
	}

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

		// Scheduling preferences
		if (maxHoursPerWeek) formData.append('maxHoursPerWeek', maxHoursPerWeek.toString());
		if (minHoursPerWeek) formData.append('minHoursPerWeek', minHoursPerWeek.toString());
		if (maxConsecutiveDays) formData.append('maxConsecutiveDays', maxConsecutiveDays.toString());
		if (minRestHours) formData.append('minRestHours', minRestHours.toString());
		if (seniority) formData.append('seniority', seniority.toString());
		formData.append('isFullTime', isFullTime.toString());
		formData.append('skills', JSON.stringify(skills));
		formData.append('shiftTypePreferences', JSON.stringify(shiftTypePreferences));

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

	// Populate form when editing existing employee
	$effect(() => {
		if (employee) {
			// Editing existing employee - populate form
			name = employee.name || '';
			email = employee.email || '';
			role = employee.role || 'EMPLOYEE';
			defaultHourlyRate = employee.defaultHourlyRate?.toString() || '';
			phoneNumber = employee.phone || '';
			preferredLocationId = employee.preferredLocationId || locations[0]?.id || '';
			maxHoursPerWeek = employee.maxHoursPerWeek?.toString() || '';
			minHoursPerWeek = employee.minHoursPerWeek?.toString() || '';
			maxConsecutiveDays = employee.maxConsecutiveDays?.toString() || '6';
			minRestHours = employee.minRestHours?.toString() || '8';
			seniority = employee.seniority?.toString() || '0';
			isFullTime = employee.isFullTime || false;
			skills = employee.skills || [];
			shiftTypePreferences = employee.shiftTypePreferences || [];
		} else {
			// Creating new employee - reset form
			name = '';
			email = '';
			role = 'EMPLOYEE';
			defaultHourlyRate = '';
			phoneNumber = '';
			preferredLocationId = locations[0]?.id || '';
			maxHoursPerWeek = '';
			minHoursPerWeek = '';
			maxConsecutiveDays = '6';
			minRestHours = '8';
			seniority = '0';
			isFullTime = false;
			skills = [];
			shiftTypePreferences = [];
		}
	});

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
				maxHoursPerWeek = '';
				minHoursPerWeek = '';
				maxConsecutiveDays = '6';
				minRestHours = '8';
				seniority = '0';
				isFullTime = false;
				skills = [];
				shiftTypePreferences = [];
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
						name="employee-name"
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
						name="employee-email"
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
						name="employee-phone"
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

				<!-- Scheduling Preferences Section -->
				<div class="border-t border-slate-200 dark:border-slate-700 pt-6">
					<div class="flex items-center gap-2 mb-4">
						<svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white">
							Scheduling Preferences
						</h3>
					</div>
					<p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
						These settings help the auto-scheduler assign shifts more effectively
					</p>

					<!-- Employment Status -->
					<div class="mb-6">
						<label class="flex items-center gap-3 p-4 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors {isFullTime ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500' : ''}">
							<input
								type="checkbox"
								bind:checked={isFullTime}
								class="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
							/>
							<div class="flex-1">
								<div class="font-medium text-slate-900 dark:text-white">
									Full-time employee
								</div>
								<div class="text-sm text-slate-600 dark:text-slate-400">
									Eligible for more hours and benefits
								</div>
							</div>
						</label>
					</div>

					<!-- Hours Constraints -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
						<div>
							<Input
								type="number"
								label="Minimum Hours/Week"
								bind:value={minHoursPerWeek}
								min="0"
								max="168"
								placeholder="0"
							/>
							<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
								Scheduler will try to meet this target
							</p>
						</div>
						<div>
							<Input
								type="number"
								label="Maximum Hours/Week"
								bind:value={maxHoursPerWeek}
								min="0"
								max="168"
								placeholder="40"
							/>
							<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
								Won't be scheduled beyond this limit
							</p>
						</div>
					</div>

					<!-- Rest & Consecutive Days -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
						<div>
							<Input
								type="number"
								label="Seniority (Years)"
								bind:value={seniority}
								min="0"
								max="50"
								placeholder="0"
							/>
						</div>
						<div>
							<Input
								type="number"
								label="Max Consecutive Days"
								bind:value={maxConsecutiveDays}
								min="1"
								max="14"
								placeholder="6"
							/>
						</div>
						<div>
							<Input
								type="number"
								label="Min Rest Hours"
								bind:value={minRestHours}
								min="1"
								max="24"
								placeholder="8"
							/>
						</div>
					</div>

					<!-- Skills -->
					<div class="mb-6">
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Skills & Certifications
						</label>
						<div class="space-y-3">
							<!-- Skill Tags -->
							{#if skills.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each skills as skill}
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
									placeholder="Add a skill (e.g., Bartender, Cook)"
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

							<!-- Common Skills Quick Add -->
							<div class="flex flex-wrap gap-2">
								{#each skillOptions.filter(s => !skills.includes(s)) as skillOption}
									<button
										type="button"
										onclick={() => skills = [...skills, skillOption]}
										class="px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
									>
										+ {skillOption}
									</button>
								{/each}
							</div>
						</div>
					</div>

					<!-- Shift Type Preferences -->
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
							Preferred Shift Times
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{#each shiftTypeOptions as shiftType}
								<label class="flex items-center gap-3 p-3 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors {shiftTypePreferences.includes(shiftType.value) ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500' : ''}">
									<input
										type="checkbox"
										checked={shiftTypePreferences.includes(shiftType.value)}
										onchange={() => toggleShiftType(shiftType.value)}
										class="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
									/>
									<div class="flex-1">
										<div class="font-medium text-sm text-slate-900 dark:text-white">
											{shiftType.label}
										</div>
									</div>
								</label>
							{/each}
						</div>
						<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
							Select preferred times to get priority for those shifts
						</p>
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
