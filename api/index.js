const express = require('express');
const path = require('path');
const { getManifest, getConfiguredManifest } = require('../src/stremio/manifest');
const { getCatalog, getMeta } = require('../src/stremio/catalog');
const { getStreams } = require('../src/stremio/stream');
const { scrapeRssFeeds } = require('../src/scrapers/rss');
const { scrapeTamilblasters } = require('../src/scrapers/tamilblasters');

// Use Vercel-compatible cache service
const isVercel = process.env.VERCEL === '1';
const cacheService = isVercel 
  ? require('../src/services/vercel-cache')
  : require('../src/services/cache');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let lastRssScrape = 0;
let lastTamilblastersScrape = 0;
const RSS_INTERVAL = 30 * 60 * 1000;
const TAMILBLASTERS_INTERVAL = 10 * 60 * 1000;

async function ensureDataFresh() {
  // On Vercel, load from external source instead of scraping
  if (isVercel) {
    await cacheService.ensureDataLoaded();
    return;
  }
  
  const now = Date.now();
  
  if (now - lastRssScrape > RSS_INTERVAL) {
    console.log('[Scraper] RSS data stale, refreshing...');
    scrapeRssFeeds().catch(err => console.error('[Scraper] RSS error:', err.message));
    lastRssScrape = now;
  }
  
  if (now - lastTamilblastersScrape > TAMILBLASTERS_INTERVAL) {
    console.log('[Scraper] TamilBlasters data stale, refreshing...');
    scrapeTamilblasters().catch(err => console.error('[Scraper] TamilBlasters error:', err.message));
    lastTamilblastersScrape = now;
  }
}

function parseUserConfig(configStr) {
  try {
    const decoded = Buffer.from(configStr, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

function getDefaultConfig() {
  return {
    catalogs: ['tamil-movies', 'tamil-movies-hd', 'hollywood-multi', 'tamil-series'],
    qualities: ['4k', '1080p', '720p'],
    languages: ['tamil', 'telugu', 'hindi', 'english', 'malayalam'],
    debridProvider: 'torbox',
    torboxKey: '',
    maxResults: 10
  };
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/configure', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/configure.html'));
});

app.get('/api-info', (req, res) => {
  res.json({
    name: 'Tamil Movies & Series Stremio Addon',
    version: '1.0.0',
    description: 'Stremio addon for Tamil movies and series via TorBox',
    endpoints: {
      manifest: '/manifest.json',
      configuredManifest: '/:config/manifest.json',
      catalog: '/:config/catalog/:type/:id.json',
      meta: '/:config/meta/:type/:id.json',
      stream: '/:config/stream/:type/:id.json',
    },
  });
});

app.get('/manifest.json', (req, res) => {
  res.json(getManifest());
});

app.get('/:config/manifest.json', (req, res) => {
  const userConfig = parseUserConfig(req.params.config) || getDefaultConfig();
  res.json(getConfiguredManifest(userConfig));
});

app.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    await ensureDataFresh();
    const { type, id } = req.params;
    const extra = {};
    if (req.query.skip) extra.skip = req.query.skip;
    if (req.query.genre) extra.genre = req.query.genre;
    if (req.query.search) extra.search = req.query.search;
    
    const result = await getCatalog(type, id, extra, getDefaultConfig());
    res.json(result);
  } catch (error) {
    console.error('[API] Catalog error:', error.message);
    res.json({ metas: [] });
  }
});

app.get('/:config/catalog/:type/:id.json', async (req, res) => {
  try {
    await ensureDataFresh();
    
    const { config, type, id } = req.params;
    const userConfig = parseUserConfig(config) || getDefaultConfig();
    const extra = {};
    
    if (req.query.skip) extra.skip = req.query.skip;
    if (req.query.genre) extra.genre = req.query.genre;
    if (req.query.search) extra.search = req.query.search;
    
    const result = await getCatalog(type, id, extra, userConfig);
    res.json(result);
  } catch (error) {
    console.error('[API] Catalog error:', error.message);
    res.json({ metas: [] });
  }
});

app.get('/meta/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const result = await getMeta(type, id);
    res.json(result);
  } catch (error) {
    console.error('[API] Meta error:', error.message);
    res.json({ meta: null });
  }
});

app.get('/:config/meta/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const result = await getMeta(type, id);
    res.json(result);
  } catch (error) {
    console.error('[API] Meta error:', error.message);
    res.json({ meta: null });
  }
});

app.get('/stream/:type/:id.json', async (req, res) => {
  try {
    await ensureDataFresh();
    const { type, id } = req.params;
    const result = await getStreams(type, id, getDefaultConfig());
    res.json(result);
  } catch (error) {
    console.error('[API] Stream error:', error.message);
    res.json({ streams: [] });
  }
});

app.get('/:config/stream/:type/:id.json', async (req, res) => {
  try {
    await ensureDataFresh();
    
    const { config, type, id } = req.params;
    const userConfig = parseUserConfig(config) || getDefaultConfig();
    
    const result = await getStreams(type, id, userConfig);
    res.json(result);
  } catch (error) {
    console.error('[API] Stream error:', error.message);
    res.json({ streams: [] });
  }
});

app.get('/health', async (req, res) => {
  // Ensure data is loaded on Vercel
  if (isVercel) {
    await ensureDataFresh();
  }
  
  const rssContent = cacheService.getRssContent();
  const tamilblastersContent = cacheService.getTamilblastersContent();
  const allMagnets = cacheService.getAllMagnets();
  
  res.json({
    status: 'healthy',
    cache: {
      rssItems: rssContent.length,
      tamilblastersItems: tamilblastersContent.length,
      totalMagnets: allMagnets.length,
    },
    lastScrape: {
      rss: lastRssScrape ? new Date(lastRssScrape).toISOString() : null,
      tamilblasters: lastTamilblastersScrape ? new Date(lastTamilblastersScrape).toISOString() : null,
    },
  });
});

app.get('/scrape', async (req, res) => {
  try {
    const results = await Promise.all([
      scrapeRssFeeds(),
      scrapeTamilblasters(),
    ]);
    
    lastRssScrape = Date.now();
    lastTamilblastersScrape = Date.now();
    
    res.json({
      success: true,
      rssItems: results[0].length,
      tamilblastersItems: results[1].length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/export-cache', (req, res) => {
  const rssContent = cacheService.getRssContent();
  const tamilblastersContent = cacheService.getTamilblastersContent();
  const magnets = cacheService.getAllMagnets();
  
  const exportData = {
    rssContent,
    tamilblastersContent,
    magnets,
    lastUpdate: new Date().toISOString(),
    stats: {
      rssItems: rssContent.length,
      tamilblastersItems: tamilblastersContent.length,
      totalMagnets: magnets.length,
    },
  };
  
  res.json(exportData);
});

module.exports = app;
