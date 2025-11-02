# 📧 Email Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Your Resend API Key

1. Go to https://resend.com and sign up (it's free!)
2. Click **API Keys** in the sidebar
3. Click **Create API Key**
4. Copy the key (starts with `re_`)

### Step 2: Add to Your .env File

Open your `.env` file and add these lines:

```env
# Email Configuration
RESEND_API_KEY="re_paste_your_key_here"
EMAIL_FROM="SvelteRoster <noreply@yourdomain.com>"
PUBLIC_APP_URL="http://localhost:5173"
```

**Important Notes:**

- **For Testing**: Use `EMAIL_FROM="SvelteRoster <onboarding@resend.dev>"`
  - This works immediately, no domain verification needed!

- **For Production**: Use your own domain like `noreply@yourdomain.com`
  - Requires domain verification in Resend dashboard
  - Follow Resend's domain verification guide

### Step 3: Test It!

Once you add the API key, the email system will work automatically:

- ✅ Signup sends verification email
- ✅ Password reset sends reset email
- ✅ Team invites send invite emails
- ✅ Welcome emails after verification

## Free Tier Limits

Resend Free Tier includes:
- 3,000 emails per month
- 100 emails per day
- Great for testing and small teams!

## Domain Verification (Production Only)

To use your own domain (`noreply@yourdomain.com`):

1. Go to https://resend.com/domains
2. Click **Add Domain**
3. Enter your domain
4. Add the DNS records they provide (TXT, MX, CNAME)
5. Wait for verification (usually 5-10 minutes)

## Testing Your Setup

After adding the API key, test by:

1. Go to `/auth/signup`
2. Create a test account
3. Check your email for verification link
4. Check terminal logs for any errors

## Troubleshooting

**Email not sending?**
- Check if `RESEND_API_KEY` is set in `.env`
- Check terminal for error messages
- Verify you're using `onboarding@resend.dev` for testing
- Check Resend dashboard for logs

**Domain verification issues?**
- DNS changes can take up to 48 hours
- Use `nslookup` or `dig` to verify DNS records
- Use `onboarding@resend.dev` until your domain is verified

**Still having issues?**
- Check Resend dashboard logs: https://resend.com/logs
- Check your spam folder
- Ensure API key has correct permissions

## What Emails Get Sent?

1. **Verification Email** - When user signs up
2. **Welcome Email** - After email is verified
3. **Password Reset** - When user requests password reset
4. **Team Invite** - When manager invites team member
5. **Shift Notifications** - When shifts are assigned/changed (coming soon)

---

**Need help?** Check Resend docs: https://resend.com/docs
