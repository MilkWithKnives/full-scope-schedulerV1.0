<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		isAdmin: boolean;
	}

	let { isAdmin }: Props = $props();

	// Mobile-first nav items (most important for employees)
	const navItems = isAdmin
		? [
				{ href: '/dashboard', label: 'Home', icon: '📊' },
				{ href: '/dashboard/schedule', label: 'Schedule', icon: '📅' },
				{ href: '/dashboard/templates', label: 'Templates', icon: '📋' },
				{ href: '/dashboard/team', label: 'Team', icon: '👥' }
		  ]
		: [
				{ href: '/dashboard/my-schedule', label: 'Schedule', icon: '📅' },
				{ href: '/dashboard/shift-swap', label: 'Swap', icon: '🔄' },
				{ href: '/dashboard/team', label: 'Team', icon: '👥' },
				{ href: '/dashboard/time-off', label: 'Time Off', icon: '🏖️' }
		  ];

	function isActive(href: string): boolean {
		if (href === '/dashboard') {
			return $page.url.pathname === '/dashboard';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<!-- Fixed bottom navigation for mobile -->
<nav class="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 lg:hidden z-40">
	<div class="flex items-center justify-around px-2 py-3 safe-area-pb">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-0 transition-colors {isActive(item.href)
					? 'text-primary-500'
					: 'text-slate-600 dark:text-slate-400'}"
			>
				<span class="text-2xl">{item.icon}</span>
				<span class="text-xs font-medium truncate max-w-[60px]">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	/* Safe area for devices with home indicator */
	.safe-area-pb {
		padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
	}
</style>
