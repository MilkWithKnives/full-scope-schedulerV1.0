// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: import('@auth/sveltekit').Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Augment Auth.js types with our custom user properties
declare module '@auth/sveltekit' {
	interface Session {
		user: {
			id: string;
			email: string;
			name: string;
			role: string;
			organizationId: string;
		};
	}
}

declare module '@auth/core/types' {
	interface User {
		role: string;
		organizationId: string;
	}
}

export {};
