const cacheService = require('../services/cache');
const torboxService = require('../services/torbox');
const omdbService = require('../services/omdb');
const parser = require('../utils/parser');

function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchingMagnets(title, year, allMagnets) {
  const normalizedTitle = normalizeTitle(title);
  const titleWords = normalizedTitle.split(' ').filter(w => w.length > 2);
  
  return allMagnets.filter(magnet => {
    const magnetTitle = normalizeTitle(magnet.parsed?.cleanTitle || magnet.name || magnet.title || '');
    const magnetYear = magnet.parsed?.year;
    
    if (year && magnetYear && year !== magnetYear) {
      return false;
    }
    
    let matchCount = 0;
    for (const word of titleWords) {
      if (magnetTitle.includes(word)) {
        matchCount++;
      }
    }
    
    const matchRatio = titleWords.length > 0 ? matchCount / titleWords.length : 0;
    return matchRatio >= 0.5;
  });
}

function filterByQuality(magnets, qualities) {
  if (!qualities || qualities.length === 0) return magnets;
  
  return magnets.filter(magnet => {
    const quality = (magnet.parsed?.quality || magnet.name || '').toLowerCase();
    
    for (const q of qualities) {
      if (q === '4k' && (quality.includes('2160') || quality.includes('4k'))) return true;
      if (q === '1080p' && quality.includes('1080')) return true;
      if (q === '720p' && quality.includes('720')) return true;
      if (q === '480p' && quality.includes('480')) return true;
      if (q === 'cam' && (quality.includes('cam') || quality.includes('hdts'))) return true;
    }
    
    return false;
  });
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
    const allMagnets = cacheService.getAllMagnets();
    const maxResults = userConfig.maxResults || 10;
    
    if (!allMagnets || allMagnets.length === 0) {
      console.log('[Stream] No magnets available in cache');
      return { streams: [] };
    }
    
    let matchingMagnets = [];
    let title = '';
    let year = '';
    
    if (id.startsWith('tt')) {
      const imdbId = id.split(':')[0];
      
      matchingMagnets = cacheService.getMagnetsForImdb(imdbId);
      console.log(`[Stream] Found ${matchingMagnets.length} cached magnets for IMDb ${imdbId}`);
      
      if (matchingMagnets.length === 0) {
        const metadata = await omdbService.getMetadata(imdbId);
        
        if (metadata) {
          title = metadata.name;
          year = metadata.releaseInfo?.split('–')[0];
          
          console.log(`[Stream] Searching for "${title}" (${year})`);
          matchingMagnets = findMatchingMagnets(title, year, allMagnets);
          console.log(`[Stream] Found ${matchingMagnets.length} matching magnets by title`);
          
          if (matchingMagnets.length > 0) {
            cacheService.addImdbMagnetMapping(imdbId, matchingMagnets, title, year);
          }
        }
      }
    } else if (id.startsWith('tamilmv:')) {
      matchingMagnets = cacheService.getMagnetsForImdb(id);
      console.log(`[Stream] Found ${matchingMagnets.length} cached magnets for internal ID ${id}`);
      
      if (matchingMagnets.length === 0) {
        const encodedTitle = id.replace('tamilmv:', '');
        try {
          const decodedTitle = Buffer.from(encodedTitle, 'base64').toString('utf-8');
          matchingMagnets = allMagnets.filter(magnet => 
            magnet.title?.includes(decodedTitle) || decodedTitle.includes(magnet.title || '')
          );
        } catch {
          console.log('[Stream] Could not decode internal ID');
        }
      }
    }
    
    if (matchingMagnets.length === 0) {
      console.log(`[Stream] No matching magnets found for ${id}`);
      return { streams: [] };
    }
    
    if (userConfig.qualities && userConfig.qualities.length > 0) {
      const filtered = filterByQuality(matchingMagnets, userConfig.qualities);
      if (filtered.length > 0) {
        matchingMagnets = filtered;
      }
    }
    
    matchingMagnets.sort((a, b) => {
      const qualityA = getQualityRank(a.parsed?.quality);
      const qualityB = getQualityRank(b.parsed?.quality);
      return qualityB - qualityA;
    });
    
    console.log(`[Stream] Processing ${matchingMagnets.length} matching magnets for ${id}`);
    
    const streams = [];
    const useTorbox = userConfig.debridProvider === 'torbox' && userConfig.torboxKey;
    
    for (const magnet of matchingMagnets.slice(0, Math.min(maxResults, 15))) {
      if (!magnet.hash) continue;
      
      const streamName = parser.formatStreamName(magnet);
      const streamTitle = parser.formatStreamTitle(magnet);
      
      if (useTorbox) {
        try {
          const torboxStreams = await torboxService.getStreamFromMagnet(
            magnet.magnet, 
            magnet.hash,
            userConfig.torboxKey
          );
          
          if (torboxStreams && torboxStreams.length > 0) {
            for (const stream of torboxStreams) {
              streams.push({
                name: parser.formatTorBoxStreamName(magnet),
                title: `${streamTitle}\n📁 ${stream.title}`,
                url: stream.url,
                behaviorHints: {
                  bingeGroup: `torbox-${magnet.hash}`,
                  notWebReady: false,
                },
              });
            }
            continue;
          }
        } catch (error) {
          console.error(`[Stream] Error getting TorBox stream for ${magnet.hash}:`, error.message);
        }
      }
      
      if (magnet.magnet && magnet.hash) {
        streams.push({
          name: streamName,
          title: streamTitle,
          infoHash: magnet.hash,
          sources: magnet.magnet.match(/tr=([^\&]+)/g)?.map(tr => 
            decodeURIComponent(tr.replace('tr=', ''))
          ) || [],
          behaviorHints: {
            bingeGroup: `torrent-${magnet.hash}`,
          },
        });
      }
      
      if (streams.length >= maxResults) break;
    }
    
    console.log(`[Stream] Returning ${streams.length} streams for ${id}`);
    return { streams: streams.slice(0, maxResults) };
    
  } catch (error) {
    console.error(`[Stream] Error getting streams for ${id}:`, error.message);
    return { streams: [] };
  }
}

module.exports = {
  getStreams,
};
