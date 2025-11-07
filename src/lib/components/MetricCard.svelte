<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		icon?: string;
		change?: number;
		trend?: 'up' | 'down';
		color?: 'primary' | 'blue' | 'green' | 'orange' | 'red' | 'purple';
		subtitle?: string;
	}

	let { label, value, icon, change, trend, color = 'primary', subtitle }: Props = $props();

	const colorClasses = {
		primary: 'text-primary-500',
		blue: 'text-blue-500',
		green: 'text-green-500',
		orange: 'text-orange-500',
		red: 'text-red-500',
		purple: 'text-purple-500'
	};

	const trendColor = $derived.by(() => {
		if (!change) return '';
		if (trend === 'down') {
			return change < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
		}
		return change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
	});

	const trendIcon = $derived.by(() => {
		if (!change) return '';
		return change > 0 ? '↑' : '↓';
	});
</script>

<div class="card p-6">
	<div class="flex items-start justify-between mb-3">
		{#if icon}
			<span class="text-2xl">{icon}</span>
		{/if}
		{#if change !== undefined}
			<div class="{trendColor} text-sm font-medium">
				{trendIcon} {Math.abs(change)}%
			</div>
		{/if}
	</div>

	<div class="mb-1">
		<div class="text-3xl font-bold {colorClasses[color]}">
			{value}
		</div>
	</div>

	<div class="text-sm text-slate-600 dark:text-slate-400">
		{label}
	</div>

	{#if subtitle}
		<div class="text-xs text-slate-500 dark:text-slate-500 mt-1">
			{subtitle}
		</div>
	{/if}
</div>
