const cacheService = require('../services/cache');
const omdbService = require('../services/omdb');
const fanartService = require('../services/fanart');
const torboxService = require('../services/torbox');

function matchesQualityFilter(item, qualities) {
  if (!qualities || qualities.length === 0) return true;
  
  const quality = (item.parsed?.quality || '').toLowerCase();
  
  for (const q of qualities) {
    if (q === '4k' && (quality.includes('2160') || quality.includes('4k'))) return true;
    if (q === '1080p' && quality.includes('1080')) return true;
    if (q === '720p' && quality.includes('720')) return true;
    if (q === '480p' && quality.includes('480')) return true;
    if (q === 'cam' && (quality.includes('cam') || quality.includes('hdts') || quality.includes('predvd'))) return true;
  }
  
  return qualities.length === 0;
}

function matchesLanguageFilter(item, languages) {
  if (!languages || languages.length === 0) return true;
  
  const title = (item.title || '').toLowerCase();
  const name = (item.parsed?.cleanTitle || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  const combined = `${title} ${name} ${category}`;
  
  for (const lang of languages) {
    if (combined.includes(lang.toLowerCase())) return true;
  }
  
  return false;
}

async function getCatalog(type, id, extra = {}, userConfig = {}) {
  const skip = parseInt(extra.skip) || 0;
  const limit = 100;
  
  const rssContent = cacheService.getRssContent();
  const tamilblastersContent = cacheService.getTamilblastersContent();
  
  let items = [...rssContent, ...tamilblastersContent];
  
  if (type === 'movie') {
    items = items.filter(item => item.parsed?.type === 'movie');
  } else if (type === 'series') {
    items = items.filter(item => item.parsed?.type === 'series');
  }
  
  if (id === 'tamil-movies-hd') {
    items = items.filter(item => 
      item.category === 'web-hd' || 
      item.category === 'hd-rips' ||
      (item.parsed?.quality && ['1080p', '2160p', '4K', 'BluRay'].some(q => 
        item.parsed.quality.toLowerCase().includes(q.toLowerCase())
      ))
    );
  } else if (id === 'hollywood-multi') {
    items = items.filter(item => item.category === 'hollywood-multi');
  } else if (id === 'tamil-series') {
    items = items.filter(item => 
      item.category === 'series' || 
      item.parsed?.type === 'series'
    );
  }
  
  if (userConfig.qualities && userConfig.qualities.length > 0) {
    items = items.filter(item => matchesQualityFilter(item, userConfig.qualities));
  }
  
  if (userConfig.languages && userConfig.languages.length > 0) {
    items = items.filter(item => matchesLanguageFilter(item, userConfig.languages));
  }
  
  if (extra.search) {
    const searchTerm = extra.search.toLowerCase();
    items = items.filter(item => 
      item.title?.toLowerCase().includes(searchTerm) ||
      item.parsed?.cleanTitle?.toLowerCase().includes(searchTerm)
    );
  }
  
  const seen = new Set();
  items = items.filter(item => {
    const key = item.parsed?.cleanTitle?.toLowerCase() || item.title?.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  items.sort((a, b) => {
    const dateA = new Date(a.pubDate || 0);
    const dateB = new Date(b.pubDate || 0);
    return dateB - dateA;
  });
  
  const paginatedItems = items.slice(skip, skip + limit);
  const torboxKey = userConfig.torboxKey;
  
  // Filter items that have TorBox streams available
  const itemsWithTorbox = [];
  
  for (const item of paginatedItems) {
    if (!item.magnets || item.magnets.length === 0) continue;
    
    // Check if any magnet has a TorBox stream
    let hasTorboxStream = false;
    
    for (const magnet of item.magnets.slice(0, 3)) {
      if (!magnet.hash) continue;
      
      try {
        // Check memory cache first
        const cached = cacheService.getTorboxStream(magnet.hash);
        if (cached) {
          hasTorboxStream = true;
          break;
        }
        
        // Check if it's cached on TorBox servers
        if (torboxKey) {
          const torboxCached = await torboxService.checkTorboxCache(magnet.hash, torboxKey);
          if (torboxCached) {
            hasTorboxStream = true;
            break;
          }
        }
      } catch (err) {
        // Continue checking other magnets
      }
    }
    
    if (hasTorboxStream) {
      itemsWithTorbox.push(item);
    }
  }
  
  console.log(`[Catalog] Found ${itemsWithTorbox.length}/${paginatedItems.length} items with TorBox streams`);
  
  const metas = await Promise.all(itemsWithTorbox.map(async (item) => {
    const internalId = `tamilmv:${Buffer.from(item.title || '').toString('base64').slice(0, 30)}`;
    
    const meta = {
      id: internalId,
      type: item.parsed?.type || type,
      name: item.parsed?.cleanTitle || item.title || 'Unknown',
      poster: null,
      background: null,
      description: `Source: ${item.source}\nCategory: ${item.category}\nQuality: ${item.parsed?.quality || 'Unknown'}`,
      releaseInfo: item.parsed?.year || '',
    };
    
    if (item.parsed?.cleanTitle && item.parsed?.year) {
      try {
        const searchResults = await omdbService.searchByTitle(
          item.parsed.cleanTitle, 
          item.parsed.year,
          item.parsed.type
        );
        
        if (searchResults.length > 0) {
          const match = searchResults[0];
          meta.id = match.imdbID;
          meta.name = match.Title;
          meta.poster = match.Poster !== 'N/A' ? match.Poster : null;
          meta.releaseInfo = match.Year;
          
          cacheService.addImdbMagnetMapping(match.imdbID, item.magnets, item.title, item.parsed.year);
          
          const fanart = await fanartService.getMovieImages(match.imdbID);
          if (fanart) {
            if (fanart.poster && !meta.poster) meta.poster = fanart.poster;
            if (fanart.background) meta.background = fanart.background;
          }
        }
      } catch (error) {
      }
    }
    
    if (meta.id === internalId && item.magnets?.length > 0) {
      cacheService.addImdbMagnetMapping(internalId, item.magnets, item.title, item.parsed?.year);
    }
    
    if (!meta.poster) {
      meta.poster = 'https://via.placeholder.com/270x400/1a0033/e0aaff?text=' + encodeURIComponent(meta.name.slice(0, 15));
    }
    
    return meta;
  }));
  
  return { metas };
}

async function getMeta(type, id) {
  if (id.startsWith('tt')) {
    const metadata = await omdbService.getMetadata(id);
    
    if (metadata) {
      const enriched = await fanartService.enrichMetadata(metadata);
      return { meta: enriched };
    }
  }
  
  if (id.startsWith('tamilmv:')) {
    const rssContent = cacheService.getRssContent();
    const tamilblastersContent = cacheService.getTamilblastersContent();
    const allItems = [...rssContent, ...tamilblastersContent];
    
    for (const item of allItems) {
      const itemId = `tamilmv:${Buffer.from(item.title || '').toString('base64').slice(0, 30)}`;
      if (itemId === id) {
        return {
          meta: {
            id: id,
            type: item.parsed?.type || type,
            name: item.parsed?.cleanTitle || item.title || 'Unknown',
            poster: 'https://via.placeholder.com/270x400/1a0033/e0aaff?text=' + encodeURIComponent((item.parsed?.cleanTitle || 'Movie').slice(0, 15)),
            description: `Source: ${item.source}\nCategory: ${item.category}\nQuality: ${item.parsed?.quality || 'Unknown'}`,
            releaseInfo: item.parsed?.year || '',
          }
        };
      }
    }
  }
  
  return { meta: null };
}

module.exports = {
  getCatalog,
  getMeta,
};
