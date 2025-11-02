interface EmailTemplate {
	subject: string;
	html: string;
	text: string;
}

export function getVerificationEmail(
	name: string,
	verificationUrl: string
): EmailTemplate {
	return {
		subject: 'Verify your SvelteRoster account',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Verify your email</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}
		.container {
			background: #ffffff;
			border-radius: 8px;
			padding: 40px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		.header {
			text-align: center;
			margin-bottom: 30px;
		}
		.logo {
			font-size: 32px;
			font-weight: bold;
			color: #8e32e9;
			margin-bottom: 10px;
		}
		.button {
			display: inline-block;
			background: #8e32e9;
			color: #ffffff;
			padding: 14px 32px;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 600;
			margin: 20px 0;
		}
		.button:hover {
			background: #7c3aed;
		}
		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			font-size: 14px;
			color: #6b7280;
			text-align: center;
		}
		.link {
			color: #8e32e9;
			word-break: break-all;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">ShiftHappens 🚀</div>
		</div>

		<h2>Hi ${name}! 👋</h2>

		<p>Welcome to SvelteRoster! We're excited to have you on board.</p>

		<p>To get started, please verify your email address by clicking the button below:</p>

		<div style="text-align: center;">
			<a href="${verificationUrl}" class="button">Verify Email Address</a>
		</div>

		<p style="font-size: 14px; color: #6b7280;">
			Or copy and paste this link into your browser:<br>
			<a href="${verificationUrl}" class="link">${verificationUrl}</a>
		</p>

		<p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
			This link will expire in 24 hours for security reasons.
		</p>

		<div class="footer">
			<p>If you didn't create an account with SvelteRoster, you can safely ignore this email.</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
Hi ${name}!

Welcome to SvelteRoster! We're excited to have you on board.

To get started, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours for security reasons.

If you didn't create an account with SvelteRoster, you can safely ignore this email.

---
SvelteRoster Team
		`
	};
}

export function getWelcomeEmail(name: string, dashboardUrl: string): EmailTemplate {
	return {
		subject: 'Welcome to SvelteRoster! 🎉',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Welcome to SvelteRoster</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}
		.container {
			background: #ffffff;
			border-radius: 8px;
			padding: 40px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		.header {
			text-align: center;
			margin-bottom: 30px;
		}
		.logo {
			font-size: 32px;
			font-weight: bold;
			color: #8e32e9;
			margin-bottom: 10px;
		}
		.button {
			display: inline-block;
			background: #8e32e9;
			color: #ffffff;
			padding: 14px 32px;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 600;
			margin: 20px 0;
		}
		.feature {
			background: #f9fafb;
			border-left: 4px solid #8e32e9;
			padding: 16px;
			margin: 16px 0;
			border-radius: 4px;
		}
		.feature-title {
			font-weight: 600;
			color: #1f2937;
			margin-bottom: 8px;
		}
		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			font-size: 14px;
			color: #6b7280;
			text-align: center;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">ShiftHappens 🎉</div>
		</div>

		<h2>Welcome aboard, ${name}!</h2>

		<p>Your account is now active and ready to use. You're all set to start managing your team's schedules with ease.</p>

		<div style="text-align: center;">
			<a href="${dashboardUrl}" class="button">Go to Dashboard</a>
		</div>

		<h3 style="margin-top: 40px;">Here's what you can do:</h3>

		<div class="feature">
			<div class="feature-title">📅 Create Schedules</div>
			<div>Build and publish shift schedules in minutes with our intuitive interface.</div>
		</div>

		<div class="feature">
			<div class="feature-title">👥 Manage Your Team</div>
			<div>Invite employees, set their availability, and track their hours.</div>
		</div>

		<div class="feature">
			<div class="feature-title">🔄 Enable Shift Swaps</div>
			<div>Let your team request shift swaps with automatic conflict detection.</div>
		</div>

		<div class="feature">
			<div class="feature-title">📊 View Reports</div>
			<div>Track labor costs, hours worked, and team performance.</div>
		</div>

		<p style="margin-top: 30px;">Need help getting started? Check out our documentation or reach out to support anytime.</p>

		<div class="footer">
			<p>Happy scheduling! 🚀</p>
			<p style="margin-top: 20px;">The SvelteRoster Team</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
Welcome aboard, ${name}!

Your account is now active and ready to use. You're all set to start managing your team's schedules with ease.

Go to your dashboard: ${dashboardUrl}

Here's what you can do:

📅 Create Schedules
Build and publish shift schedules in minutes with our intuitive interface.

👥 Manage Your Team
Invite employees, set their availability, and track their hours.

🔄 Enable Shift Swaps
Let your team request shift swaps with automatic conflict detection.

📊 View Reports
Track labor costs, hours worked, and team performance.

Need help getting started? Check out our documentation or reach out to support anytime.

Happy scheduling! 🚀

---
The SvelteRoster Team
		`
	};
}

