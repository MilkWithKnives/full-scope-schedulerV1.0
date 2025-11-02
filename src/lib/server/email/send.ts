import { resend, FROM_EMAIL } from './client';
import {
	getVerificationEmail,
	getWelcomeEmail,
	getPasswordResetEmail,
	getTeamInviteEmail
} from './templates';

export async function sendVerificationEmail(
	to: string,
	name: string,
	verificationUrl: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const template = getVerificationEmail(name, verificationUrl);

		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});

		if (error) {
			console.error('Failed to send verification email:', error);
			return { success: false, error: error.message };
		}

		console.log('Verification email sent:', data);
		return { success: true };
	} catch (error) {
		console.error('Error sending verification email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}

export async function sendWelcomeEmail(
	to: string,
	name: string,
	dashboardUrl: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const template = getWelcomeEmail(name, dashboardUrl);

		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});

		if (error) {
			console.error('Failed to send welcome email:', error);
			return { success: false, error: error.message };
		}

		console.log('Welcome email sent:', data);
		return { success: true };
	} catch (error) {
		console.error('Error sending welcome email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}

export async function sendPasswordResetEmail(
	to: string,
	name: string,
	resetUrl: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const template = getPasswordResetEmail(name, resetUrl);

		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});

		if (error) {
			console.error('Failed to send password reset email:', error);
			return { success: false, error: error.message };
		}

		console.log('Password reset email sent:', data);
		return { success: true };
	} catch (error) {
		console.error('Error sending password reset email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}

export async function sendTeamInviteEmail(
	to: string,
	inviterName: string,
	organizationName: string,
	inviteUrl: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const template = getTeamInviteEmail(inviterName, organizationName, inviteUrl);

		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});

		if (error) {
			console.error('Failed to send team invite email:', error);
			return { success: false, error: error.message };
		}

		console.log('Team invite email sent:', data);
		return { success: true };
	} catch (error) {
		console.error('Error sending team invite email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}
