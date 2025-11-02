import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { sendWelcomeEmail } from '$lib/server/email/send';
import { PUBLIC_APP_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw error(400, 'Missing verification token');
	}

	// Find the verification token
	const verificationToken = await prisma.verificationToken.findUnique({
		where: { token }
	});

	if (!verificationToken) {
		throw error(400, 'Invalid or expired verification token');
	}

	// Check if token is expired
	if (verificationToken.expires < new Date()) {
		// Delete expired token
		await prisma.verificationToken.delete({
			where: { token }
		});
		throw error(400, 'Verification link has expired. Please request a new one.');
	}

	// Find user by email
	const user = await prisma.user.findUnique({
		where: { email: verificationToken.identifier }
	});

	if (!user) {
		throw error(400, 'User not found');
	}

	// Mark user as verified
	await prisma.user.update({
		where: { id: user.id },
		data: { emailVerified: true }
	});

	// Delete the used token
	await prisma.verificationToken.delete({
		where: { token }
	});

	// Send welcome email
	await sendWelcomeEmail(user.email, user.name, `${PUBLIC_APP_URL}/dashboard`);

	// Redirect to login with success message
	throw redirect(303, '/auth/login?verified=true');
};
