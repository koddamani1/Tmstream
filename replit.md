# Stremio Tamil Movies & Series Addon

## Overview
A complete Stremio VOD addon built in Node.js that scrapes Tamil movies and series from 1TamilMV RSS feeds and 1TamilBlasters website, processes torrents through TorBox API, and serves playable streams to Stremio with enriched metadata from OMDb and Fanart.tv.

## Project Structure
```
├── api/
│   └── index.js          # Vercel serverless entrypoint & Express app
├── src/
│   ├── scrapers/
│   │   ├── rss.js        # 1TamilMV RSS feed scraper
│   │   └── tamilblasters.js  # 1TamilBlasters website scraper
│   ├── services/
│   │   ├── cache.js      # In-memory caching service
│   │   ├── fanart.js     # Fanart.tv API integration
│   │   ├── omdb.js       # OMDb API integration
│   │   └── torbox.js     # TorBox API integration
│   └── stremio/
│       ├── catalog.js    # Catalog endpoint handler
│       ├── manifest.js   # Stremio manifest
│       └── stream.js     # Stream endpoint handler
├── config.js             # All configuration (API keys, URLs, settings)
├── server.js             # Development server with cron scheduling
├── package.json
├── vercel.json           # Vercel deployment config
└── .gitignore
```

## Configuration
All configuration is in `config.js`:
- **API Keys**: TorBox, OMDb, Fanart.tv
- **RSS Feeds**: 6 1TamilMV forum RSS feeds
- **1TamilBlasters URL**: Main scraping target
- **Scrape Intervals**: 30 min for RSS, 10 min for TamilBlasters
- **Cache TTL**: Configurable per content type

## Endpoints
- `GET /` - API info
- `GET /manifest.json` - Stremio manifest
- `GET /catalog/:type/:id.json` - Browse catalogs
- `GET /meta/:type/:id.json` - Get metadata
- `GET /stream/:type/:id.json` - Get playable streams
- `GET /health` - Health check with cache stats
- `GET /scrape` - Manual scrape trigger

## Running Locally
```bash
npm install
npm run dev
```
Server runs on port 5000.

## Deploying to Vercel
1. Push to GitHub
2. Import to Vercel
3. Deploy (auto-detects vercel.json)

## Adding to Stremio
Use manifest URL: `http://your-domain/manifest.json`

## Recent Changes
- Initial implementation (2025-12-16)
- Full scraping pipeline for 1TamilMV and 1TamilBlasters
- TorBox integration for playable streams
- OMDb and Fanart.tv metadata enrichment
- Vercel-ready serverless deployment
