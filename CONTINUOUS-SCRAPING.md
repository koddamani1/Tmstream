# Continuous Scraping Setup (100% FREE)

This guide shows how to setup **24/7 automatic scraping** completely free using Railway or Render.

## Architecture

```
┌─────────────────────┐
│  Railway/Render     │  ← 24/7 Scraping Server (FREE)
│  - Scrapes every    │     • RSS: Every 30 min
│    10-30 minutes    │     • TamilBlasters: Every 10 min
│  - Stores in memory │     • Always fresh data
└──────────┬──────────┘
           │
           │ HTTP API
           │
┌──────────▼──────────┐
│  Vercel Serverless  │  ← Frontend (FREE)
│  - Fetches from     │     • Loads data from Railway
│    Railway every    │     • Fallback to GitHub
│    5 minutes        │     • Fast response
└─────────────────────┘
```

## Option 1: Railway.app (Recommended)

### Why Railway?
- ✅ **$5 free credit/month** (enough for 24/7 uptime)
- ✅ **No credit card required** for trial
- ✅ **Automatic deployments** from GitHub
- ✅ **Built-in monitoring**
- ✅ **Custom domains** (free)

### Setup Steps:

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `koddamani1/Tmstream`
   - Railway will auto-detect Node.js

3. **Configure Environment**
   - No environment variables needed for basic setup
   - Optional: Add `TORBOX_API_KEY`, `OMDB_API_KEY`, `FANART_API_KEY`

4. **Get Your URL**
   - Railway generates a URL like: `tmstream-scraper.up.railway.app`
   - Copy this URL

5. **Update Vercel**
   - Go to Vercel Dashboard
   - Select your Tmstream project
   - Settings → Environment Variables
   - Add: `SCRAPING_SERVER_URL` = `https://your-railway-url.up.railway.app`
   - Redeploy

6. **Verify**
   - Visit: `https://your-railway-url.up.railway.app/health`
   - Should show live scraping stats
   - Visit: `https://tmstream.vercel.app/health`
   - Should show data from Railway

### Railway Free Tier Limits:
- **$5 credit/month** = ~500 hours of uptime
- **24/7 uptime** = 720 hours/month
- **Cost**: ~$0.01/hour = ~$7.20/month
- **Solution**: Use execution time limits or sleep during low-traffic hours

## Option 2: Render.com

### Why Render?
- ✅ **Completely FREE** (with limitations)
- ✅ **No credit card required**
- ✅ **Automatic deployments** from GitHub
- ✅ **Free SSL certificates**

### Limitations:
- ⚠️ **Spins down after 15 min of inactivity**
- ⚠️ **Cold start takes 30-60 seconds**
- ⚠️ **750 hours/month free** (not 24/7)

### Setup Steps:

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repository: `koddamani1/Tmstream`
   - Render will auto-detect settings from `render.yaml`

3. **Configure Service**
   - Name: `tmstream-scraper`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: **Free**

4. **Get Your URL**
   - Render generates a URL like: `tmstream-scraper.onrender.com`
   - Copy this URL

5. **Update Vercel**
   - Go to Vercel Dashboard
   - Settings → Environment Variables
   - Add: `SCRAPING_SERVER_URL` = `https://tmstream-scraper.onrender.com`
   - Redeploy

6. **Keep Alive (Optional)**
   - Render free tier spins down after 15 min
   - Use [UptimeRobot](https://uptimerobot.com) (free) to ping every 5 min
   - Or use GitHub Actions to ping periodically

### Render Free Tier Limits:
- **750 hours/month** = ~25 days of 24/7 uptime
- **Spins down** after 15 min inactivity
- **Cold start** = 30-60 seconds

## Option 3: Fly.io

### Why Fly.io?
- ✅ **Free tier includes 3 VMs**
- ✅ **No spin-down** (always running)
- ✅ **Global deployment**

### Setup:
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy
flyctl launch

# Get URL
flyctl info
```

## Comparison

| Feature | Railway | Render | Fly.io |
|---------|---------|--------|--------|
| **Cost** | $5 credit/month | 100% Free | Free tier |
| **Uptime** | 24/7 (with credit) | 750h/month | 24/7 |
| **Spin-down** | No | Yes (15 min) | No |
| **Cold start** | No | 30-60 sec | No |
| **Setup** | Easiest | Easy | Medium |
| **Recommended** | ✅ Best | ⚠️ Budget | ✅ Good |

## Scraping Schedule

Once deployed, the server will automatically scrape:

- **RSS Feeds**: Every 30 minutes
- **TamilBlasters**: Every 10 minutes
- **Initial Scrape**: On server start (2 seconds delay)

## Monitoring

### Check Scraping Server:
```bash
# Health check
curl https://your-server-url/health

# Export cache
curl https://your-server-url/export-cache | jq '.stats'

# Manual scrape trigger
curl https://your-server-url/scrape
```

### Check Vercel:
```bash
# Health check (should show Railway data)
curl https://tmstream.vercel.app/health

# Verify data source
curl https://tmstream.vercel.app/health | jq '.lastScrape'
```

## Troubleshooting

### Railway Issues:
- **Out of credits**: Upgrade to Hobby plan ($5/month)
- **Build failed**: Check Railway logs
- **Server not responding**: Restart from Railway dashboard

### Render Issues:
- **Service sleeping**: Use UptimeRobot to keep alive
- **Cold start slow**: First request after sleep takes 30-60 sec
- **Out of hours**: Wait for next month or upgrade

### Vercel Issues:
- **No data**: Check `SCRAPING_SERVER_URL` environment variable
- **Old data**: Vercel cache is 5 minutes, wait or redeploy
- **Fallback to GitHub**: Railway/Render server is down

## Cost Breakdown

### 100% Free Option:
- **Render.com**: Free (with spin-down)
- **Vercel**: Free
- **UptimeRobot**: Free (keep Render alive)
- **Total**: $0/month

### Best Performance Option:
- **Railway**: ~$7/month (24/7 uptime)
- **Vercel**: Free
- **Total**: ~$7/month

### Recommended:
Start with **Render (free)** → Upgrade to **Railway** if you need 24/7 uptime.

## Next Steps

1. Choose your platform (Railway or Render)
2. Follow setup steps above
3. Update Vercel environment variable
4. Verify scraping is working
5. Enjoy automatic updates! 🎉
