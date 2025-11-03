import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

if (!env.RESEND_API_KEY) {
	console.warn('RESEND_API_KEY is not set. Email functionality will not work.');
}

export const resend = new Resend(env.RESEND_API_KEY);

export const FROM_EMAIL = env.EMAIL_FROM || 'onboarding@resend.dev';
