#!/bin/bash

# SvelteRoster Deployment Script for Vultr VPS
# This script deploys the application with zero downtime using PM2

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📦 Pulling latest changes from git..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build the application
echo "🔨 Building the application..."
npm run build

# Create logs directory if it doesn't exist
mkdir -p logs

# Reload PM2 application (zero downtime)
echo "♻️  Reloading application with PM2..."
pm2 reload ecosystem.config.cjs

# Save PM2 process list
echo "💾 Saving PM2 process list..."
pm2 save

echo "✅ Deployment completed successfully!"
