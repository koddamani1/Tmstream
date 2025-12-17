# Deployment Guide

## Vercel Deployment

This addon is optimized for Vercel serverless deployment with the following features:

### How It Works

1. **Pre-scraped Data**: The addon uses pre-scraped data stored in `data/cache.json`
2. **Automatic Loading**: On Vercel, the addon automatically loads data from GitHub
3. **No Scraping on Vercel**: Scraping is disabled on Vercel due to 10-second timeout limits
4. **Local Scraping**: Run locally to update the cache and push to GitHub

### Updating Cache Data

To update the cache data for Vercel deployment:

```bash
# 1. Run the server locally
npm start

# 2. Wait for initial scrape to complete (about 30 seconds)

# 3. Export the cache
curl http://localhost:5000/export-cache > data/cache.json

# 4. Commit and push to GitHub
git add data/cache.json
git commit -m "Update cache data"
git push origin main

# 5. Vercel will automatically redeploy with new data
```

### Environment Variables

No environment variables are required for basic functionality. Optional:

- `TORBOX_API_KEY` - Your TorBox API key for debrid streaming
- `OMDB_API_KEY` - OMDb API key for better metadata
- `FANART_API_KEY` - Fanart.tv API key for posters

### Vercel Configuration

The `vercel.json` file is configured with:
- Serverless function timeout: 10 seconds
- Environment detection: `VERCEL=1`
- Routes all requests to `api/index.js`

### Local Development

For local development with full scraping:

```bash
# Install dependencies
npm install

# Start server
npm start

# Or use PM2 for production-like environment
pm2 start server.js --name tmstream
```

### Cache Update Schedule

Recommended schedule for updating cache:
- **Daily**: For active content updates
- **Weekly**: For stable deployments
- **On-demand**: When new content is added to sources

### Troubleshooting

**No streams showing:**
- Check if `data/cache.json` exists and has data
- Verify the file is committed to GitHub
- Check Vercel deployment logs

**Timeout errors:**
- Vercel has a 10-second limit for hobby plans
- Scraping is automatically disabled on Vercel
- Use pre-scraped data instead

**Cache not updating:**
- Run local server and export cache
- Commit and push `data/cache.json`
- Wait for Vercel to redeploy (automatic)
