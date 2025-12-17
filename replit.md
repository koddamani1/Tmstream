# Stremio Tamil Movies & Series Addon

## Overview
A MediaFusion-style Stremio VOD addon built in Node.js with a beautiful web-based configuration interface. Scrapes Tamil movies and series from 1TamilMV RSS feeds and 1TamilBlasters website, processes torrents through TorBox API, and serves playable streams to Stremio with enriched metadata from OMDb and Fanart.tv.

## Project Structure
```
├── api/
│   └── index.js          # Vercel serverless entrypoint & Express app
├── public/
│   ├── index.html        # Landing page (MediaFusion-style)
│   ├── configure.html    # Configuration page
│   └── css/
│       └── style.css     # Beautiful purple-themed styling
├── src/
│   ├── scrapers/
│   │   ├── rss.js        # 1TamilMV RSS feed scraper
│   │   └── tamilblasters.js  # 1TamilBlasters website scraper
│   ├── services/
│   │   ├── cache.js      # In-memory caching with IMDb mapping
│   │   ├── fanart.js     # Fanart.tv API integration
│   │   ├── omdb.js       # OMDb API integration
│   │   └── torbox.js     # TorBox API integration (per-user keys)
│   └── stremio/
│       ├── catalog.js    # Catalog with quality/language filtering
│       ├── manifest.js   # Configurable Stremio manifest
│       └── stream.js     # Stream endpoint with filtering
├── config.js             # Configuration (uses env vars)
├── server.js             # Development server with cron scheduling
├── package.json
├── vercel.json           # Vercel deployment config
└── .gitignore
```

## Features (MediaFusion-Style)
- **Web Configuration UI**: Beautiful landing page and /configure interface
- **User-Specific Settings**: Settings encoded in manifest URL (base64)
- **Quality Filtering**: 4K, 1080p, 720p, 480p, CAM selections
- **Language Filtering**: Tamil, Telugu, Hindi, English, Malayalam
- **Catalog Selection**: Choose which catalogs to enable
- **Per-User API Keys**: Users can provide their own TorBox API key
- **Debrid Provider Toggle**: Switch between TorBox or magnet-only mode

## Endpoints
- `GET /` - Beautiful landing page
- `GET /configure` - Configuration interface
- `GET /manifest.json` - Default Stremio manifest
- `GET /:config/manifest.json` - User-configured manifest
- `GET /:config/catalog/:type/:id.json` - Filtered catalogs
- `GET /:config/meta/:type/:id.json` - Metadata
- `GET /:config/stream/:type/:id.json` - Filtered streams
- `GET /health` - Health check with cache stats
- `GET /scrape` - Manual scrape trigger

## Configuration
All API keys are stored as environment secrets:
- `TORBOX_API_KEY` - TorBox API (default for users who don't provide their own)
- `OMDB_API_KEY` - OMDb metadata API
- `FANART_API_KEY` - Fanart.tv images API

## Running Locally
```bash
npm install
npm run dev
```
Server runs on port 5000.

## Adding to Stremio
1. Visit the addon homepage
2. Click "Configure Addon"
3. Select your preferences (catalogs, quality, language)
4. Click "Install in Stremio" or copy the manifest URL

## Deploying to Vercel
1. Push to GitHub
2. Import to Vercel
3. Add environment variables (API keys)
4. Deploy

## Recent Changes
- 2025-12-17: Added MediaFusion-style web configuration UI
- 2025-12-17: Added user settings encoding in manifest URL
- 2025-12-17: Added quality and language filtering
- 2025-12-17: Added per-user TorBox API key support
- 2025-12-16: Initial implementation with scrapers and TorBox integration
