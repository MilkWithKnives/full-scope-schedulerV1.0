<script lang="ts">
	import { motion } from '@humanspeak/svelte-motion';
	import { Calendar, Users, Clock, TrendingUp, Zap, Shield, ArrowRight, Check, Menu, X } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let mobileMenuOpen = $state(false);

	const features = [
		{
			icon: Calendar,
			title: 'Smart Scheduling',
			description: 'AI-powered schedule optimization that considers availability, preferences, and labor costs.'
		},
		{
			icon: Users,
			title: 'Team Management',
			description: 'Manage your entire team from one place. Track hours, shifts, and availability effortlessly.'
		},
		{
			icon: Clock,
			title: 'Time Tracking',
			description: 'GPS-verified clock in/out with geofencing. Never worry about buddy punching again.'
		},
		{
			icon: TrendingUp,
			title: 'Analytics & Reports',
			description: 'Real-time labor cost analysis, productivity metrics, and actionable insights.'
		},
		{
			icon: Zap,
			title: 'Instant Notifications',
			description: 'Push notifications for shift changes, swap requests, and time-off approvals.'
		},
		{
			icon: Shield,
			title: 'Compliance Ready',
			description: 'Automatic overtime tracking, break enforcement, and labor law compliance.'
		}
	];

	const pricing = [
		{
			name: 'Starter',
			price: 'Free',
			description: 'Perfect for small cafes and food trucks',
			features: [
				'Up to 10 employees',
				'Basic scheduling',
				'Time clock',
				'Mobile app access',
				'Email support'
			],
			cta: 'Start Free',
			highlighted: false
		},
		{
			name: 'Professional',
			price: '$49',
			period: '/month',
			description: 'Ideal for growing restaurants',
			features: [
				'Up to 50 employees',
				'AI-powered scheduling',
				'Advanced analytics',
				'Shift swap management',
				'Priority support',
				'Custom integrations'
			],
			cta: 'Start 14-day Trial',
			highlighted: true
		},
		{
			name: 'Enterprise',
			price: 'Custom',
			description: 'For multi-location operations',
			features: [
				'Unlimited employees',
				'Multi-location support',
				'API access',
				'Dedicated account manager',
				'Custom training',
				'SLA guarantees'
			],
			cta: 'Contact Sales',
			highlighted: false
		}
	];

	const stats = [
		{ value: '10,000+', label: 'Active Users' },
		{ value: '99.9%', label: 'Uptime' },
		{ value: '2M+', label: 'Shifts Scheduled' },
		{ value: '4.9/5', label: 'Customer Rating' }
	];
</script>

<svelte:head>
	<title>Roster86 - Restaurant Scheduling Made Simple</title>
	<meta name="description" content="The #1 scheduling platform for restaurants. AI-powered scheduling, time tracking, and team management in one place." />
</svelte:head>

