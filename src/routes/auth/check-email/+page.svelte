<script lang="ts">
	import { page } from '$app/stores';

	const email = $page.url.searchParams.get('email') || '';
</script>

<svelte:head>
	<title>Check Your Email - SvelteRoster</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
	<div class="w-full max-w-md">
		<div class="card p-8 text-center">
			<!-- Icon -->
			<div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
				</svg>
			</div>

			<!-- Heading -->
			<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
				Check your email
			</h1>

			<p class="text-slate-600 dark:text-slate-400 mb-6">
				We sent a verification link to<br>
				<span class="font-medium text-slate-900 dark:text-white">{email}</span>
			</p>

			<!-- Instructions -->
			<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
				<p class="text-sm text-blue-900 dark:text-blue-100 mb-2">
					<strong>Next steps:</strong>
				</p>
				<ol class="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
					<li>Check your inbox (and spam folder)</li>
					<li>Click the verification link</li>
					<li>You'll be redirected to login</li>
				</ol>
			</div>

			<!-- Info -->
			<p class="text-xs text-slate-500 dark:text-slate-400">
				The link expires in 24 hours. Didn't receive it?
				<a href="/auth/resend-verification?email={encodeURIComponent(email)}" class="text-primary-600 dark:text-primary-400 hover:underline">
					Resend email
				</a>
			</p>

			<!-- Back to login -->
			<div class="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
				<a href="/auth/login" class="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400">
					← Back to login
				</a>
			</div>
		</div>
	</div>
</div>
