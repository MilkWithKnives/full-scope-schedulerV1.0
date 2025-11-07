<script lang="ts">
	import { onMount } from 'svelte';

	let testResults: any[] = [];
	let isLoading = false;

	async function runTest(testType: string) {
		isLoading = true;
		try {
			const response = await fetch('/api/test-scheduler', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ testType })
			});

			const result = await response.json();
			testResults = [...testResults, { ...result, timestamp: new Date() }];
		} catch (error) {
			console.error('Test failed:', error);
			testResults = [...testResults, { 
				success: false, 
				error: error.message, 
				testType,
				timestamp: new Date() 
			}];
		} finally {
			isLoading = false;
		}
	}

	function clearResults() {
		testResults = [];
	}

	function getSolverColor(solver: string) {
		switch (solver) {
			case 'greedy': return 'bg-blue-100 text-blue-800';
			case 'ortools': return 'bg-green-100 text-green-800';
			case 'universal': return 'bg-purple-100 text-purple-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'OPTIMAL': return 'bg-green-100 text-green-800';
			case 'FEASIBLE': return 'bg-yellow-100 text-yellow-800';
			case 'INFEASIBLE': return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="container mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6">🚀 Multi-Solver Scheduler Test</h1>
	
	<div class="mb-6">
		<p class="text-gray-600 mb-4">
			Test the multi-solver scheduling system with different problem complexities.
			The system automatically chooses the best solver based on problem characteristics.
		</p>
		
		<div class="flex gap-4 mb-4">
			<button 
				class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
				onclick={() => runTest('simple')}
				disabled={isLoading}
			>
				🏃 Test Simple (Greedy)
			</button>
			
			<button 
				class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
				onclick={() => runTest('complex')}
				disabled={isLoading}
			>
				🔧 Test Complex (OR-Tools)
			</button>
			
			<button 
				class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
				onclick={() => runTest('multi-stage')}
				disabled={isLoading}
			>
				🌟 Test Multi-Stage (Universal)
			</button>
			
			<button 
				class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
				onclick={clearResults}
			>
				🗑️ Clear Results
			</button>
		</div>
		
		{#if isLoading}
			<div class="flex items-center gap-2 text-blue-600">
				<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
				Running test...
			</div>
		{/if}
	</div>

	{#if testResults.length > 0}
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">Test Results</h2>
			
			{#each testResults.reverse() as result}
				<div class="border rounded-lg p-4 {result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-3">
							<span class="font-semibold text-lg">{result.testType.toUpperCase()} Test</span>
							{#if result.success}
								<span class="px-2 py-1 rounded text-sm {getSolverColor(result.solver)}">
									{result.solver.toUpperCase()}
								</span>
								<span class="px-2 py-1 rounded text-sm {getStatusColor(result.status)}">
									{result.status}
								</span>
							{/if}
						</div>
						<span class="text-sm text-gray-500">
							{result.timestamp.toLocaleTimeString()}
						</span>
					</div>
					
					{#if result.success}
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
							<div>
								<div class="text-sm text-gray-600">Total Time</div>
								<div class="font-semibold">{result.totalTime}ms</div>
							</div>
							<div>
								<div class="text-sm text-gray-600">Solve Time</div>
								<div class="font-semibold">{result.solveTime}ms</div>
							</div>
							<div>
								<div class="text-sm text-gray-600">Coverage</div>
								<div class="font-semibold">{(result.coverage * 100).toFixed(1)}%</div>
							</div>
							<div>
								<div class="text-sm text-gray-600">Score</div>
								<div class="font-semibold">{result.score}</div>
							</div>
						</div>
						
						<div class="mb-3">
							<div class="text-sm text-gray-600">Assignments</div>
							<div class="font-semibold">{result.assignments} shifts assigned, {result.unassignable} unassignable</div>
						</div>
						
						<div class="mb-3">
							<div class="text-sm text-gray-600">Explanation</div>
							<div class="text-sm">{result.explanation}</div>
						</div>
						
						{#if result.aiExplanation}
							<div>
								<div class="text-sm text-gray-600">AI Analysis</div>
								<div class="text-sm bg-white p-3 rounded border">
									{result.aiExplanation}
								</div>
							</div>
						{/if}
					{:else}
						<div class="text-red-600">
							<strong>Error:</strong> {result.error}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
