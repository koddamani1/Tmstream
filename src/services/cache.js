const NodeCache = require('node-cache');
const config = require('../../config');

const cache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false,
});

const CACHE_KEYS = {
  RSS_CONTENT: 'rss_content',
  TAMILBLASTERS_CONTENT: 'tamilblasters_content',
  MAGNETS: 'all_magnets',
  CATALOG_MOVIES: 'catalog_movies',
  CATALOG_SERIES: 'catalog_series',
  IMDB_MAGNET_MAP: 'imdb_magnet_map',
};

function getRssContent() {
  return cache.get(CACHE_KEYS.RSS_CONTENT) || [];
}

function setRssContent(data) {
  cache.set(CACHE_KEYS.RSS_CONTENT, data, config.CACHE_TTL.RSS);
}

function getTamilblastersContent() {
  return cache.get(CACHE_KEYS.TAMILBLASTERS_CONTENT) || [];
}

function setTamilblastersContent(data) {
  cache.set(CACHE_KEYS.TAMILBLASTERS_CONTENT, data, config.CACHE_TTL.TAMILBLASTERS);
}

function getAllMagnets() {
  return cache.get(CACHE_KEYS.MAGNETS) || [];
}

function setAllMagnets(data) {
  cache.set(CACHE_KEYS.MAGNETS, data, config.CACHE_TTL.RSS);
}

function getCatalog(type) {
  const key = type === 'movie' ? CACHE_KEYS.CATALOG_MOVIES : CACHE_KEYS.CATALOG_SERIES;
  return cache.get(key) || [];
}

function setCatalog(type, data) {
  const key = type === 'movie' ? CACHE_KEYS.CATALOG_MOVIES : CACHE_KEYS.CATALOG_SERIES;
  cache.set(key, data, config.CACHE_TTL.METADATA);
}

function getTorboxStream(magnetHash) {
  return cache.get(`torbox_${magnetHash}`);
}

function setTorboxStream(magnetHash, data) {
  cache.set(`torbox_${magnetHash}`, data, config.CACHE_TTL.TORBOX);
}

function getMetadata(imdbId) {
  return cache.get(`meta_${imdbId}`);
}

function setMetadata(imdbId, data) {
  cache.set(`meta_${imdbId}`, data, config.CACHE_TTL.METADATA);
}

function getFanart(imdbId) {
  return cache.get(`fanart_${imdbId}`);
}

function setFanart(imdbId, data) {
  cache.set(`fanart_${imdbId}`, data, config.CACHE_TTL.METADATA);
}

function getImdbMagnetMap() {
  return cache.get(CACHE_KEYS.IMDB_MAGNET_MAP) || {};
}

function setImdbMagnetMap(data) {
  cache.set(CACHE_KEYS.IMDB_MAGNET_MAP, data, config.CACHE_TTL.METADATA);
}

function addImdbMagnetMapping(imdbId, magnets, title, year) {
  const map = getImdbMagnetMap();
  if (!map[imdbId]) {
    map[imdbId] = { magnets: [], title, year };
  }
  for (const magnet of magnets) {
    if (!map[imdbId].magnets.find(m => m.hash === magnet.hash)) {
      map[imdbId].magnets.push(magnet);
    }
  }
  setImdbMagnetMap(map);
}

function getMagnetsForImdb(imdbId) {
  const map = getImdbMagnetMap();
  return map[imdbId]?.magnets || [];
}

module.exports = {
  cache,
  CACHE_KEYS,
  getRssContent,
  setRssContent,
  getTamilblastersContent,
  setTamilblastersContent,
  getAllMagnets,
  setAllMagnets,
  getCatalog,
  setCatalog,
  getTorboxStream,
  setTorboxStream,
  getMetadata,
  setMetadata,
  getFanart,
  setFanart,
  getImdbMagnetMap,
  setImdbMagnetMap,
  addImdbMagnetMapping,
  getMagnetsForImdb,
};
