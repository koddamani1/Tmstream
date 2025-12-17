# Quick Start: 24/7 Automatic Scraping (FREE)

Get your addon running with **continuous automatic scraping** in 5 minutes!

## 🚀 Fastest Setup (Railway - Recommended)

### Step 1: Deploy Scraping Server (2 minutes)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose `koddamani1/Tmstream`
5. Click "Deploy"
6. Wait 1-2 minutes for deployment
7. Copy your Railway URL (e.g., `tmstream-production.up.railway.app`)

### Step 2: Connect to Vercel (2 minutes)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your `Tmstream` project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `SCRAPING_SERVER_URL`
   - **Value**: `https://your-railway-url.up.railway.app`
5. Click "Save"
6. Go to **Deployments** → Click "..." → "Redeploy"

### Step 3: Verify (1 minute)

```bash
# Check scraping server
curl https://your-railway-url.up.railway.app/health

# Check Vercel (should show Railway data)
curl https://tmstream.vercel.app/health
```

**Done! Your addon now scrapes automatically every 10-30 minutes! 🎉**

---

## 🆓 100% Free Setup (Render.com)

### Step 1: Deploy Scraping Server (3 minutes)

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub: `koddamani1/Tmstream`
4. Settings:
   - **Name**: `tmstream-scraper`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: **Free**
5. Click "Create Web Service"
6. Wait 2-3 minutes for deployment
7. Copy your Render URL (e.g., `tmstream-scraper.onrender.com`)

### Step 2: Keep Server Alive (1 minute)

Render free tier sleeps after 15 min. Keep it alive:

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up (free)
3. Add New Monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://your-render-url.onrender.com/health`
   - **Interval**: 5 minutes
4. Save

### Step 3: Connect to Vercel (2 minutes)

Same as Railway Step 2 above, but use your Render URL.

### Step 4: Verify

```bash
# Check scraping server
curl https://your-render-url.onrender.com/health

# Check Vercel
curl https://tmstream.vercel.app/health
```

**Done! 100% free continuous scraping! 🎉**

---

## 📊 What You Get

### Automatic Scraping:
- ✅ **RSS Feeds**: Every 30 minutes
- ✅ **TamilBlasters**: Every 10 minutes
- ✅ **Always fresh content**
- ✅ **No manual updates needed**

### Current Setup:
```
Railway/Render (24/7)  →  Vercel (Serverless)  →  Stremio
   Scrapes data            Serves streams          Plays content
```

---

## 🔍 Monitoring

### Check Scraping Status:
```bash
# Railway/Render health
curl https://your-server-url/health | jq

# Vercel health (should match Railway)
curl https://tmstream.vercel.app/health | jq

# View cache stats
curl https://your-server-url/export-cache | jq '.stats'
```

### Expected Output:
```json
{
  "status": "healthy",
  "cache": {
    "rssItems": 55,
    "tamilblastersItems": 14,
    "totalMagnets": 418
  },
  "lastScrape": {
    "rss": "2025-12-17T09:30:00.000Z",
    "tamilblasters": "2025-12-17T09:30:00.000Z"
  }
}
```

---

## 🎬 Add to Stremio

Your addon is now ready!

1. Open Stremio
2. Go to **Addons**
3. Click **"+"** (Add Addon)
4. Enter: `https://tmstream.vercel.app/manifest.json`
5. Click **Install**

Or configure first: [https://tmstream.vercel.app/configure](https://tmstream.vercel.app/configure)

---

## 💡 Tips

### Railway:
- **Free credit**: $5/month (enough for ~500 hours)
- **24/7 uptime**: Costs ~$7/month after free credit
- **Best for**: Reliable 24/7 scraping

### Render:
- **100% free**: No credit card needed
- **Limitation**: Sleeps after 15 min (use UptimeRobot)
- **Best for**: Budget-conscious users

### Recommendation:
- Start with **Render (free)**
- Upgrade to **Railway** if you need guaranteed 24/7 uptime

---

## 🆘 Troubleshooting

### No streams showing:
```bash
# Check if scraping server is running
curl https://your-server-url/health

# Check if Vercel has correct URL
# Go to Vercel → Settings → Environment Variables
# Verify SCRAPING_SERVER_URL is set
```

### Old data:
```bash
# Trigger manual scrape
curl https://your-server-url/scrape

# Wait 30 seconds, then check
curl https://your-server-url/health
```

### Render sleeping:
- Add UptimeRobot monitor (see Step 2 above)
- Or upgrade to Render paid plan ($7/month)

---

## 📈 Next Steps

1. ✅ Deploy scraping server (Railway or Render)
2. ✅ Connect to Vercel
3. ✅ Add to Stremio
4. 🎉 Enjoy automatic updates!

**Questions?** Check [CONTINUOUS-SCRAPING.md](CONTINUOUS-SCRAPING.md) for detailed guide.
