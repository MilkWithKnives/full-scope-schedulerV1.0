<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'datetime-local' | 'time';
		name: string;
		label?: string;
		placeholder?: string;
		value?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		autocomplete?: AutoFill;
		class?: string;
		min?: string;
		max?: string;
		step?: string;
	}

	let {
		type = 'text',
		name,
		label,
		placeholder,
		value = $bindable(''),
		error,
		disabled = false,
		required = false,
		autocomplete,
		class: className = '',
		min,
		max,
		step
	}: Props = $props();

	const baseStyles =
		'w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all';

	const normalStyles =
		'border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-transparent';

	const errorStyles = 'border-red-500 focus:ring-red-500';

	const computedClass = `${baseStyles} ${error ? errorStyles : normalStyles} ${className}`;
</script>

{#if label}
	<label for={name} class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</label>
{/if}

<input
	id={name}
	{type}
	{name}
	{placeholder}
	bind:value
	{disabled}
	{required}
	{autocomplete}
	{min}
	{max}
	{step}
	class={computedClass}
	aria-invalid={error ? 'true' : 'false'}
	aria-describedby={error ? `${name}-error` : undefined}
/>

{#if error}
	<p id="{name}-error" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
		{error}
	</p>
{/if}
