# Deploy SvelteRoster to roster86.com (45.76.22.87)

## Quick Deployment Steps

### 1. First, make sure DNS is pointed correctly
Check that roster86.com points to 45.76.22.87:
```bash
ping roster86.com
```

### 2. SSH into your Vultr server
```bash
ssh root@45.76.22.87
```

### 3. Run this complete setup script

Copy and paste this entire block into your server terminal:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PM2, Nginx, Git
npm install -g pm2
apt install -y nginx git certbot python3-certbot-nginx

# Create application user
adduser --disabled-password --gecos "" svelteroster
usermod -aG sudo svelteroster

# Switch to app user
su - svelteroster

# Clone your repository (UPDATE WITH YOUR REPO URL!)
git clone YOUR_GIT_REPO_URL svelteroster
cd svelteroster

# Create .env file
cat > .env << 'ENVEOF'
DATABASE_URL="postgres://vultradmin:Fuckstick!@vultr-prod-0274b390-8a2c-4950-963c-f8c94271df22-vultr-prod-42ab.vultrdb.com:16751/defaultdb?sslmode=require"
AUTH_URL="https://roster86.com"
RESEND_API_KEY="re_gntcQ4Rj_5Lg4a97ufJidbQZp9DizpEaV"
EMAIL_FROM="SvelteRoster <onboarding@resend.dev>"
PUBLIC_APP_URL="https://roster86.com"
PUBLIC_VAPID_KEY="BGx81CMybwYjnoGcCJprCB1c2XtXSBWuBvidk2xY1fdUkh4cnR87f7MtNU9MAp2DpHgkIAje5Os-oTKes8lkU8I"
PRIVATE_VAPID_KEY="3GbAyvc8RliXflA3r3KjddpbM_rnPmH5KOp0kcqzPkI"
NODE_ENV="production"
PORT="3000"
ORIGIN="https://roster86.com"
ENVEOF

# Generate AUTH_SECRET and add to .env
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env

# Install and build
npm ci --production=false
npx prisma generate
npx prisma db push
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save

# Get PM2 startup command
pm2 startup

# Exit back to root
exit

# Configure Nginx
cp /home/svelteroster/svelteroster/nginx.conf /etc/nginx/sites-available/svelteroster
ln -s /etc/nginx/sites-available/svelteroster /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Set up SSL
certbot --nginx -d roster86.com -d www.roster86.com --non-interactive --agree-tos -m your@email.com

# Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "✅ Deployment complete! Visit https://roster86.com"
```

## Important Notes

1. **Before running**: Update `YOUR_GIT_REPO_URL` with your actual repository URL
2. **Email for SSL**: Update `your@email.com` in the certbot command
3. **PM2 Startup**: When the script shows a PM2 startup command, copy and run it
4. **Repository Access**: Make sure your server can access your git repository (set up SSH keys if it's private)

## After Initial Deployment

For future updates, just run:
```bash
ssh svelteroster@45.76.22.87 'cd ~/svelteroster && ./deploy.sh'
```

## Troubleshooting

### Check if app is running
```bash
ssh svelteroster@45.76.22.87
pm2 status
pm2 logs svelteroster
```

### Check Nginx
```bash
ssh root@45.76.22.87
systemctl status nginx
nginx -t
```

### View logs
```bash
ssh svelteroster@45.76.22.87
pm2 logs svelteroster --lines 100
```

---

**Your app will be live at: https://roster86.com**

Server: 45.76.22.87
Domain: roster86.com
Port: 3000 (internal, Nginx proxies to 80/443)
