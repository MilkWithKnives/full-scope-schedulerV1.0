<script lang="ts">
	interface DataPoint {
		label: string;
		value: number;
		color?: string;
		subtitle?: string;
	}

	interface Props {
		data: DataPoint[];
		maxValue?: number;
		height?: string;
		showValues?: boolean;
	}

	let { data, maxValue, height = 'h-8', showValues = true }: Props = $props();

	const max = $derived(maxValue || Math.max(...data.map((d) => d.value)));

	function getWidth(value: number): number {
		if (max === 0) return 0;
		return (value / max) * 100;
	}

	function getColor(color?: string): string {
		const colors: Record<string, string> = {
			primary: 'bg-primary-500',
			blue: 'bg-blue-500',
			green: 'bg-green-500',
			orange: 'bg-orange-500',
			red: 'bg-red-500',
			purple: 'bg-purple-500'
		};
		return colors[color || 'primary'] || 'bg-primary-500';
	}
</script>

<div class="space-y-4">
	{#each data as item}
		<div class="space-y-1.5">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium text-slate-900 dark:text-white">{item.label}</span>
				{#if showValues}
					<span class="text-slate-600 dark:text-slate-400">{item.value}</span>
				{/if}
			</div>

			<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full {height} overflow-hidden">
				<div
					class="{getColor(item.color)} {height} rounded-full transition-all duration-500 ease-out"
					style="width: {getWidth(item.value)}%"
				></div>
			</div>

			{#if item.subtitle}
				<div class="text-xs text-slate-500 dark:text-slate-500">
					{item.subtitle}
				</div>
			{/if}
		</div>
	{/each}
</div>
