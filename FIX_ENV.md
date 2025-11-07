# Fix Production .env File

Your build is failing because the `.env` file on the server is missing required variables.

## Quick Fix

SSH into your server and run these commands:

```bash
ssh root@45.76.22.87

# Navigate to your app directory
cd /root/full-scope-schedulerV1.0

# Add the missing environment variables
cat >> .env << 'EOF'

# Email Service (Required for build)
RESEND_API_KEY="re_gntcQ4Rj_5Lg4a97ufJidbQZp9DizpEaV"
EMAIL_FROM="SvelteRoster <onboarding@resend.dev>"

# Web Push Notifications
PUBLIC_VAPID_KEY="BGx81CMybwYjnoGcCJprCB1c2XtXSBWuBvidk2xY1fdUkh4cnR87f7MtNU9MAp2DpHgkIAje5Os-oTKes8lkU8I"
PRIVATE_VAPID_KEY="3GbAyvc8RliXflA3r3KjddpbM_rnPmH5KOp0kcqzPkI"
EOF

# Verify the file has all required variables
cat .env

# Now re-run the deployment
./deploy.sh
```

## What These Variables Do

- **RESEND_API_KEY**: Required for sending email (password resets, invites)
- **EMAIL_FROM**: The "from" address for emails
- **PUBLIC_VAPID_KEY**: Required for push notifications
- **PRIVATE_VAPID_KEY**: Required for push notifications

## After Running deploy.sh Successfully

Once the build succeeds, your app should start automatically with PM2. You can check status with:

```bash
pm2 status
pm2 logs svelteroster
```

Then visit: **https://roster86.com**
