import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { signIn } from '@auth/sveltekit/client';
import { getSession } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	const session = await getSession(event);

	// Redirect to dashboard if already logged in
	if (session?.user) {
		throw redirect(303, '/dashboard');
	}

	// Get query params for success messages
	const url = new URL(event.request.url);
	const signup = url.searchParams.get('signup');
	const magicLink = url.searchParams.get('magicLink');

	return {
		signupSuccess: signup === 'success',
		magicLinkSent: magicLink === 'sent'
	};
};

export const actions = {
	// Email/Password Login
	login: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;
		const remember = data.get('remember') === 'on';

		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		try {
			// Auth.js will handle this via the Credentials provider
			// The actual sign-in happens client-side, so we just return success here
			return { success: true };
		} catch (error) {
			console.error('Login error:', error);
			return fail(401, {
				error: 'Invalid email or password',
				email
			});
		}
	},

	// Magic Link for Employees
	magicLink: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email') as string;

		if (!email) {
			return fail(400, {
				magicLinkError: 'Email is required'
			});
		}

		try {
			// Auth.js Email provider will handle sending the magic link
			// This will be triggered client-side
			return { magicLinkSuccess: true };
		} catch (error) {
			console.error('Magic link error:', error);
			return fail(500, {
				magicLinkError: 'Failed to send magic link. Please try again.'
			});
		}
	}
} satisfies Actions;
