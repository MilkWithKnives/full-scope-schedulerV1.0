<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';

	let { data }: { data: PageData } = $props();

	let showTemplateModal = $state(false);
	let selectedTemplate = $state<any | null>(null);
	let showApplyModal = $state(false);
	let selectedTemplates = $state(new SvelteSet<string>());
	let weekStart = $state(new Date().toISOString().split('T')[0]);

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	function handleCreateTemplate() {
		selectedTemplate = null;
		showTemplateModal = true;
	}

	function handleEditTemplate(template: any) {
		selectedTemplate = template;
		showTemplateModal = true;
	}

	async function handleDeleteTemplate(templateId: string) {
		if (!confirm('Are you sure you want to delete this template?')) return;

		const formData = new FormData();
		formData.append('templateId', templateId);

		try {
			const response = await fetch('?/deleteTemplate', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Template deleted');
				window.location.reload();
			} else {
				toast.error('Failed to delete template');
			}
		} catch (error) {
			console.error('Delete error:', error);
			toast.error('Something went wrong');
		}
	}

	function toggleTemplateSelection(templateId: string) {
		if (selectedTemplates.has(templateId)) {
			selectedTemplates.delete(templateId);
		} else {
			selectedTemplates.add(templateId);
		}
		selectedTemplates = new SvelteSet(selectedTemplates);
	}

	async function handleApplyTemplates() {
		if (selectedTemplates.size === 0) {
			toast.error('Please select at least one template');
			return;
		}

		const formData = new FormData();
		formData.append('weekStart', weekStart);
		formData.append('templateIds', JSON.stringify(Array.from(selectedTemplates)));

		try {
			const response = await fetch('?/applyTemplates', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				toast.success(`Created ${result.data?.count} shifts from templates!`);
				showApplyModal = false;
				selectedTemplates = new SvelteSet();
			} else {
				toast.error(result.data?.error || 'Failed to apply templates');
			}
		} catch (error) {
			console.error('Apply error:', error);
			toast.error('Something went wrong');
		}
	}

	// Group templates by day of week
	const templatesByDay = $derived.by(() => {
		const grouped: Record<number, typeof data.templates> = {};
		for (let i = 0; i < 7; i++) {
			grouped[i] = [];
		}
		data.templates.forEach((template) => {
			grouped[template.dayOfWeek].push(template);
		});
		return grouped;
	});
</script>

