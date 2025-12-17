const axios = require('axios');

// For Vercel deployment, we need to use external storage or fetch from a static source
// This service handles caching for serverless environments

let memoryCache = {
  rssContent: [],
  tamilblastersContent: [],
  magnets: [],
  imdbMappings: new Map(),
  torboxStreams: new Map(),
  lastUpdate: null,
};

// GitHub raw content URL for pre-scraped data (fallback)
const FALLBACK_DATA_URL = 'https://raw.githubusercontent.com/koddamani1/Tmstream/main/data/cache.json';

async function loadFromExternalSource() {
  try {
    console.log('[Vercel Cache] Loading data from external source...');
    const response = await axios.get(FALLBACK_DATA_URL, { timeout: 5000 });
    
    if (response.data) {
      memoryCache.rssContent = response.data.rssContent || [];
      memoryCache.tamilblastersContent = response.data.tamilblastersContent || [];
      memoryCache.magnets = response.data.magnets || [];
      memoryCache.lastUpdate = new Date(response.data.lastUpdate || Date.now());
      
      console.log(`[Vercel Cache] Loaded ${memoryCache.magnets.length} magnets from external source`);
      return true;
    }
  } catch (error) {
    console.error('[Vercel Cache] Failed to load from external source:', error.message);
  }
  
  return false;
}

async function ensureDataLoaded() {
  // If cache is empty or older than 1 hour, try to reload
  const cacheAge = memoryCache.lastUpdate ? Date.now() - memoryCache.lastUpdate.getTime() : Infinity;
  const oneHour = 60 * 60 * 1000;
  
  if (memoryCache.magnets.length === 0 || cacheAge > oneHour) {
    await loadFromExternalSource();
  }
}

function getRssContent() {
  return memoryCache.rssContent;
}

function getTamilblastersContent() {
  return memoryCache.tamilblastersContent;
}

function getAllMagnets() {
  return memoryCache.magnets;
}

function setRssContent(content) {
  memoryCache.rssContent = content;
  updateMagnetsCache();
}

function setTamilblastersContent(content) {
  memoryCache.tamilblastersContent = content;
  updateMagnetsCache();
}

function updateMagnetsCache() {
  const allContent = [...memoryCache.rssContent, ...memoryCache.tamilblastersContent];
  const magnets = [];
  
  for (const item of allContent) {
    if (item.magnets && Array.isArray(item.magnets)) {
      magnets.push(...item.magnets);
    }
  }
  
  memoryCache.magnets = magnets;
  memoryCache.lastUpdate = new Date();
  
  console.log(`[Vercel Cache] Updated magnets cache with ${magnets.length} total magnets`);
}

function getMagnetsForImdb(imdbId) {
  const cached = memoryCache.imdbMappings.get(imdbId);
  return cached ? cached.magnets : [];
}

function addImdbMagnetMapping(imdbId, magnets, title, year) {
  memoryCache.imdbMappings.set(imdbId, {
    magnets,
    title,
    year,
    timestamp: Date.now(),
  });
}

function getTorboxStream(hash) {
  return memoryCache.torboxStreams.get(hash);
}

function setTorboxStream(hash, streams) {
  memoryCache.torboxStreams.set(hash, streams);
}

function getCacheStats() {
  return {
    rssItems: memoryCache.rssContent.length,
    tamilblastersItems: memoryCache.tamilblastersContent.length,
    totalMagnets: memoryCache.magnets.length,
    imdbMappings: memoryCache.imdbMappings.size,
    torboxStreams: memoryCache.torboxStreams.size,
    lastUpdate: memoryCache.lastUpdate,
  };
}

module.exports = {
  ensureDataLoaded,
  getRssContent,
  getTamilblastersContent,
  getAllMagnets,
  setRssContent,
  setTamilblastersContent,
  getMagnetsForImdb,
  addImdbMagnetMapping,
  getTorboxStream,
  setTorboxStream,
  getCacheStats,
};
