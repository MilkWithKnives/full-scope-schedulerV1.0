import {
	format,
	startOfWeek,
	endOfWeek,
	eachDayOfInterval,
	addWeeks,
	subWeeks,
	isSameDay,
	parseISO,
	addMinutes,
	differenceInMinutes
} from 'date-fns';

export function getWeekDays(date: Date = new Date()) {
	const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
	const end = endOfWeek(date, { weekStartsOn: 1 }); // Sunday

	return eachDayOfInterval({ start, end });
}

export function formatWeekRange(date: Date) {
	const start = startOfWeek(date, { weekStartsOn: 1 });
	const end = endOfWeek(date, { weekStartsOn: 1 });

	return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
}

export function nextWeek(date: Date) {
	return addWeeks(date, 1);
}

export function previousWeek(date: Date) {
	return subWeeks(date, 1);
}

export function isToday(date: Date) {
	return isSameDay(date, new Date());
}

export function formatTime(date: Date | string) {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, 'HH:mm'); // 24-hour format for form inputs
}

export function formatDate(date: Date | string) {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, 'yyyy-MM-dd'); // ISO format for date inputs
}

export function formatShortDate(date: Date | string) {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, 'MMM d');
}

export function formatDayOfWeek(date: Date) {
	return format(date, 'EEE'); // Mon, Tue, etc.
}

export function formatDayNumber(date: Date) {
	return format(date, 'd'); // 1, 2, 3, etc.
}

export function calculateShiftHours(startTime: Date | string, endTime: Date | string, breakMinutes: number = 30): number {
	const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
	const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;

	const totalMinutes = differenceInMinutes(end, start);
	const workedMinutes = totalMinutes - breakMinutes;

	return workedMinutes / 60; // Return hours
}

export function calculateLaborCost(hours: number, hourlyRate: number): number {
	return hours * hourlyRate;
}

export function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