<svelte:head>
	<title>Shift Templates - ShiftHappens</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Shift Templates</h1>
			<p class="text-slate-600 dark:text-slate-400 mt-1">
				Create reusable shift patterns for recurring schedules
			</p>
		</div>

		<div class="flex gap-3">
			<Button variant="secondary" onclick={() => (showApplyModal = true)}>
				📋 Apply Templates
			</Button>
			<Button variant="primary" onclick={handleCreateTemplate}>
				➕ Create Template
			</Button>
		</div>
	</div>

	<!-- Templates by Day -->
	{#each [1, 2, 3, 4, 5, 6, 0] as dayIndex}
		{@const dayTemplates = templatesByDay[dayIndex]}
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
				{dayNames[dayIndex]} ({dayTemplates.length})
			</h2>

			{#if dayTemplates.length === 0}
				<div class="text-center py-8 text-slate-500 dark:text-slate-400">
					No templates for this day
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each dayTemplates as template}
						<div
							class="p-4 border border-slate-200 dark:border-slate-700 rounded-lg {template.isActive
								? ''
								: 'opacity-50'}"
						>
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white mb-1">
										{template.name}
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400">
										{template.startTime} - {template.endTime}
									</div>
								</div>
								<div
									class="px-2 py-1 text-xs font-medium rounded {template.isActive
										? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
										: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}"
								>
									{template.isActive ? 'Active' : 'Inactive'}
								</div>
							</div>

							<div class="text-sm text-slate-600 dark:text-slate-400 mb-3">
								<div>Role: {template.role}</div>
								<div>Break: {template.breakMinutes} min</div>
							</div>

							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => handleEditTemplate(template)}
									class="flex-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded transition-colors"
								>
									Edit
								</button>
								<button
									type="button"
									onclick={() => handleDeleteTemplate(template.id)}
									class="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
								>
									Delete
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	<!-- Empty State -->
	{#if data.templates.length === 0}
		<div class="card p-12 text-center">
			<div class="text-5xl mb-4">📋</div>
			<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
				No templates yet
			</h3>
			<p class="text-slate-600 dark:text-slate-400 mb-6">
				Create reusable shift templates to quickly build recurring schedules
			</p>
			<Button variant="primary" onclick={handleCreateTemplate}>
				➕ Create Your First Template
			</Button>
		</div>
	{/if}
</div>

<!-- Template Modal (we'll create this component next) -->
{#if showTemplateModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
		<div
			class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full"
			onclick={(e) => e.stopPropagation()}
		>
			<div
				class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700"
			>
				<h2 class="text-2xl font-bold text-slate-900 dark:text-white">
					{selectedTemplate ? 'Edit Template' : 'Create Template'}
				</h2>
				<button
					type="button"
					onclick={() => (showTemplateModal = false)}
					class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl"
				>
					✕
				</button>
			</div>

			<form
				method="POST"
				action={selectedTemplate ? '?/updateTemplate' : '?/createTemplate'}
				class="p-6 space-y-4"
			>
				{#if selectedTemplate}
					<input type="hidden" name="templateId" value={selectedTemplate.id} />
				{/if}

				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Template Name *
					</label>
					<input
						type="text"
						name="name"
						value={selectedTemplate?.name || ''}
						required
						placeholder="e.g., Morning Server Shift"
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Day of Week *
						</label>
						<select
							name="dayOfWeek"
							required
							value={selectedTemplate?.dayOfWeek ?? 1}
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						>
							{#each dayNames as day, index}
								<option value={index}>{day}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Location
						</label>
						<select
							name="locationId"
							value={selectedTemplate?.locationId || ''}
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						>
							<option value="">Any Location</option>
							{#each data.locations as location}
								<option value={location.id}>{location.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Start Time *
						</label>
						<input
							type="time"
							name="startTime"
							value={selectedTemplate?.startTime || '09:00'}
							required
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							End Time *
						</label>
						<input
							type="time"
							name="endTime"
							value={selectedTemplate?.endTime || '17:00'}
							required
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
							Break (min)
						</label>
						<input
							type="number"
							name="breakMinutes"
							value={selectedTemplate?.breakMinutes || 30}
							min="0"
							class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Role *
					</label>
					<input
						type="text"
						name="role"
						value={selectedTemplate?.role || ''}
						required
						placeholder="e.g., Server, Cook, Manager"
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>

				{#if selectedTemplate}
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							name="isActive"
							value="true"
							checked={selectedTemplate.isActive}
							class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
						/>
						<label class="text-sm font-medium text-slate-700 dark:text-slate-300">
							Template is active
						</label>
					</div>
				{/if}

				<div class="flex gap-3 pt-4">
					<Button type="button" variant="ghost" onclick={() => (showTemplateModal = false)}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" class="flex-1">
						{selectedTemplate ? 'Update Template' : 'Create Template'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Apply Templates Modal -->
{#if showApplyModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" tabindex="-1">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<div
				class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700"
			>
				<h2 class="text-2xl font-bold text-slate-900 dark:text-white">Apply Templates</h2>
				<button
					type="button"
					onclick={() => {
						showApplyModal = false;
						selectedTemplates = new SvelteSet();
					}}
					class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl"
				>
					✕
				</button>
			</div>

			<div class="p-6 space-y-6">
				<div>
					<label for="week-start-date" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Week Starting Date
					</label>
					<input
						id="week-start-date"
						type="date"
						bind:value={weekStart}
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>

				<div>
					<div class="flex items-center justify-between mb-3">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white">
							Select Templates ({selectedTemplates.size}/{data.templates.filter((t) => t.isActive)
								.length})
						</h3>
						<button
							type="button"
							onclick={() => {
								const active = data.templates.filter((t) => t.isActive);
								if (selectedTemplates.size === active.length) {
									selectedTemplates = new SvelteSet();
								} else {
									selectedTemplates = new SvelteSet(active.map((t) => t.id));
								}
							}}
							class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
						>
							{selectedTemplates.size === data.templates.filter((t) => t.isActive).length
								? 'Deselect All'
								: 'Select All'}
						</button>
					</div>

					<div class="space-y-2">
						{#each data.templates.filter((t) => t.isActive) as template}
							<label
								class="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 {selectedTemplates.has(
									template.id
								)
									? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
									: ''}"
							>
								<input
									type="checkbox"
									checked={selectedTemplates.has(template.id)}
									onchange={() => toggleTemplateSelection(template.id)}
									class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
								/>
								<div class="flex-1">
									<div class="font-medium text-slate-900 dark:text-white">
										{template.name}
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400">
										{dayNames[template.dayOfWeek]} • {template.startTime} - {template.endTime} • {template.role}
									</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<div class="flex gap-3">
					<Button
						type="button"
						variant="ghost"
						onclick={() => {
							showApplyModal = false;
							selectedTemplates = new SvelteSet();
						}}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						onclick={handleApplyTemplates}
						disabled={selectedTemplates.size === 0}
						class="flex-1"
					>
						Apply {selectedTemplates.size} Template{selectedTemplates.size !== 1 ? 's' : ''}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
