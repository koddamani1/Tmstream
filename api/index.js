const express = require('express');
const { getManifest } = require('../src/stremio/manifest');
const { getCatalog, getMeta } = require('../src/stremio/catalog');
const { getStreams } = require('../src/stremio/stream');
const { scrapeRssFeeds } = require('../src/scrapers/rss');
const { scrapeTamilblasters } = require('../src/scrapers/tamilblasters');
const cacheService = require('../src/services/cache');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

let lastRssScrape = 0;
let lastTamilblastersScrape = 0;
const RSS_INTERVAL = 30 * 60 * 1000;
const TAMILBLASTERS_INTERVAL = 10 * 60 * 1000;

async function ensureDataFresh() {
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

app.get('/', (req, res) => {
  res.json({
    name: 'Tamil Movies & Series Stremio Addon',
    version: '1.0.0',
    description: 'Stremio addon for Tamil movies and series via TorBox',
    endpoints: {
      manifest: '/manifest.json',
      catalog: '/catalog/:type/:id.json',
      meta: '/meta/:type/:id.json',
      stream: '/stream/:type/:id.json',
    },
  });
});

app.get('/manifest.json', (req, res) => {
  res.json(getManifest());
});

app.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    await ensureDataFresh();
    
    const { type, id } = req.params;
    const extra = {};
    
    if (req.query.skip) extra.skip = req.query.skip;
    if (req.query.genre) extra.genre = req.query.genre;
    if (req.query.search) extra.search = req.query.search;
    
    const result = await getCatalog(type, id, extra);
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

app.get('/stream/:type/:id.json', async (req, res) => {
  try {
    await ensureDataFresh();
    
    const { type, id } = req.params;
    const result = await getStreams(type, id);
    res.json(result);
  } catch (error) {
    console.error('[API] Stream error:', error.message);
    res.json({ streams: [] });
  }
});

app.get('/health', (req, res) => {
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

module.exports = app;
