import { SvelteKitAuth } from '@auth/sveltekit';
import Credentials from '@auth/core/providers/credentials';
import { prisma } from '$lib/server/prisma';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Auth.js handle
export const { handle: authHandle } = SvelteKitAuth({
	adapter: PrismaAdapter(prisma),
	providers: [
		// Email/Password Login
		Credentials({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const user = await prisma.user.findUnique({
					where: { email: credentials.email as string },
					include: { organization: true }
				});

				if (!user || !user.password) {
					return null;
				}

				const isValid = await bcrypt.compare(credentials.password as string, user.password);

				if (!isValid) {
					return null;
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					organizationId: user.organizationId
				};
			}
		})

		// Magic Link disabled temporarily - Auth.js Email provider requires nodemailer
		// We'll implement custom magic link flow later using Resend directly
	],
	callbacks: {
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.sub as string;
				session.user.role = token.role as string;
				session.user.organizationId = token.organizationId as string;
			}
			return session;
		},
		async jwt({ token, user }) {
			if (user) {
				token.role = user.role;
				token.organizationId = user.organizationId;
			}
			return token;
		}
	},
	session: {
		strategy: 'jwt',
		maxAge: 30 * 24 * 60 * 60 // 30 days
	},
	pages: {
		signIn: '/auth/login',
		signOut: '/auth/login',
		error: '/auth/error'
	},
	secret: process.env.AUTH_SECRET
});

// Authorization middleware
const authorizationHandle: Handle = async ({ event, resolve }) => {
	const session = await event.locals.getSession();
	const pathname = event.url.pathname;

	// Protected routes that require authentication
	const protectedRoutes = ['/dashboard', '/schedule', '/team', '/settings'];
	const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

	// Owner/Manager only routes
	const adminRoutes = ['/team', '/settings/organization'];
	const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

	// Redirect to login if accessing protected route without session
	if (isProtectedRoute && !session?.user) {
		throw redirect(303, `/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	// Check for admin access
	if (isAdminRoute && session?.user) {
		const role = session.user.role;
		if (role !== 'OWNER' && role !== 'MANAGER') {
			// Redirect non-admin users to dashboard
			throw redirect(303, '/dashboard');
		}
	}

	// Redirect authenticated users away from auth pages
	if (session?.user && pathname.startsWith('/auth/')) {
		throw redirect(303, '/dashboard');
	}

	return resolve(event);
};

// Combine both handles using sequence
export const handle = sequence(authHandle, authorizationHandle);
