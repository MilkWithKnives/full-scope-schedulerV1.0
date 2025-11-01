<script lang="ts">
	import Button from './Button.svelte';
	import { toast } from 'svelte-sonner';
	import { formatTime, formatShortDate } from '$lib/utils/date';
	import AIAssistantModal from './AIAssistantModal.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		weekStart: string;
		shifts: any[];
		employees?: any[];
	}

	let { open = $bindable(), onClose, weekStart, shifts, employees = [] }: Props = $props();

	let loading = $state(false);
	let suggestions = $state<any>(null);
	let maxHoursPerWeek = $state(40);
	let costOptimization = $state(true);
	let selectedSuggestions = $state<Set<string>>(new Set());
	let showAIAssistant = $state(false);
	let aiResponse = $state('');
	let aiLoading = $state(false);

	async function handleGenerateSuggestions() {
		loading = true;

		const formData = new FormData();
		formData.append('weekStart', weekStart);
		formData.append('maxHoursPerWeek', maxHoursPerWeek.toString());
		formData.append('costOptimization', costOptimization.toString());

		try {
			const response = await fetch('?/autoSchedule', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success' && result.data?.result) {
				suggestions = result.data.result;
				// Select all suggestions by default
				selectedSuggestions = new Set(suggestions.suggestions.map((s: any) => s.shiftId));
				toast.success('Schedule suggestions generated!');

				// Auto-show AI assistant if there are coverage gaps
				if (suggestions.coverageGaps && suggestions.coverageGaps.length > 0) {
					setTimeout(() => handleGetAISuggestions(), 500);
				}
			} else {
				toast.error(result.data?.error || 'Failed to generate suggestions');
			}
		} catch (error) {
			console.error('Generate suggestions error:', error);
			toast.error('Something went wrong');
		} finally {
			loading = false;
		}
	}

	async function handleGetAISuggestions() {
		if (!suggestions || (!suggestions.coverageGaps?.length && !suggestions.unassignableShifts?.length)) {
			toast.error('No coverage gaps to analyze');
			return;
		}

		aiLoading = true;
		showAIAssistant = true;

		const formData = new FormData();
		formData.append('coverageGaps', JSON.stringify(suggestions.coverageGaps || []));
		formData.append('employees', JSON.stringify(employees));
		formData.append('shifts', JSON.stringify(shifts));

		try {
			const response = await fetch('?/getAISuggestions', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success' && result.data?.aiResponse) {
				aiResponse = result.data.aiResponse;
			} else {
				aiResponse = 'Unable to generate AI suggestions. Please try again.';
			}
		} catch (error) {
			console.error('AI suggestions error:', error);
			aiResponse = 'Failed to connect to AI assistant. Please check your API key and try again.';
		} finally {
			aiLoading = false;
		}
	}

	async function handleAskAI(question: string) {
		aiLoading = true;

		const formData = new FormData();
		formData.append('question', question);
		formData.append('employees', JSON.stringify(employees));
		formData.append('shifts', JSON.stringify(shifts));

		try {
			const response = await fetch('?/askAIAssistant', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success' && result.data?.aiResponse) {
				aiResponse = result.data.aiResponse;
			} else {
				aiResponse = 'Unable to get AI response. Please try again.';
			}
		} catch (error) {
			console.error('AI ask error:', error);
			aiResponse = 'Failed to connect to AI assistant.';
		} finally {
			aiLoading = false;
		}
	}

	async function handleApplySuggestions() {
		if (selectedSuggestions.size === 0) {
			toast.error('No suggestions selected');
			return;
		}

		loading = true;

		const suggestionsToApply = suggestions.suggestions.filter((s: any) =>
			selectedSuggestions.has(s.shiftId)
		);

		const formData = new FormData();
		formData.append('suggestions', JSON.stringify(suggestionsToApply));

		try {
			const response = await fetch('?/applyScheduleSuggestions', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success') {
				toast.success(`Applied ${result.data?.updatedCount} assignments!`);
				onClose();
				window.location.reload(); // Reload to show updated schedule
			} else {
				toast.error(result.data?.error || 'Failed to apply suggestions');
			}
		} catch (error) {
			console.error('Apply suggestions error:', error);
			toast.error('Something went wrong');
		} finally {
			loading = false;
		}
	}

	function toggleSuggestion(shiftId: string) {
		if (selectedSuggestions.has(shiftId)) {
			selectedSuggestions.delete(shiftId);
		} else {
			selectedSuggestions.add(shiftId);
		}
		selectedSuggestions = new Set(selectedSuggestions); // Trigger reactivity
	}

	function getShiftDetails(shiftId: string) {
		return shifts.find((s) => s.id === shiftId);
	}

	function getScoreColor(score: number): string {
		if (score >= 80) return 'text-green-600 dark:text-green-400';
		if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-orange-600 dark:text-orange-400';
	}

	// Reset when modal closes
	$effect(() => {
		if (!open) {
			setTimeout(() => {
				suggestions = null;
				selectedSuggestions = new Set();
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
			class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700"
			>
				<div>
					<h2 class="text-2xl font-bold text-slate-900 dark:text-white">
						🤖 Auto-Schedule Assistant
					</h2>
					<p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
						AI-powered shift assignments based on availability and preferences
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
			<div class="p-6">
				{#if !suggestions}
					<!-- Configuration Step -->
					<div class="space-y-6">
						<div class="card p-6 bg-primary-50 dark:bg-primary-900/20">
							<h3 class="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-2">
								How it works
							</h3>
							<ul class="text-sm text-primary-800 dark:text-primary-200 space-y-1">
								<li>✓ Analyzes employee availability and preferences</li>
								<li>✓ Considers work-life balance (max hours, rest time)</li>
								<li>✓ Optimizes for cost and fair distribution</li>
								<li>✓ Avoids scheduling conflicts automatically</li>
							</ul>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
									Max Hours per Week
								</label>
								<input
									type="number"
									bind:value={maxHoursPerWeek}
									min="20"
									max="60"
									class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>

							<div class="flex items-end">
								<label class="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={costOptimization}
										class="w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
									/>
									<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
										Optimize for labor cost
									</span>
								</label>
							</div>
						</div>

						<Button
							variant="primary"
							onclick={handleGenerateSuggestions}
							loading={loading}
							class="w-full"
						>
							{loading ? 'Analyzing...' : '🎯 Generate Suggestions'}
						</Button>
					</div>
				{:else}
					<!-- Results Step -->
					<div class="space-y-6">
						<!-- Stats -->
						<div class="grid grid-cols-3 gap-4">
							<div class="card p-4 text-center">
								<div class="text-2xl font-bold text-green-600 dark:text-green-400">
									{suggestions.stats.assignableShifts}
								</div>
								<div class="text-sm text-slate-600 dark:text-slate-400">Assignable</div>
							</div>
							<div class="card p-4 text-center">
								<div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
									{suggestions.unassignableShifts.length}
								</div>
								<div class="text-sm text-slate-600 dark:text-slate-400">Unassignable</div>
							</div>
							<div class="card p-4 text-center">
								<div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
									{suggestions.stats.averageScore}
								</div>
								<div class="text-sm text-slate-600 dark:text-slate-400">Avg Score</div>
							</div>
						</div>

						<!-- Suggestions List -->
						<div>
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-lg font-semibold text-slate-900 dark:text-white">
									Suggested Assignments ({selectedSuggestions.size}/{suggestions.suggestions.length})
								</h3>
								<button
									type="button"
									onclick={() => {
										if (selectedSuggestions.size === suggestions.suggestions.length) {
											selectedSuggestions = new Set();
										} else {
											selectedSuggestions = new Set(
												suggestions.suggestions.map((s: any) => s.shiftId)
											);
										}
									}}
									class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
								>
									{selectedSuggestions.size === suggestions.suggestions.length
										? 'Deselect All'
										: 'Select All'}
								</button>
							</div>

							<div class="space-y-3 max-h-[400px] overflow-y-auto">
								{#each suggestions.suggestions as suggestion}
									{@const shift = getShiftDetails(suggestion.shiftId)}
									<label
										class="block p-4 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors {selectedSuggestions.has(
											suggestion.shiftId
										)
											? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
											: ''}"
									>
										<div class="flex items-start gap-3">
											<input
												type="checkbox"
												checked={selectedSuggestions.has(suggestion.shiftId)}
												onchange={() => toggleSuggestion(suggestion.shiftId)}
												class="mt-1 w-5 h-5 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
											/>

											<div class="flex-1">
												<div class="flex items-center gap-3 mb-2">
													<span class="font-medium text-slate-900 dark:text-white">
														{suggestion.employeeName}
													</span>
													<span class="text-sm {getScoreColor(suggestion.score)} font-medium">
														Score: {suggestion.score}/100
													</span>
												</div>

												{#if shift}
													<div class="text-sm text-slate-600 dark:text-slate-400 mb-2">
														{formatShortDate(shift.startTime)} • {formatTime(shift.startTime)} - {formatTime(
															shift.endTime
														)} • {shift.location.name} • {shift.role}
													</div>
												{/if}

												<div class="flex flex-wrap gap-1.5">
													{#each suggestion.reasons as reason}
														<span
															class="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded"
														>
															✓ {reason}
														</span>
													{/each}
													{#each suggestion.warnings as warning}
														<span
															class="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs rounded"
														>
															⚠ {warning}
														</span>
													{/each}
												</div>
											</div>
										</div>
									</label>
								{/each}
							</div>
						</div>

						<!-- Unassignable Shifts -->
						{#if suggestions.unassignableShifts.length > 0 || suggestions.coverageGaps?.length > 0}
							<div class="card p-4 bg-orange-50 dark:bg-orange-900/20">
								<div class="flex items-center justify-between mb-2">
									<h4 class="text-sm font-semibold text-orange-900 dark:text-orange-100">
										⚠ Coverage Gaps ({suggestions.unassignableShifts.length})
									</h4>
									<Button
										variant="secondary"
										size="sm"
										onclick={handleGetAISuggestions}
										class="text-xs"
									>
										🤖 Get AI Help
									</Button>
								</div>
								<div class="text-sm text-orange-800 dark:text-orange-200 space-y-1">
									{#each suggestions.unassignableShifts as unassignable}
										{@const shift = getShiftDetails(unassignable.shiftId)}
										{#if shift}
											<div>
												{formatShortDate(shift.startTime)} {formatTime(shift.startTime)} - {shift
													.location.name}: {unassignable.reasons.join(', ')}
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/if}

						<!-- Actions -->
						<div class="flex gap-3">
							<Button
								variant="ghost"
								onclick={() => {
									suggestions = null;
									selectedSuggestions = new Set();
								}}
								class="flex-1"
							>
								← Back
							</Button>
							<Button
								variant="primary"
								onclick={handleApplySuggestions}
								loading={loading}
								disabled={selectedSuggestions.size === 0}
								class="flex-1"
							>
								{loading ? 'Applying...' : `Apply ${selectedSuggestions.size} Assignments`}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- AI Assistant Modal -->
<AIAssistantModal
	bind:open={showAIAssistant}
	title="AI Scheduling Assistant"
	loading={aiLoading}
	aiResponse={aiResponse}
	onClose={() => (showAIAssistant = false)}
	onAskAI={handleAskAI}
/>
