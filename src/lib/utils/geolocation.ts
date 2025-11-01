/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const R = 6371e3; // Earth's radius in meters
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c; // Distance in meters
}

/**
 * Check if user is within geofence radius of a location
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param locationLat Location's latitude
 * @param locationLon Location's longitude
 * @param radiusMeters Geofence radius in meters (default 250m)
 */
export function isWithinGeofence(
	userLat: number,
	userLon: number,
	locationLat: number,
	locationLon: number,
	radiusMeters: number = 250
): boolean {
	const distance = calculateDistance(userLat, userLon, locationLat, locationLon);
	return distance <= radiusMeters;
}

/**
 * Get user's current position
 * Returns Promise with coordinates or throws error
 */
export function getCurrentPosition(): Promise<GeolocationCoordinates> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Geolocation is not supported by your browser'));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => resolve(position.coords),
			(error) => {
				switch (error.code) {
					case error.PERMISSION_DENIED:
						reject(new Error('Location permission denied'));
						break;
					case error.POSITION_UNAVAILABLE:
						reject(new Error('Location information unavailable'));
						break;
					case error.TIMEOUT:
						reject(new Error('Location request timed out'));
						break;
					default:
						reject(new Error('An unknown error occurred'));
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0
			}
		);
	});
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
	if (meters < 1000) {
		return `${Math.round(meters)}m away`;
	}
	return `${(meters / 1000).toFixed(1)}km away`;
}
