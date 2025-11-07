<script lang="ts">
	import { ScheduleXCalendar } from '@schedule-x/svelte';
	import {
		createCalendar,
		createViewDay,
		createViewWeek,
		createViewMonthGrid,
		createViewMonthAgenda
	} from '@schedule-x/calendar';
	import { createEventsServicePlugin } from '@schedule-x/events-service';
	import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
	import { createEventModalPlugin } from '@schedule-x/event-modal';
	import '@schedule-x/theme-default/dist/index.css';
	import 'temporal-polyfill/global';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';

	interface Props {
		events: any[];
		onEventClick?: (event: any) => void;
		onClickDateTime?: (dateTime: string) => void;
		onEventUpdate?: (event: any) => Promise<void>;
	}

	let { events, onEventClick, onClickDateTime, onEventUpdate }: Props = $props();

	let calendar: any = $state(null);

	$effect(() => {
		// Triple-check we're on the client side only
		if (!browser || typeof window === 'undefined' || typeof document === 'undefined') {
			return;
		}

		if (!calendar) {
			console.log('Creating client-side calendar with events:', events.length);
			
			// Create plugins
			const eventsServicePlugin = createEventsServicePlugin();
			const dragAndDropPlugin = createDragAndDropPlugin();
			const eventModalPlugin = createEventModalPlugin();

			calendar = createCalendar({
				locale: 'en-US',
				firstDayOfWeek: 1, // Monday
				defaultView: 'week',
				views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
				events: [],
				calendars: {
					default: {
						colorName: 'default',
						lightColors: {
							main: '#6b7280',
							container: '#f3f4f6',
							onContainer: '#111827'
						},
						darkColors: {
							main: '#9ca3af',
							container: '#374151',
							onContainer: '#f9fafb'
						}
					},
					primary: {
						colorName: 'primary',
						lightColors: {
							main: '#667eea',
							container: '#dbeafe',
							onContainer: '#1e40af'
						},
						darkColors: {
							main: '#93c5fd',
							container: '#1e3a8a',
							onContainer: '#dbeafe'
						}
					},
					success: {
						colorName: 'success',
						lightColors: {
							main: '#10b981',
							container: '#d1fae5',
							onContainer: '#065f46'
						},
						darkColors: {
							main: '#34d399',
							container: '#064e3b',
							onContainer: '#d1fae5'
						}
					},
					warning: {
						colorName: 'warning',
						lightColors: {
							main: '#f59e0b',
							container: '#fef3c7',
							onContainer: '#92400e'
						},
						darkColors: {
							main: '#fbbf24',
							container: '#78350f',
							onContainer: '#fef3c7'
						}
					},
					error: {
						colorName: 'error',
						lightColors: {
							main: '#ef4444',
							container: '#fee2e2',
							onContainer: '#991b1b'
						},
						darkColors: {
							main: '#f87171',
							container: '#7f1d1d',
							onContainer: '#fee2e2'
						}
					}
				},
				dayBoundaries: {
					start: '06:00',
					end: '23:00'
				},
				weekOptions: {
					gridHeight: 800,
					eventWidth: 98
				},
				callbacks: {
					onEventClick(calendarEvent) {
						onEventClick?.(calendarEvent);
					},
					onClickDateTime(dateTime) {
						onClickDateTime?.(dateTime);
					},
					async onEventUpdate(updatedEvent) {
						if (onEventUpdate) {
							await onEventUpdate(updatedEvent);
						}
					}
				}
			}, [eventsServicePlugin, dragAndDropPlugin, eventModalPlugin]);

			console.log('Calendar created successfully');
		}
	});

	// Update events when they change
	$effect(() => {
		if (calendar?.eventsService && events) {
			console.log('Updating calendar events:', events.length);
			calendar.eventsService.set(events);
		}
	});
</script>

{#if calendar}
	<ScheduleXCalendar calendarApp={calendar} />
{:else}
	<div class="flex items-center justify-center h-96">
		<div class="text-center">
			<div class="text-4xl mb-4">📅</div>
			<p class="text-slate-600 dark:text-slate-400">Loading calendar...</p>
		</div>
	</div>
{/if}
