# Scraping Guide

## Current Setup

Your addon uses **pre-scraped data** stored in `data/cache.json`. This is necessary because Vercel serverless functions have a 10-second timeout limit.

## Automatic Scraping Options

### ✅ Option 1: GitHub Actions (Recommended - FREE)

**Setup:** Already configured in `.github/workflows/update-cache.yml`

**How it works:**
1. GitHub Actions runs every 6 hours
2. Starts the server and runs scraping
3. Exports cache to `data/cache.json`
4. Commits and pushes to GitHub
5. Vercel automatically redeploys with new data

**Schedule:**
- Runs every 6 hours: `0 */6 * * *`
- Can be manually triggered from GitHub Actions tab

**To enable:**
1. Push the workflow file to GitHub (already done)
2. Go to your repo → Actions tab
3. Enable workflows if disabled
4. Done! It will run automatically

**To manually trigger:**
1. Go to GitHub → Actions tab
2. Select "Update Cache Data" workflow
3. Click "Run workflow"

### 💰 Option 2: Vercel Cron (Requires Pro Plan - $20/month)

**Setup:** Configure in `vercel.json`

**How it works:**
1. Vercel runs cron job every 6 hours
2. Calls `/api/cron-scrape` endpoint
3. Updates cache in memory (not persistent)

**Limitations:**
- Requires Vercel Pro plan ($20/month)
- No persistent storage between requests
- Would need external database (Redis, MongoDB, etc.)

### 🖥️ Option 3: Self-Hosted Server

**Setup:** Run on your own server with PM2

**How it works:**
1. Server runs 24/7 with PM2
2. Cron jobs scrape every 30 minutes
3. Data stored in memory
4. No Vercel needed

**Requirements:**
- VPS or dedicated server
- Node.js installed
- PM2 for process management

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name tmstream

# Setup auto-restart on reboot
pm2 startup
pm2 save
```

## Current Status

**Active Method:** GitHub Actions (FREE)
- ✅ Scrapes every 6 hours
- ✅ Automatically updates cache
- ✅ Triggers Vercel redeploy
- ✅ No cost

**Last Scrape:** Check at https://tmstream.vercel.app/health

## Manual Update

If you need to update immediately:

```bash
# 1. Run locally
npm start

# 2. Wait 30 seconds for scraping

# 3. Export cache
curl http://localhost:5000/export-cache > data/cache.json

# 4. Commit and push
git add data/cache.json
git commit -m "Manual cache update"
git push origin main
```

## Monitoring

Check scraping status:
- **GitHub Actions:** https://github.com/koddamani1/Tmstream/actions
- **Health Check:** https://tmstream.vercel.app/health
- **Cache Stats:** https://tmstream.vercel.app/export-cache

## Troubleshooting

**GitHub Actions not running:**
- Check if workflows are enabled in repo settings
- Verify the workflow file is in `.github/workflows/`
- Check Actions tab for error logs

**Cache not updating:**
- Check GitHub Actions logs
- Verify scraping sources are accessible
- Check if commit was successful

**Vercel not redeploying:**
- Vercel auto-deploys on push to main branch
- Check Vercel dashboard for deployment status
- Verify webhook is configured
