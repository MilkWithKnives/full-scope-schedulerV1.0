<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let showRequestForm = $state(false);
	let startDate = $state('');
	let endDate = $state('');
	let reason = $state('');
	let submitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		submitting = true;

		const formData = new FormData();
		formData.append('startDate', startDate);
		formData.append('endDate', endDate);
		formData.append('reason', reason);

		try {
			const response = await fetch('?/requestTimeOff', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Time-off requested! 🏖️');
				window.location.reload();
			} else {
				toast.error('Failed to submit request');
			}
		} catch (error) {
			console.error('Submit error:', error);
			toast.error('Something went wrong');
		} finally {
			submitting = false;
		}
	}

	async function handleCancel(requestId: string) {
		const formData = new FormData();
		formData.append('requestId', requestId);

		try {
			const response = await fetch('?/cancelRequest', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Request cancelled');
				window.location.reload();
			} else {
				toast.error('Failed to cancel');
			}
		} catch (error) {
			console.error('Cancel error:', error);
			toast.error('Something went wrong');
		}
	}

	async function handleApprove(requestId: string) {
		const formData = new FormData();
		formData.append('requestId', requestId);

		try {
			const response = await fetch('?/approveRequest', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Request approved! ✅');
				window.location.reload();
			} else {
				toast.error('Failed to approve');
			}
		} catch (error) {
			console.error('Approve error:', error);
			toast.error('Something went wrong');
		}
	}

	async function handleReject(requestId: string) {
		const formData = new FormData();
		formData.append('requestId', requestId);

		try {
			const response = await fetch('?/rejectRequest', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toast.success('Request rejected');
				window.location.reload();
			} else {
				toast.error('Failed to reject');
			}
		} catch (error) {
			console.error('Reject error:', error);
			toast.error('Something went wrong');
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'APPROVED':
				return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
			case 'DENIED':
				return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
			default: // PENDING
				return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
		}
	}

	function getStatusLabel(status: string) {
		return status.charAt(0) + status.slice(1).toLowerCase();
	}
</script>

<svelte:head>
	<title>Time Off - ShiftHappens</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Time Off</h1>
			<p class="text-slate-600 dark:text-slate-400 mt-1">
				Request time off and track your requests
			</p>
		</div>
		{#if !showRequestForm}
			<Button variant="primary" onclick={() => (showRequestForm = true)}>
				Request Time Off
			</Button>
		{/if}
	</div>

	<!-- Request Form -->
	{#if showRequestForm}
		<div class="card p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white">New Time Off Request</h2>
				<button
					type="button"
					onclick={() => (showRequestForm = false)}
					class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
				>
					✕
				</button>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Input
							type="date"
							name="startDate"
							label="Start Date"
							bind:value={startDate}
							required
						/>
					</div>
					<div>
						<Input
							type="date"
							name="endDate"
							label="End Date"
							bind:value={endDate}
							required
						/>
					</div>
				</div>

				<div>
					<label for="time-off-reason" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Reason (optional)
					</label>
					<textarea
						id="time-off-reason"
						bind:value={reason}
						rows="3"
						placeholder="Why do you need time off?"
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
					></textarea>
				</div>

				<div class="flex gap-3">
					<Button type="submit" variant="primary" loading={submitting} class="flex-1">
						{submitting ? 'Submitting...' : 'Submit Request'}
					</Button>
					<Button type="button" variant="ghost" onclick={() => (showRequestForm = false)}>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Pending Requests for Managers -->
	{#if data.isAdmin && data.pendingRequests.length > 0}
		<div class="card p-6">
			<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
				Pending Requests ({data.pendingRequests.length})
			</h2>

			<div class="space-y-3">
				{#each data.pendingRequests as request}
					<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<div class="font-medium text-slate-900 dark:text-white mb-1">
									{request.User_TimeOffRequest_userIdToUser.name}
									<span class="text-sm text-slate-500">({request.User_TimeOffRequest_userIdToUser.role.toLowerCase()})</span>
								</div>
								<div class="text-sm text-slate-600 dark:text-slate-400">
									{format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
								</div>
								{#if request.reason}
									<div class="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">
										"{request.reason}"
									</div>
								{/if}
							</div>
							<div class="flex gap-2">
								<Button
									variant="primary"
									size="sm"
									onclick={() => handleApprove(request.id)}
								>
									Approve
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleReject(request.id)}
								>
									Reject
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- My Requests -->
	<div class="card p-6">
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">My Requests</h2>

		{#if data.myRequests.length === 0}
			<div class="text-center py-8">
				<div class="text-5xl mb-4">🏖️</div>
				<h3 class="text-lg font-medium text-slate-900 dark:text-white mb-2">
					No time-off requests yet
				</h3>
				<p class="text-slate-600 dark:text-slate-400">
					Click "Request Time Off" to get started
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.myRequests as request}
					<div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<div class="font-medium text-slate-900 dark:text-white">
										{format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
									</div>
									<div class="px-2 py-1 text-xs font-medium rounded border {getStatusColor(request.status)}">
										{getStatusLabel(request.status)}
									</div>
								</div>
								{#if request.reason}
									<div class="text-sm text-slate-600 dark:text-slate-400 italic mb-2">
										"{request.reason}"
									</div>
								{/if}
								{#if request.User_TimeOffRequest_reviewedByToUser}
									<div class="text-xs text-slate-500 dark:text-slate-400">
										Reviewed by {request.User_TimeOffRequest_reviewedByToUser.name}
									</div>
								{/if}
							</div>
							{#if request.status === 'PENDING'}
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleCancel(request.id)}
								>
									Cancel
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
