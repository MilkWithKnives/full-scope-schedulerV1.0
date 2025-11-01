<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { signIn } from '@auth/sveltekit/client';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state<'password' | 'magicLink'>('password');
	let email = $state(form?.email || '');
	let password = $state('');
	let remember = $state(false);
	let loading = $state(false);
	let magicLinkLoading = $state(false);
	let magicLinkEmail = $state('');
	let magicLinkSent = $state(false);

	async function handlePasswordLogin(e: SubmitEvent) {
		e.preventDefault();
		loading = true;

		try {
			const result = await signIn('credentials', {
				email,
				password,
				redirect: false
			});

			if (result?.error) {
				// Handle error
				loading = false;
			} else {
				// Redirect to dashboard on success
				window.location.href = '/dashboard';
			}
		} catch (error) {
			console.error('Login error:', error);
			loading = false;
		}
	}

	async function handleMagicLink(e: SubmitEvent) {
		e.preventDefault();
		magicLinkLoading = true;

		try {
			await signIn('email', {
				email: magicLinkEmail,
				redirect: false
			});

			magicLinkSent = true;
			magicLinkLoading = false;
		} catch (error) {
			console.error('Magic link error:', error);
			magicLinkLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - ShiftHappens</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-slate-900 dark:text-white mb-2">
				<span class="text-primary-500">ShiftHappens</span>
			</h1>
			<p class="text-slate-600 dark:text-slate-400">Good to see you again 👋</p>
		</div>

		<!-- Success Messages -->
		{#if data.signupSuccess}
			<div class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
				<p class="text-sm text-green-600 dark:text-green-400">
					✓ Account created successfully! You can now log in.
				</p>
			</div>
		{/if}

		<!-- Login Card -->
		<div class="card p-8">
			<!-- Tabs -->
			<div class="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
				<button
					type="button"
					onclick={() => (activeTab = 'password')}
					class="flex-1 px-4 py-2 rounded-md font-medium transition-all {activeTab === 'password'
						? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm'
						: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					Password
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'magicLink')}
					class="flex-1 px-4 py-2 rounded-md font-medium transition-all {activeTab === 'magicLink'
						? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm'
						: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					Magic Link
				</button>
			</div>

			{#if activeTab === 'password'}
				<!-- Password Login -->
				<div>
					<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Sign in</h2>

					{#if form?.error}
						<div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
						</div>
					{/if}

					<form onsubmit={handlePasswordLogin} class="space-y-4">
						<div>
							<Input
								type="email"
								name="email"
								label="Email"
								placeholder="you@example.com"
								bind:value={email}
								required
								autocomplete="email"
							/>
						</div>

						<div>
							<Input
								type="password"
								name="password"
								label="Password"
								placeholder="••••••••"
								bind:value={password}
								required
								autocomplete="current-password"
							/>
						</div>

						<div class="flex items-center justify-between">
							<label class="flex items-center">
								<input
									type="checkbox"
									name="remember"
									bind:checked={remember}
									class="w-4 h-4 text-primary-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-primary-500"
								/>
								<span class="ml-2 text-sm text-slate-600 dark:text-slate-400">Remember me</span>
							</label>

							<a href="/auth/forgot-password" class="text-sm text-primary-500 hover:text-primary-600">
								Forgot password?
							</a>
						</div>

						<div class="pt-2">
							<Button type="submit" variant="primary" {loading} class="w-full">
								{loading ? 'Signing in...' : 'Sign in'}
							</Button>
						</div>
					</form>
				</div>
			{:else}
				<!-- Magic Link -->
				<div>
					<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Email me a link</h2>
					<p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
						No password needed—we'll email you a secure login link
					</p>

					{#if magicLinkSent}
						<div class="mb-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
							<div class="text-4xl mb-3">📧</div>
							<h3 class="font-semibold text-green-900 dark:text-green-100 mb-2">Check your email!</h3>
							<p class="text-sm text-green-600 dark:text-green-400">
								We sent a login link to <strong>{magicLinkEmail}</strong>
							</p>
							<p class="text-xs text-green-600 dark:text-green-400 mt-2">
								The link will expire in 24 hours.
							</p>
						</div>

						<Button
							variant="ghost"
							onclick={() => (magicLinkSent = false)}
							class="w-full"
						>
							Send another link
						</Button>
					{:else}
						{#if form?.magicLinkError}
							<div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
								<p class="text-sm text-red-600 dark:text-red-400">{form.magicLinkError}</p>
							</div>
						{/if}

						<form onsubmit={handleMagicLink} class="space-y-4">
							<div>
								<Input
									type="email"
									name="email"
									label="Email"
									placeholder="employee@example.com"
									bind:value={magicLinkEmail}
									required
									autocomplete="email"
								/>
								<p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
									Perfect for employees who haven't set up a password yet
								</p>
							</div>

							<div class="pt-2">
								<Button type="submit" variant="primary" loading={magicLinkLoading} class="w-full">
									{magicLinkLoading ? 'Sending...' : 'Send Magic Link'}
								</Button>
							</div>
						</form>
					{/if}
				</div>
			{/if}

			<!-- Signup Link -->
			<div class="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
				<p class="text-sm text-slate-600 dark:text-slate-400">
					Don't have an account?
					<a href="/auth/signup" class="text-primary-500 hover:text-primary-600 font-medium">
						Sign up
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
