import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Send a magic link email for authentication
 */
export async function sendMagicLink(to: string, url: string) {
	try {
		await resend.emails.send({
			from: 'ShiftHappens <onboarding@resend.dev>', // Use resend.dev domain for testing
			to,
			subject: 'Sign in to ShiftHappens',
			html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Sign in to ShiftHappens</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
							<h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">ShiftHappens</h1>
							<p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Employee Scheduling Made Simple</p>
						</td>
					</tr>

					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							<h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 600;">Sign in to your account</h2>
							<p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">
								Click the button below to securely sign in to your ShiftHappens account. This link will expire in 24 hours.
							</p>

							<!-- CTA Button -->
							<table width="100%" cellpadding="0" cellspacing="0">
								<tr>
									<td align="center" style="padding: 10px 0 30px;">
										<a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
											Sign in to ShiftHappens
										</a>
									</td>
								</tr>
							</table>

							<p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Or copy and paste this URL into your browser:
							</p>
							<p style="margin: 0; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #4b5563; font-size: 14px; word-break: break-all;">
								${url}
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
							<p style="margin: 0 0 10px; color: #9ca3af; font-size: 14px; line-height: 1.6;">
								If you didn't request this email, you can safely ignore it.
							</p>
							<p style="margin: 0; color: #9ca3af; font-size: 14px;">
								&copy; ${new Date().getFullYear()} ShiftHappens. All rights reserved.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
			`
		});
	} catch (error) {
		console.error('Failed to send magic link email:', error);
		throw error;
	}
}

/**
 * Send shift notification email to employee
 */
export async function sendShiftNotification(
	to: string,
	employeeName: string,
	shiftDetails: {
		date: string;
		startTime: string;
		endTime: string;
		role: string;
	}
) {
	try {
		await resend.emails.send({
			from: 'ShiftHappens <notifications@resend.dev>',
			to,
			subject: `New Shift Assigned: ${shiftDetails.date}`,
			html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
					<tr>
						<td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">New Shift Assigned</h1>
						</td>
					</tr>
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi ${employeeName},</p>
							<p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">
								You have been assigned a new shift:
							</p>

							<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
								<tr>
									<td style="padding: 20px;">
										<table width="100%" cellpadding="8" cellspacing="0">
											<tr>
												<td style="color: #6b7280; font-size: 14px; font-weight: 600;">DATE</td>
												<td style="color: #111827; font-size: 14px; text-align: right;">${shiftDetails.date}</td>
											</tr>
											<tr>
												<td style="color: #6b7280; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e7eb; padding-top: 12px;">TIME</td>
												<td style="color: #111827; font-size: 14px; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 12px;">${shiftDetails.startTime} - ${shiftDetails.endTime}</td>
											</tr>
											<tr>
												<td style="color: #6b7280; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e7eb; padding-top: 12px;">ROLE</td>
												<td style="color: #111827; font-size: 14px; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 12px;">${shiftDetails.role}</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
							<p style="margin: 0; color: #9ca3af; font-size: 14px;">
								&copy; ${new Date().getFullYear()} ShiftHappens
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
			`
		});
	} catch (error) {
		console.error('Failed to send shift notification:', error);
		throw error;
	}
}
