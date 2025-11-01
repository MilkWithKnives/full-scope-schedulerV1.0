<script lang="ts">
	import { Toaster } from 'svelte-sonner';
</script>

<!-- Toast container - add this to root layout -->
<Toaster
	position="top-right"
	expand={true}
	richColors
	closeButton
	toastOptions={{
		style: 'background: var(--toast-bg); color: var(--toast-color); border: 1px solid var(--toast-border);',
		className: 'toast-custom',
		duration: 4000
	}}
/>

<style>
	:global(:root) {
		--toast-bg: white;
		--toast-color: #0f172a;
		--toast-border: #e2e8f0;
	}

	:global(.dark) {
		--toast-bg: #1e293b;
		--toast-color: #f1f5f9;
		--toast-border: #334155;
	}

	:global(.toast-custom) {
		border-radius: 0.75rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
	}
</style>
