<script lang="ts">
	import { page } from '$app/stores';
	import { signOut } from '@auth/sveltekit/client';
	import Button from '$lib/components/Button.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let sidebarOpen = $state(false);
	let userMenuOpen = $state(false);

	// Navigation items
	const navItems = [
		{ href: '/dashboard', label: 'Home', icon: '📊' },
		{ href: '/dashboard/my-schedule', label: 'My Schedule', icon: '📅', employeeOnly: true },
		{ href: '/dashboard/shift-swap', label: 'Shift Swap', icon: '🔄', employeeOnly: true },
		{ href: '/dashboard/availability', label: 'Availability', icon: '⏰', employeeOnly: true },
		{ href: '/dashboard/time-off', label: 'Time Off', icon: '🏖️' },
		{ href: '/dashboard/team', label: 'Team', icon: '👥' },
		{ href: '/dashboard/schedule', label: 'Schedule', icon: '📅', adminOnly: true },
		{ href: '/dashboard/templates', label: 'Templates', icon: '📋', adminOnly: true },
		{ href: '/dashboard/reports', label: 'Reports', icon: '📈', adminOnly: true },
		{ href: '/dashboard/locations', label: 'Locations', icon: '📍', adminOnly: true },
		{ href: '/dashboard/settings', label: 'Settings', icon: '⚙️' }
	];

	// Filter nav items based on user role
	const isAdmin = $derived(data.user.role === 'OWNER' || data.user.role === 'MANAGER');
	const filteredNavItems = $derived(
		navItems.filter((item) => {
			if (item.adminOnly && !isAdmin) return false;
			if (item.employeeOnly && isAdmin) return false;
			return true;
		})
	);

	// Check if route is active
	function isActive(href: string) {
		if (href === '/dashboard') {
			return $page.url.pathname === '/dashboard';
		}
		return $page.url.pathname.startsWith(href);
	}

	async function handleSignOut() {
		await signOut({ callbackUrl: '/auth/login' });
	}
</script>

<svelte:head>
	<title>{$page.url.pathname.split('/').pop() || 'Dashboard'} - ShiftHappens</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900">
	<!-- Mobile sidebar backdrop -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
			onclick={() => (sidebarOpen = false)}
			role="button"
			tabindex="0"
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 z-50 {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'} lg:translate-x-0"
	>
		<!-- Logo -->
		<div class="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
			<h1 class="text-xl font-bold">
				<span class="text-primary-500">ShiftHappens</span>
			</h1>
		</div>

		<!-- Navigation -->
		<nav class="p-4 space-y-1">
			{#each filteredNavItems as item}
				<a
					href={item.href}
					class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors {isActive(
						item.href
					)
						? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
						: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}"
				>
					<span class="text-lg">{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- User section -->
		<div class="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
			<div class="relative">
				<button
					type="button"
					onclick={() => (userMenuOpen = !userMenuOpen)}
					class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
				>
					<div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
						{data.user.name.charAt(0).toUpperCase()}
					</div>
					<div class="flex-1 text-left">
						<div class="font-medium">{data.user.name}</div>
						<div class="text-xs text-slate-500 dark:text-slate-400">{data.user.role}</div>
					</div>
				</button>

				<!-- User dropdown -->
				{#if userMenuOpen}
					<div class="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
						<button
							type="button"
							onclick={handleSignOut}
							class="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
						>
							🚪 Sign Out
						</button>
					</div>
				{/if}
			</div>
		</div>
	</aside>

	<!-- Main content -->
	<div class="lg:pl-64">
		<!-- Top bar (mobile) -->
		<header class="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 lg:px-6">
			<button
				type="button"
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
				</svg>
			</button>

			<div class="ml-auto flex items-center gap-4">
				<span class="text-sm text-slate-600 dark:text-slate-400">
					{data.user.email}
				</span>
			</div>
		</header>

		<!-- Page content -->
		<main class="p-4 lg:p-6 pb-24 lg:pb-6">
			{@render children()}
		</main>
	</div>
</div>

<!-- Mobile bottom navigation -->
<MobileNav {isAdmin} />

<!-- Toast notifications -->
<Toast />
