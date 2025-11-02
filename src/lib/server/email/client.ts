import { Resend } from 'resend';
import { RESEND_API_KEY, EMAIL_FROM } from '$env/static/private';

if (!RESEND_API_KEY) {
	console.warn('RESEND_API_KEY is not set. Email functionality will not work.');
}

export const resend = new Resend(RESEND_API_KEY);

export const FROM_EMAIL = EMAIL_FROM || 'onboarding@resend.dev';
