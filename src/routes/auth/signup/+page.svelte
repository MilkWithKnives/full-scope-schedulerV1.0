<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let email = $state(form?.email || '');
	let name = $state(form?.name || '');
	let organizationName = $state(form?.organizationName || '');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let passwordError = $state('');

	function handleSubmit(e: Event) {
		passwordError = '';

		if (password !== confirmPassword) {
			e.preventDefault();
			passwordError = 'Passwords do not match';
			return;
		}

		if (password.length < 8) {
			e.preventDefault();
			passwordError = 'Password must be at least 8 characters';
			return;
		}

		loading = true;
	}
</script>

<svelte:head>
	<title>Sign Up - ShiftHappens</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-slate-900 dark:text-white mb-2">
				<span class="text-primary-500">ShiftHappens</span>
			</h1>
			<p class="text-slate-600 dark:text-slate-400">Let's get you set up ✨</p>
		</div>

		<!-- Signup Card -->
		<div class="card p-8">
			<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Get started</h2>

			{#if form?.error}
				<div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
				</div>
			{/if}

			<form method="POST" onsubmit={handleSubmit} class="space-y-4">
				<!-- Organization Name -->
				<div>
					<Input
						type="text"
						name="organizationName"
						label="Organization Name"
						placeholder="Acme Restaurant Group"
						bind:value={organizationName}
						required
						autocomplete="organization"
					/>
				</div>

				<!-- Your Name -->
				<div>
					<Input
						type="text"
						name="name"
						label="Your Name"
						placeholder="John Doe"
						bind:value={name}
						required
						autocomplete="name"
					/>
				</div>

				<!-- Email -->
				<div>
					<Input
						type="email"
						name="email"
						label="Email"
						placeholder="john@acme.com"
						bind:value={email}
						required
						autocomplete="email"
					/>
				</div>

				<!-- Password -->
				<div>
					<Input
						type="password"
						name="password"
						label="Password"
						placeholder="••••••••"
						bind:value={password}
						error={passwordError}
						required
						autocomplete="new-password"
					/>
					<p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
						Must be at least 8 characters
					</p>
				</div>

				<!-- Confirm Password -->
				<div>
					<Input
						type="password"
						name="confirmPassword"
						label="Confirm Password"
						placeholder="••••••••"
						bind:value={confirmPassword}
						error={passwordError}
						required
						autocomplete="new-password"
					/>
				</div>

				<!-- Submit Button -->
				<div class="pt-2">
					<Button type="submit" variant="primary" {loading} class="w-full">
						{loading ? 'Creating Account...' : 'Create Account'}
					</Button>
				</div>
			</form>

			<!-- Login Link -->
			<div class="mt-6 text-center">
				<p class="text-sm text-slate-600 dark:text-slate-400">
					Already have an account?
					<a href="/auth/login" class="text-primary-500 hover:text-primary-600 font-medium">
						Log in
					</a>
				</p>
			</div>
		</div>

		<!-- Info -->
		<div class="mt-6 text-center">
			<p class="text-xs text-slate-500 dark:text-slate-400">
				You'll be the owner of your organization.<br />
				Add your team after you sign up.
			</p>
		</div>
	</div>
</div>