export function getPasswordResetEmail(
	name: string,
	resetUrl: string
): EmailTemplate {
	return {
		subject: 'Reset your SvelteRoster password',
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Reset your password</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}
		.container {
			background: #ffffff;
			border-radius: 8px;
			padding: 40px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		.header {
			text-align: center;
			margin-bottom: 30px;
		}
		.logo {
			font-size: 32px;
			font-weight: bold;
			color: #8e32e9;
			margin-bottom: 10px;
		}
		.button {
			display: inline-block;
			background: #8e32e9;
			color: #ffffff;
			padding: 14px 32px;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 600;
			margin: 20px 0;
		}
		.warning {
			background: #fef2f2;
			border-left: 4px solid #ef4444;
			padding: 16px;
			margin: 20px 0;
			border-radius: 4px;
			color: #991b1b;
		}
		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			font-size: 14px;
			color: #6b7280;
			text-align: center;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">ShiftHappens 🔐</div>
		</div>

		<h2>Hi ${name},</h2>

		<p>We received a request to reset your password. Click the button below to choose a new password:</p>

		<div style="text-align: center;">
			<a href="${resetUrl}" class="button">Reset Password</a>
		</div>

		<div class="warning">
			<strong>⚠️ Security Notice:</strong><br>
			This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and ensure your account is secure.
		</div>

		<p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
			Or copy and paste this link into your browser:<br>
			<a href="${resetUrl}" style="color: #8e32e9; word-break: break-all;">${resetUrl}</a>
		</p>

		<div class="footer">
			<p>If you're having trouble, contact our support team.</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
Hi ${name},

We received a request to reset your password. Click the link below to choose a new password:

${resetUrl}

⚠️ Security Notice:
This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and ensure your account is secure.

If you're having trouble, contact our support team.

---
SvelteRoster Team
		`
	};
}

export function getTeamInviteEmail(
	inviterName: string,
	organizationName: string,
	inviteUrl: string
): EmailTemplate {
	return {
		subject: `${inviterName} invited you to join ${organizationName} on SvelteRoster`,
		html: `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Team Invitation</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			color: #333;
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}
		.container {
			background: #ffffff;
			border-radius: 8px;
			padding: 40px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		.header {
			text-align: center;
			margin-bottom: 30px;
		}
		.logo {
			font-size: 32px;
			font-weight: bold;
			color: #8e32e9;
			margin-bottom: 10px;
		}
		.button {
			display: inline-block;
			background: #8e32e9;
			color: #ffffff;
			padding: 14px 32px;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 600;
			margin: 20px 0;
		}
		.info-box {
			background: #f3f4f6;
			border-radius: 8px;
			padding: 20px;
			margin: 20px 0;
		}
		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			font-size: 14px;
			color: #6b7280;
			text-align: center;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">ShiftHappens 👋</div>
		</div>

		<h2>You've been invited!</h2>

		<p><strong>${inviterName}</strong> has invited you to join their team on SvelteRoster.</p>

		<div class="info-box">
			<p style="margin: 0;"><strong>Organization:</strong> ${organizationName}</p>
		</div>

		<p>SvelteRoster makes schedule management simple with features like:</p>
		<ul>
			<li>Easy shift scheduling</li>
			<li>Shift swap requests</li>
			<li>Time off management</li>
			<li>Mobile access</li>
		</ul>

		<div style="text-align: center;">
			<a href="${inviteUrl}" class="button">Accept Invitation</a>
		</div>

		<p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
			This invitation will expire in 7 days.
		</p>

		<div class="footer">
			<p>If you weren't expecting this invitation, you can safely ignore this email.</p>
		</div>
	</div>
</body>
</html>
		`,
		text: `
You've been invited!

${inviterName} has invited you to join their team on SvelteRoster.

Organization: ${organizationName}

SvelteRoster makes schedule management simple with features like:
- Easy shift scheduling
- Shift swap requests
- Time off management
- Mobile access

Accept your invitation: ${inviteUrl}

This invitation will expire in 7 days.

If you weren't expecting this invitation, you can safely ignore this email.

---
SvelteRoster Team
		`
	};
}
