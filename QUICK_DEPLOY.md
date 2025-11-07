# Quick Deployment Guide for roster86.com

## Prerequisites
- Vultr VPS running Ubuntu 20.04+
- Domain roster86.com DNS pointed to your Vultr server IP
- SSH access to your server

## Step-by-Step Deployment

### 1. Connect to Your Server
```bash
ssh root@YOUR_VULTR_IP
```

### 2. Install Required Software
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PM2, Nginx, Git
npm install -g pm2
apt install -y nginx git

# Verify installations
node --version
npm --version
```

### 3. Create Application User
```bash
adduser --disabled-password --gecos "" svelteroster
usermod -aG sudo svelteroster
su - svelteroster
```

### 4. Clone Repository
```bash
cd ~
git clone YOUR_GIT_REPO_URL svelteroster
cd svelteroster
```

### 5. Set Up Environment Variables
```bash
# Copy the production env template
cp .env.production .env

# Generate a new AUTH_SECRET
openssl rand -base64 32

# Edit .env and paste the generated secret
nano .env
# Update AUTH_SECRET with the value from above
# Save and exit (Ctrl+X, Y, Enter)
```

### 6. Install Dependencies & Build
```bash
npm ci --production=false
npx prisma generate
npx prisma db push
npm run build
```

### 7. Start with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# Copy and run the command it outputs
```

### 8. Configure Nginx
```bash
# Exit back to root
exit

# Copy nginx config
sudo cp /home/svelteroster/svelteroster/nginx.conf /etc/nginx/sites-available/svelteroster

# Enable site
sudo ln -s /etc/nginx/sites-available/svelteroster /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Set Up SSL Certificate
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate for roster86.com
sudo certbot --nginx -d roster86.com -d www.roster86.com

# Follow the prompts and select option 2 (redirect HTTP to HTTPS)
```

### 10. Configure Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 11. Test Your Deployment
Visit https://roster86.com in your browser!

## Future Deployments

After the initial setup, deploy updates by:

1. **From your local machine**, commit and push changes:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

2. **SSH to server and run deploy script**:
```bash
ssh svelteroster@YOUR_VULTR_IP
cd ~/svelteroster
./deploy.sh
```

Or in one command:
```bash
ssh svelteroster@YOUR_VULTR_IP 'cd ~/svelteroster && ./deploy.sh'
```

## Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs svelteroster

# Restart app
pm2 reload svelteroster

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### App won't start
```bash
pm2 logs svelteroster --err
pm2 restart svelteroster
```

### Database connection issues
```bash
npx prisma db push
npx prisma generate
```

### SSL certificate renewal
Certbot auto-renews. Test with:
```bash
sudo certbot renew --dry-run
```

## Important Notes

1. **Domain DNS**: Make sure roster86.com and www.roster86.com both point to your Vultr server IP
2. **AUTH_SECRET**: Never commit the production .env file to git
3. **Backups**: Set up regular database backups
4. **Monitoring**: Check `pm2 logs` regularly for errors

## What's Running

- **Application**: http://localhost:3000 (internal)
- **Nginx**: Reverse proxy on ports 80/443
- **PM2**: Process manager keeping app alive
- **SSL**: Let's Encrypt automatic HTTPS

Your app will be live at: **https://roster86.com**
