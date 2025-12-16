const cacheService = require('../services/cache');
const omdbService = require('../services/omdb');
const fanartService = require('../services/fanart');

async function getCatalog(type, id, extra = {}) {
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
  
  const metas = await Promise.all(paginatedItems.map(async (item) => {
    const internalId = `tamilmv:${Buffer.from(item.title || '').toString('base64').slice(0, 30)}`;
    
    const meta = {
      id: internalId,
      type: item.parsed?.type || type,
      name: item.parsed?.cleanTitle || item.title || 'Unknown',
      poster: null,
      background: null,
      description: `Source: ${item.source}\nCategory: ${item.category}\nQuality: ${item.parsed?.quality || 'Unknown'}`,
      releaseInfo: item.parsed?.year || '',
      _magnets: item.magnets,
      _originalTitle: item.title,
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
      meta.poster = 'https://via.placeholder.com/270x400/1a1a2e/eee?text=' + encodeURIComponent(meta.name.slice(0, 20));
    }
    
    delete meta._magnets;
    delete meta._originalTitle;
    
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
            poster: 'https://via.placeholder.com/270x400/1a1a2e/eee?text=' + encodeURIComponent((item.parsed?.cleanTitle || 'Movie').slice(0, 20)),
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
