const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../../config');
const cacheService = require('../services/cache');

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

async function extractMagnetsFromPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    
    const $ = cheerio.load(response.data);
    const magnets = [];
    
    $('a[href^="magnet:"]').each((i, el) => {
      const magnetLink = $(el).attr('href');
      if (magnetLink) {
        const hashMatch = magnetLink.match(/btih:([a-fA-F0-9]{40})/i) || 
                         magnetLink.match(/btih:([a-zA-Z2-7]{32})/i);
        const nameMatch = magnetLink.match(/dn=([^&]+)/);
        
        magnets.push({
          magnet: magnetLink,
          hash: hashMatch ? hashMatch[1].toLowerCase() : null,
          name: nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : 'Unknown',
        });
      }
    });
    
    return magnets;
  } catch (error) {
    console.error(`Error extracting magnets from ${url}:`, error.message);
    return [];
  }
}

function parseTitle(title) {
  const result = {
    title: title,
    year: null,
    quality: null,
    type: 'movie',
    season: null,
    episode: null,
  };
  
  const yearMatch = title.match(/\((\d{4})\)|\[(\d{4})\]|\.(\d{4})\./);
  if (yearMatch) {
    result.year = yearMatch[1] || yearMatch[2] || yearMatch[3];
  }
  
  const qualityPatterns = ['2160p', '4K', '1080p', '720p', '480p', 'HDRip', 'WEB-DL', 'WEBRip', 'BluRay', 'BDRip', 'DVDRip', 'CAM', 'HDTS', 'PreDVD', 'DVDScr'];
  for (const quality of qualityPatterns) {
    if (title.toLowerCase().includes(quality.toLowerCase())) {
      result.quality = quality;
      break;
    }
  }
  
  const seasonMatch = title.match(/S(\d{1,2})(?:E(\d{1,3}))?/i) || 
                      title.match(/Season\s*(\d{1,2})/i);
  if (seasonMatch) {
    result.type = 'series';
    result.season = parseInt(seasonMatch[1]);
    if (seasonMatch[2]) {
      result.episode = parseInt(seasonMatch[2]);
    }
  }
  
  let cleanTitle = title
    .replace(/\(?\d{4}\)?/, '')
    .replace(/S\d{1,2}(?:E\d{1,3})?/gi, '')
    .replace(/Season\s*\d+/gi, '')
    .replace(/\d{3,4}p/gi, '')
    .replace(/HDRip|WEB-?DL|WEBRip|BluRay|BDRip|DVDRip|CAM|HDTS|PreDVD|DVDScr/gi, '')
    .replace(/x264|x265|HEVC|AAC|ESub|Multi|Audio|Tamil|Telugu|Hindi|English|Malayalam/gi, '')
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  result.cleanTitle = cleanTitle;
  
  return result;
}

async function scrapeRssFeeds() {
  console.log('[RSS] Starting RSS feed scrape...');
  const allItems = [];
  
  for (const feedUrl of config.RSS_FEEDS) {
    try {
      console.log(`[RSS] Fetching: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      
      for (const item of feed.items.slice(0, 20)) {
        const parsed = parseTitle(item.title || '');
        const magnets = await extractMagnetsFromPage(item.link);
        
        if (magnets.length > 0) {
          allItems.push({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            guid: item.guid,
            parsed,
            magnets,
            source: 'tamilmv',
            category: getCategoryFromUrl(feedUrl),
          });
        }
      }
    } catch (error) {
      console.error(`[RSS] Error fetching ${feedUrl}:`, error.message);
    }
  }
  
  console.log(`[RSS] Scraped ${allItems.length} items with magnets`);
  cacheService.setRssContent(allItems);
  updateMagnetsCache();
  
  return allItems;
}

function getCategoryFromUrl(url) {
  if (url.includes('forum/10')) return 'predvd';
  if (url.includes('forum/11')) return 'web-hd';
  if (url.includes('forum/12')) return 'hd-rips';
  if (url.includes('forum/17')) return 'hollywood-multi';
  if (url.includes('forum/14')) return 'hdtv';
  if (url.includes('forum/19')) return 'series';
  return 'other';
}

function updateMagnetsCache() {
  const rssContent = cacheService.getRssContent();
  const tamilblastersContent = cacheService.getTamilblastersContent();
  
  const allMagnets = [];
  
  for (const item of rssContent) {
    for (const magnet of item.magnets) {
      allMagnets.push({
        ...magnet,
        title: item.title,
        parsed: item.parsed,
        source: item.source,
        category: item.category,
        pubDate: item.pubDate,
      });
    }
  }
  
  for (const item of tamilblastersContent) {
    for (const magnet of item.magnets) {
      allMagnets.push({
        ...magnet,
        title: item.title,
        parsed: item.parsed,
        source: item.source,
        category: item.category,
      });
    }
  }
  
  cacheService.setAllMagnets(allMagnets);
  console.log(`[Cache] Updated magnets cache with ${allMagnets.length} total magnets`);
}

module.exports = {
  scrapeRssFeeds,
  extractMagnetsFromPage,
  parseTitle,
  updateMagnetsCache,
};
