const cacheService = require('../services/cache');
const omdbService = require('../services/omdb');
const fanartService = require('../services/fanart');
const database = require('../services/database');

function matchesQualityFilter(item, qualities) {
  if (!qualities || qualities.length === 0) return true;
  
  const quality = (item.parsed?.quality || item.quality || '').toLowerCase();
  
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
  const name = (item.clean_title || item.parsed?.cleanTitle || '').toLowerCase();
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
  
  try {
    const dbContent = await database.getContentWithTorboxStreams(type, id, limit, skip);
    
    if (dbContent && dbContent.length > 0) {
      console.log(`[Catalog] Found ${dbContent.length} items with TorBox streams in database`);
      
      let items = dbContent;
      
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
          item.clean_title?.toLowerCase().includes(searchTerm)
        );
      }
      
      const metas = await Promise.all(items.map(async (item) => {
        const internalId = item.imdb_id || `tamilmv:${Buffer.from(item.title || '').toString('base64').slice(0, 30)}`;
        
        const meta = {
          id: internalId,
          type: item.type || type,
          name: item.clean_title || item.title || 'Unknown',
          poster: item.poster || null,
          background: item.background || null,
          description: `Source: ${item.source}\nCategory: ${item.category}`,
          releaseInfo: item.year ? String(item.year) : '',
        };
        
        if (!meta.poster && item.clean_title && item.year) {
          try {
            const searchResults = await omdbService.searchByTitle(
              item.clean_title, 
              item.year,
              item.type
            );
            
            if (searchResults.length > 0) {
              const match = searchResults[0];
              meta.id = match.imdbID;
              meta.name = match.Title;
              meta.poster = match.Poster !== 'N/A' ? match.Poster : null;
              meta.releaseInfo = match.Year;
              
              const fanart = await fanartService.getMovieImages(match.imdbID);
              if (fanart) {
                if (fanart.poster && !meta.poster) meta.poster = fanart.poster;
                if (fanart.background) meta.background = fanart.background;
              }
            }
          } catch (error) {
          }
        }
        
        if (!meta.poster) {
          meta.poster = 'https://via.placeholder.com/270x400/1a0033/e0aaff?text=' + encodeURIComponent(meta.name.slice(0, 15));
        }
        
        return meta;
      }));
      
      return { metas };
    }
  } catch (error) {
    console.error('[Catalog] Database error:', error.message);
  }
  
  console.log('[Catalog] No TorBox streams in database, returning empty catalog');
  return { metas: [] };
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
