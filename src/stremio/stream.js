const cacheService = require('../services/cache');
const torboxService = require('../services/torbox');
const omdbService = require('../services/omdb');

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

async function getStreams(type, id) {
  try {
    const allMagnets = cacheService.getAllMagnets();
    
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
    
    console.log(`[Stream] Processing ${matchingMagnets.length} matching magnets for ${id}`);
    
    const streams = [];
    
    for (const magnet of matchingMagnets.slice(0, 5)) {
      if (!magnet.hash) continue;
      
      try {
        const torboxStreams = await torboxService.getStreamFromMagnet(magnet.magnet, magnet.hash);
        
        if (torboxStreams && torboxStreams.length > 0) {
          for (const stream of torboxStreams) {
            streams.push({
              name: `TorBox\n${magnet.parsed?.quality || 'Unknown'}`,
              title: `${magnet.name || magnet.title || 'Unknown'}\n${stream.title}`,
              url: stream.url,
              behaviorHints: {
                bingeGroup: `torbox-${magnet.hash}`,
                notWebReady: false,
              },
            });
          }
        }
      } catch (error) {
        console.error(`[Stream] Error getting TorBox stream for ${magnet.hash}:`, error.message);
      }
    }
    
    if (streams.length === 0) {
      for (const magnet of matchingMagnets.slice(0, 5)) {
        if (magnet.magnet && magnet.hash) {
          streams.push({
            name: `Magnet\n${magnet.parsed?.quality || 'Unknown'}`,
            title: magnet.name || magnet.title || 'Unknown',
            infoHash: magnet.hash,
            behaviorHints: {
              bingeGroup: `magnet-${magnet.hash}`,
            },
          });
        }
      }
    }
    
    console.log(`[Stream] Returning ${streams.length} streams for ${id}`);
    return { streams };
    
  } catch (error) {
    console.error(`[Stream] Error getting streams for ${id}:`, error.message);
    return { streams: [] };
  }
}

module.exports = {
  getStreams,
};
