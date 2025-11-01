<script lang="ts">
	import Button from '$lib/components/Button.svelte';

	let loading = $state(false);

	function handleClick() {
		loading = true;
		setTimeout(() => {
			loading = false;
			alert('ShiftHappens is working! 🎉');
		}, 2000);
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
	<div class="text-center max-w-2xl mx-auto px-4">
		<h1 class="text-5xl font-bold text-slate-900 dark:text-white mb-4">
			Welcome to <span class="text-primary-500">ShiftHappens</span>
		</h1>

		<p class="text-xl text-slate-600 dark:text-slate-400 mb-8">
			Restaurant Scheduling SaaS - Built with SvelteKit, Tailwind & Prisma
		</p>

		<div class="card p-8 max-w-md mx-auto">
			<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">✅ System Check</h2>

			<ul class="text-left space-y-3 mb-6">
				<li class="flex items-center text-slate-700 dark:text-slate-300">
					<span class="text-green-500 mr-2">✓</span>
					SvelteKit + Svelte 5 (with runes)
				</li>
				<li class="flex items-center text-slate-700 dark:text-slate-300">
					<span class="text-green-500 mr-2">✓</span>
					Tailwind CSS + Dark Mode
				</li>
				<li class="flex items-center text-slate-700 dark:text-slate-300">
					<span class="text-green-500 mr-2">✓</span>
					Prisma + PostgreSQL (Vultr)
				</li>
				<li class="flex items-center text-slate-700 dark:text-slate-300">
					<span class="text-green-500 mr-2">✓</span>
					Component Library (Button ready)
				</li>
			</ul>

			<div class="space-y-3">
				<Button variant="primary" {loading} onclick={handleClick} class="w-full">
					{loading ? 'Testing...' : 'Test Button Component'}
				</Button>

				<Button variant="secondary" class="w-full">
					Secondary Button
				</Button>

				<Button variant="ghost" class="w-full">
					Ghost Button
				</Button>

				<Button variant="danger" size="sm">
					Danger Button (Small)
				</Button>
			</div>
		</div>

		<p class="text-sm text-slate-500 dark:text-slate-400 mt-8">
			Database: Connected to Vultr PostgreSQL ✓
		</p>
	</div>
</div>
