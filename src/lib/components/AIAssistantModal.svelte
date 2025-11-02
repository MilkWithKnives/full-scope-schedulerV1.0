<script lang="ts">
	import Button from './Button.svelte';
	import { marked } from 'marked';

	interface Props {
		open: boolean;
		title?: string;
		loading?: boolean;
		aiResponse?: string;
		onClose: () => void;
		onAskAI?: (question: string) => void;
	}

	let {
		open = $bindable(false),
		title = 'AI Scheduling Assistant',
		loading = false,
		aiResponse = '',
		onClose,
		onAskAI
	}: Props = $props();

	let userQuestion = $state('');

	function handleAskAI() {
		if (userQuestion.trim() && onAskAI) {
			onAskAI(userQuestion.trim());
			userQuestion = '';
		}
	}

	function handleClose() {
		userQuestion = '';
		onClose();
	}

	// Convert markdown to HTML
	const formattedResponse = $derived(aiResponse ? marked(aiResponse) : '');
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary-500 to-primary-600">
				<div class="flex items-center gap-3">
					<div class="text-3xl">🤖</div>
					<div>
						<h2 class="text-xl font-bold text-white">{title}</h2>
						<p class="text-sm text-primary-100">Powered by Claude AI</p>
					</div>
				</div>
				<button
					type="button"
					onclick={handleClose}
					class="text-white hover:text-primary-100 transition-colors p-2"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if loading}
					<div class="flex items-center justify-center py-12">
						<div class="text-center">
							<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
							<p class="text-slate-600 dark:text-slate-400">
								Claude is analyzing your schedule...
							</p>
						</div>
					</div>
				{:else if aiResponse}
					<div class="prose prose-slate dark:prose-invert max-w-none">
						{@html formattedResponse}
					</div>
				{:else}
					<div class="text-center py-12">
						<div class="text-6xl mb-4">🤔</div>
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">
							How can I help with your schedule?
						</h3>
						<p class="text-slate-600 dark:text-slate-400 mb-6">
							I can suggest solutions for coverage gaps, optimize shift assignments,<br />
							or help you build a complete schedule from scratch.
						</p>
					</div>
				{/if}
			</div>

			<!-- Footer with chat input -->
			{#if onAskAI}
				<div class="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
					<form onsubmit={(e) => { e.preventDefault(); handleAskAI(); }} class="flex gap-2">
						<input
							type="text"
							bind:value={userQuestion}
							placeholder="Ask Claude for help... (e.g., 'How do I cover Wednesday morning?')"
							class="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
							disabled={loading}
						/>
						<Button
							type="submit"
							variant="primary"
							disabled={!userQuestion.trim() || loading}
						>
							Ask AI
						</Button>
					</form>
				</div>
			{/if}

			<!-- Action buttons -->
			<div class="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
				<Button variant="ghost" onclick={handleClose}>
					Close
				</Button>
				{#if aiResponse && !loading}
					<Button
						variant="secondary"
						onclick={() => {
							navigator.clipboard.writeText(aiResponse);
						}}
					>
						📋 Copy Suggestions
					</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.prose) {
		@apply text-slate-700 dark:text-slate-300;
	}

	:global(.prose h1),
	:global(.prose h2),
	:global(.prose h3) {
		@apply text-slate-900 dark:text-white font-bold;
	}

	:global(.prose ul),
	:global(.prose ol) {
		@apply space-y-2;
	}

	:global(.prose strong) {
		@apply text-slate-900 dark:text-white font-semibold;
	}

	:global(.prose code) {
		@apply bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-sm;
	}
</style>
