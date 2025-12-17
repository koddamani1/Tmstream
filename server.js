const app = require('./api/index');
const cron = require('node-cron');
const config = require('./config');
const { scrapeRssFeeds } = require('./src/scrapers/rss');
const { scrapeTamilblasters } = require('./src/scrapers/tamilblasters');
const database = require('./src/services/database');
const torboxWorker = require('./src/services/torbox-worker');

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
});

async function initDatabase() {
  try {
    await database.initDatabase();
    console.log('[Server] Database initialized');
  } catch (error) {
    console.error('[Server] Database initialization error:', error.message);
  }
}

async function initialScrape() {
  console.log('[Server] Running initial scrape...');
  try {
    await Promise.all([
      scrapeRssFeeds(),
      scrapeTamilblasters(),
    ]);
    console.log('[Server] Initial scrape complete');
  } catch (error) {
    console.error('[Server] Initial scrape error:', error.message);
  }
}

function startTorboxWorker() {
  const apiKey = config.TORBOX_API_KEY;
  if (apiKey) {
    torboxWorker.startWorker(apiKey, 60000);
    console.log('[Server] TorBox worker started');
  } else {
    console.log('[Server] No TorBox API key configured, worker not started');
  }
}

cron.schedule(`*/${config.RSS_SCRAPE_INTERVAL} * * * *`, async () => {
  console.log('[Cron] Running scheduled RSS scrape...');
  try {
    await scrapeRssFeeds();
    console.log('[Cron] RSS scrape complete');
  } catch (error) {
    console.error('[Cron] RSS scrape error:', error.message);
  }
});

cron.schedule(`*/${config.TAMILBLASTERS_SCRAPE_INTERVAL} * * * *`, async () => {
  console.log('[Cron] Running scheduled TamilBlasters scrape...');
  try {
    await scrapeTamilblasters();
    console.log('[Cron] TamilBlasters scrape complete');
  } catch (error) {
    console.error('[Cron] TamilBlasters scrape error:', error.message);
  }
});

async function start() {
  await initDatabase();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Stremio Tamil Addon running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Manifest URL: http://0.0.0.0:${PORT}/manifest.json`);
    console.log(`[Server] Health check: http://0.0.0.0:${PORT}/health`);
    
    setTimeout(async () => {
      await initialScrape();
      startTorboxWorker();
    }, 2000);
  });
}

start();
