# SvelteRoster Deployment Guide - Vultr VPS

This guide will walk you through deploying SvelteRoster to your Vultr VPS with Node.js, PM2, and Nginx.

## Prerequisites

- A Vultr VPS running Ubuntu 22.04 or 24.04
- Domain name pointing to your VPS IP address
- SSH access to your VPS

## Step 1: Initial VPS Setup

### 1.1 Connect to your VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Update the system

```bash
apt update && apt upgrade -y
```

### 1.3 Install Node.js (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

Verify installation:
```bash
node --version  # Should show v20.x.x
npm --version
```

### 1.4 Install PM2 globally

```bash
npm install -g pm2
```

### 1.5 Install Nginx

```bash
apt install -y nginx
```

### 1.6 Install Git

```bash
apt install -y git
```

## Step 2: Clone and Setup Your Application

### 2.1 Create application directory

```bash
mkdir -p /var/www
cd /var/www
```

### 2.2 Clone your repository

```bash
git clone https://github.com/yourusername/svelteroster.git
cd svelteroster
```

### 2.3 Install dependencies

```bash
npm ci
```

### 2.4 Create .env file

```bash
nano .env
```

Add your environment variables:
```env
DATABASE_URL="your-database-url"
AUTH_SECRET="your-secret-key"
AUTH_TRUST_HOST=true
# Add other environment variables as needed
```

### 2.5 Update ecosystem.config.cjs

Edit the ORIGIN in `ecosystem.config.cjs`:
```bash
nano ecosystem.config.cjs
```

Change `ORIGIN: 'https://yourdomain.com'` to your actual domain.

### 2.6 Build the application

```bash
npm run build
```

### 2.7 Start with PM2

```bash
pm2 start ecosystem.config.cjs
```

### 2.8 Configure PM2 to start on boot

```bash
pm2 startup
# Follow the command it outputs
pm2 save
```

## Step 3: Configure Nginx

### 3.1 Update the nginx.conf file

```bash
nano nginx.conf
```

Replace `yourdomain.com` with your actual domain.

### 3.2 Copy to Nginx sites-available

```bash
cp nginx.conf /etc/nginx/sites-available/svelteroster
```

### 3.3 Create symbolic link

```bash
ln -s /etc/nginx/sites-available/svelteroster /etc/nginx/sites-enabled/
```

### 3.4 Remove default Nginx site (optional)

```bash
rm /etc/nginx/sites-enabled/default
```

### 3.5 Test Nginx configuration

```bash
nginx -t
```

### 3.6 Restart Nginx

```bash
systemctl restart nginx
```

## Step 4: Setup SSL with Let's Encrypt (Recommended)

### 4.1 Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 4.2 Obtain SSL certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically configure HTTPS in your Nginx config.

### 4.3 Test auto-renewal

```bash
certbot renew --dry-run
```

## Step 5: Configure Firewall (Optional but Recommended)

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

## Step 6: Deploy Updates

When you need to deploy updates, you can use the included deployment script:

### 6.1 SSH into your VPS

```bash
ssh root@your-vps-ip
cd /var/www/svelteroster
```

### 6.2 Run deployment script

```bash
./deploy.sh
```

This script will:
1. Pull latest changes from git
2. Install dependencies
3. Build the application
4. Reload PM2 with zero downtime

## Monitoring and Maintenance

### View application logs

```bash
pm2 logs svelteroster
```

### Check application status

```bash
pm2 status
```

### Restart application

```bash
pm2 restart svelteroster
```

### Monitor resources

```bash
pm2 monit
```

### View Nginx logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Application won't start

1. Check PM2 logs: `pm2 logs svelteroster`
2. Verify .env file exists and has correct values
3. Check if port 3000 is already in use: `lsof -i :3000`

### Nginx errors

1. Check Nginx error logs: `tail -f /var/log/nginx/error.log`
2. Test configuration: `nginx -t`
3. Restart Nginx: `systemctl restart nginx`

### Database connection issues

1. Verify DATABASE_URL in .env is correct
2. Check if database is accessible from VPS
3. Ensure database allows connections from VPS IP

## Environment Variables Reference

Required environment variables in your `.env` file:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
AUTH_SECRET="generate-a-random-secret"
AUTH_TRUST_HOST=true

# Email (if using email features)
RESEND_API_KEY="your-resend-api-key"

# Other app-specific variables
# Add as needed
```

## Performance Tips

1. **Enable Nginx caching** for static assets
2. **Use PM2 cluster mode** (already configured in ecosystem.config.cjs)
3. **Monitor memory usage** with `pm2 monit`
4. **Set up log rotation** to prevent disk space issues
5. **Consider using a CDN** for static assets

## Security Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall (ufw) enabled with only necessary ports open
- [ ] SSH key-based authentication (disable password auth)
- [ ] Regular system updates (`apt update && apt upgrade`)
- [ ] Strong AUTH_SECRET in .env
- [ ] Database credentials secured
- [ ] Regular backups of database and application

## Backup Strategy

### Database backup (PostgreSQL example)

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-20250102.sql
```

### Application backup

```bash
# Backup application directory
tar -czf svelteroster-backup-$(date +%Y%m%d).tar.gz /var/www/svelteroster
```

## Support

For issues specific to:
- **SvelteKit**: https://kit.svelte.dev/docs
- **Nginx**: https://nginx.org/en/docs/
- **PM2**: https://pm2.keymetrics.io/docs/
- **Vultr**: https://www.vultr.com/docs/

---

**Last Updated**: January 2025