<div class="min-h-screen bg-white dark:bg-slate-950">
	<!-- Navigation -->
	<nav class="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<!-- Logo -->
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
				>
					<a href="/" class="flex items-center space-x-3">
						<img src="/logo.svg" alt="Roster86" class="w-10 h-10" />
						<span class="text-xl font-bold text-slate-900 dark:text-white">
							Roster86
						</span>
					</a>
				</motion.div>

				<!-- Desktop Navigation -->
				<div class="hidden md:flex items-center space-x-8">
					<a href="#features" class="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
						Features
					</a>
					<a href="#pricing" class="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
						Pricing
					</a>
					<a href="/auth/login" class="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
						Sign In
					</a>
					<ThemeToggle />
					<Button variant="primary" onclick={() => window.location.href = '/auth/signup'}>
						Get Started
					</Button>
				</div>

				<!-- Mobile Menu Button -->
				<div class="md:hidden flex items-center space-x-4">
					<ThemeToggle />
					<button
						onclick={() => mobileMenuOpen = !mobileMenuOpen}
						class="text-slate-600 dark:text-slate-400"
					>
						{#if mobileMenuOpen}
							<X class="w-6 h-6" />
						{:else}
							<Menu class="w-6 h-6" />
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
				<div class="px-4 py-4 space-y-3">
					<a href="#features" class="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
						Features
					</a>
					<a href="#pricing" class="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
						Pricing
					</a>
					<a href="/auth/login" class="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
						Sign In
					</a>
					<Button variant="primary" class="w-full" onclick={() => window.location.href = '/auth/signup'}>
						Get Started
					</Button>
				</div>
			</div>
		{/if}
	</nav>

	<!-- Hero Section -->
	<section class="relative overflow-hidden">
		<!-- Gradient Background -->
		<div class="absolute inset-0 bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 opacity-50"></div>

		<div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
			<div class="text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<h1 class="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white mb-6">
						Restaurant Scheduling
						<span class="block bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
							Made Simple
						</span>
					</h1>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
				>
					<p class="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
						Stop wrestling with spreadsheets. AI-powered scheduling that saves you 10+ hours per week and reduces labor costs by 15%.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
				>
					<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Button
							variant="primary"
							size="lg"
							class="text-lg px-8 py-4"
							onclick={() => window.location.href = '/auth/signup'}
						>
							Start Free Trial
							<ArrowRight class="w-5 h-5 ml-2" />
						</Button>
						<Button
							variant="secondary"
							size="lg"
							class="text-lg px-8 py-4"
							onclick={() => window.location.href = '/auth/login'}
						>
							Watch Demo
						</Button>
					</div>
				</motion.div>

				<!-- Stats -->
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.6 }}
				>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
						{#each stats as stat, i}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.8 + (i * 0.1) }}
							>
								<div class="text-center">
									<div class="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
										{stat.value}
									</div>
									<div class="text-sm text-slate-600 dark:text-slate-400 mt-1">
										{stat.label}
									</div>
								</div>
							</motion.div>
						{/each}
					</div>
				</motion.div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section id="features" class="py-24 bg-white dark:bg-slate-950">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
							>
				<div class="text-center mb-16">
					<h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
						Everything You Need
					</h2>
					<p class="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
						Powerful features designed specifically for restaurants and hospitality businesses.
					</p>
				</div>
			</motion.div>

			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each features as feature, i}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: i * 0.1 }}
											>
						<div class="group p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10">
							<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
								<svelte:component this={feature.icon} class="w-6 h-6 text-white" />
							</div>
							<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
								{feature.title}
							</h3>
							<p class="text-slate-600 dark:text-slate-400">
								{feature.description}
							</p>
						</div>
					</motion.div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Pricing Section -->
	<section id="pricing" class="py-24 bg-slate-50 dark:bg-slate-900">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
							>
				<div class="text-center mb-16">
					<h2 class="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
						Simple, Transparent Pricing
					</h2>
					<p class="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
						Start free, scale as you grow. No hidden fees, cancel anytime.
					</p>
				</div>
			</motion.div>

			<div class="grid md:grid-cols-3 gap-8">
				{#each pricing as plan, i}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: i * 0.1 }}
											>
						<div class="relative group">
							{#if plan.highlighted}
								<div class="absolute -inset-1 bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
							{/if}

							<div class="relative p-8 rounded-2xl bg-white dark:bg-slate-950 border {plan.highlighted ? 'border-primary-500' : 'border-slate-200 dark:border-slate-800'} hover:shadow-xl transition-all duration-300">
								{#if plan.highlighted}
									<div class="absolute -top-4 left-1/2 -translate-x-1/2">
										<span class="px-4 py-1 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm font-medium">
											Most Popular
										</span>
									</div>
								{/if}

								<div class="text-center mb-8">
									<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
										{plan.name}
									</h3>
									<p class="text-slate-600 dark:text-slate-400 mb-4">
										{plan.description}
									</p>
									<div class="flex items-baseline justify-center">
										<span class="text-5xl font-bold text-slate-900 dark:text-white">
											{plan.price}
										</span>
										{#if plan.period}
											<span class="text-slate-600 dark:text-slate-400 ml-1">
												{plan.period}
											</span>
										{/if}
									</div>
								</div>

								<ul class="space-y-4 mb-8">
									{#each plan.features as feature}
										<li class="flex items-start">
											<Check class="w-5 h-5 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
											<span class="text-slate-600 dark:text-slate-400">{feature}</span>
										</li>
									{/each}
								</ul>

								<Button
									variant={plan.highlighted ? 'primary' : 'secondary'}
									class="w-full"
									onclick={() => window.location.href = '/auth/signup'}
								>
									{plan.cta}
								</Button>
							</div>
						</div>
					</motion.div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-24 bg-gradient-to-br from-primary-500 to-purple-600 relative overflow-hidden">
		<div class="absolute inset-0 bg-grid-white/10"></div>

		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
					>
			<div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
					Ready to Transform Your Scheduling?
				</h2>
				<p class="text-xl text-white/90 mb-8">
					Join thousands of restaurants saving time and money with Roster86.
				</p>
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<Button
						variant="secondary"
						size="lg"
						class="bg-white text-primary-600 hover:bg-slate-100"
						onclick={() => window.location.href = '/auth/signup'}
					>
						Start Free Trial
						<ArrowRight class="w-5 h-5 ml-2" />
					</Button>
					<Button
						variant="ghost"
						size="lg"
						class="text-white border-white hover:bg-white/10"
						onclick={() => window.location.href = '/auth/login'}
					>
						Sign In
					</Button>
				</div>
			</div>
		</motion.div>
	</section>

	<!-- Footer -->
	<footer class="bg-slate-950 text-slate-400 py-12">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid md:grid-cols-4 gap-8 mb-8">
				<div>
					<div class="flex items-center space-x-2 mb-4">
						<div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
							<Calendar class="w-5 h-5 text-white" />
						</div>
						<img src="/logo.svg" alt="Roster86" class="h-8" />
					</div>
					<p class="text-sm">
						Restaurant scheduling made simple. Save time, reduce costs, keep your team happy.
					</p>
				</div>

				<div>
					<h3 class="text-white font-semibold mb-4">Product</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="#features" class="hover:text-white transition-colors">Features</a></li>
						<li><a href="#pricing" class="hover:text-white transition-colors">Pricing</a></li>
						<li><a href="/dashboard" class="hover:text-white transition-colors">Dashboard</a></li>
					</ul>
				</div>

				<div>
					<h3 class="text-white font-semibold mb-4">Company</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="/about" class="hover:text-white transition-colors">About</a></li>
						<li><a href="/contact" class="hover:text-white transition-colors">Contact</a></li>
						<li><a href="/privacy" class="hover:text-white transition-colors">Privacy</a></li>
					</ul>
				</div>

				<div>
					<h3 class="text-white font-semibold mb-4">Support</h3>
					<ul class="space-y-2 text-sm">
						<li><a href="/help" class="hover:text-white transition-colors">Help Center</a></li>
						<li><a href="/docs" class="hover:text-white transition-colors">Documentation</a></li>
						<li><a href="/contact" class="hover:text-white transition-colors">Contact Us</a></li>
					</ul>
				</div>
			</div>

			<div class="border-t border-slate-800 pt-8 text-sm text-center">
				<p>&copy; 2025 Roster86. All rights reserved. Built with SvelteKit & ❤️</p>
			</div>
		</div>
	</footer>
</div>

<style>
	.bg-grid-white\/10 {
		background-image:
			linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
		background-size: 40px 40px;
	}
</style>
