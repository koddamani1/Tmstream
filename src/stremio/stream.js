const cacheService = require('../services/cache');
const torboxService = require('../services/torbox');
const omdbService = require('../services/omdb');
const database = require('../services/database');
const parser = require('../utils/parser');

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQualityRank(quality) {
  const q = (quality || '').toLowerCase();
  if (q.includes('2160') || q.includes('4k')) return 5;
  if (q.includes('1080')) return 4;
  if (q.includes('720')) return 3;
  if (q.includes('480')) return 2;
  if (q.includes('cam') || q.includes('hdts') || q.includes('predvd')) return 1;
  return 0;
}

async function getStreams(type, id, userConfig = {}) {
  try {
    const maxResults = userConfig.maxResults || 10;
    const torboxKey = userConfig.torboxKey;
    
    if (!torboxKey) {
      console.log('[Stream] No TorBox API key configured');
      return { streams: [] };
    }
    
    let dbResults = [];
    
    if (id.startsWith('tt')) {
      const imdbId = id.split(':')[0];
      dbResults = await database.getContentByImdbId(imdbId);
      console.log(`[Stream] Found ${dbResults.length} magnets in DB for IMDb ${imdbId}`);
    }
    
    if (dbResults.length === 0) {
      const allMagnets = cacheService.getAllMagnets();
      
      if (id.startsWith('tt')) {
        const imdbId = id.split(':')[0];
        const metadata = await omdbService.getMetadata(imdbId);
        
        if (metadata) {
          const title = metadata.name;
          const year = metadata.releaseInfo?.split('–')[0];
          const normalizedTitle = normalizeTitle(title);
          const titleWords = normalizedTitle.split(' ').filter(w => w.length > 2);
          
          const matchingMagnets = allMagnets.filter(magnet => {
            const magnetTitle = normalizeTitle(magnet.parsed?.cleanTitle || magnet.name || magnet.title || '');
            const magnetYear = magnet.parsed?.year;
            
            if (year && magnetYear && year !== magnetYear) return false;
            
            let matchCount = 0;
            for (const word of titleWords) {
              if (magnetTitle.includes(word)) matchCount++;
            }
            
            const matchRatio = titleWords.length > 0 ? matchCount / titleWords.length : 0;
            return matchRatio >= 0.5;
          });
          
          dbResults = matchingMagnets.map(m => ({
            hash: m.hash,
            magnet_link: m.magnet,
            magnet_name: m.name || m.title,
            quality: m.parsed?.quality,
            content_title: m.title,
          }));
        }
      }
    }
    
    if (dbResults.length === 0) {
      console.log(`[Stream] No magnets found for ${id}`);
      return { streams: [] };
    }
    
    dbResults.sort((a, b) => {
      const qualityA = getQualityRank(a.quality);
      const qualityB = getQualityRank(b.quality);
      return qualityB - qualityA;
    });
    
    const streams = [];
    const processedHashes = new Set();
    
    for (const result of dbResults.slice(0, maxResults * 2)) {
      if (!result.hash || processedHashes.has(result.hash)) continue;
      processedHashes.add(result.hash);
      
      if (result.torbox_status === 'ready' && result.download_url) {
        streams.push({
          name: 'TorBox',
          title: `${result.content_title || result.magnet_name}\n${result.quality || ''}\n📁 ${result.file_name || 'Video'}`,
          url: result.download_url,
          behaviorHints: {
            bingeGroup: `torbox-${result.hash}`,
            notWebReady: false,
          },
        });
        continue;
      }
      
      try {
        const torboxStreams = await torboxService.getStreamFromMagnet(
          result.magnet_link, 
          result.hash,
          torboxKey
        );
        
        if (torboxStreams && torboxStreams.length > 0) {
          for (const stream of torboxStreams) {
            streams.push({
              name: 'TorBox',
              title: `${result.content_title || result.magnet_name}\n${result.quality || ''}\n📁 ${stream.title}`,
              url: stream.url,
              behaviorHints: {
                bingeGroup: `torbox-${result.hash}`,
                notWebReady: false,
              },
            });
            
            await database.upsertTorboxStream({
              magnetHash: result.hash,
              status: 'ready',
              downloadUrl: stream.url,
              fileName: stream.title,
            });
          }
        }
      } catch (error) {
        console.error(`[Stream] Error getting TorBox stream for ${result.hash}:`, error.message);
      }
      
      if (streams.length >= maxResults) break;
    }
    
    console.log(`[Stream] Returning ${streams.length} TorBox streams for ${id}`);
    return { streams: streams.slice(0, maxResults) };
    
  } catch (error) {
    console.error(`[Stream] Error getting streams for ${id}:`, error.message);
    return { streams: [] };
  }
}

module.exports = {
  getStreams,
};
