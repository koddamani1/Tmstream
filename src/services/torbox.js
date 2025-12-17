const axios = require('axios');
const config = require('../../config');
const cacheService = require('./cache');

const TORBOX_API_BASE = 'https://api.torbox.app/v1/api';

function getApiKey(userKey) {
  return userKey || config.TORBOX_API_KEY;
}

async function addMagnetToTorbox(magnetLink, userApiKey) {
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) {
    console.log('[TorBox] No API key available');
    return null;
  }
  
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('magnet', magnetLink);
    
    const response = await axios.post(
      `${TORBOX_API_BASE}/torrents/createtorrent`,
      form,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
        timeout: 30000,
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('[TorBox] Error adding magnet:', error.response?.data || error.message);
    return null;
  }
}

async function getTorrentInfo(torrentId, userApiKey) {
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) return null;
  
  try {
    const response = await axios.get(
      `${TORBOX_API_BASE}/torrents/mylist`,
      {
        params: {
          bypass_cache: true,
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );
    
    if (response.data?.data) {
      return response.data.data.find(t => t.id === torrentId);
    }
    
    return null;
  } catch (error) {
    console.error('[TorBox] Error getting torrent info:', error.response?.data || error.message);
    return null;
  }
}

async function findExistingTorrent(magnetHash, userApiKey) {
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) return null;
  
  try {
    const response = await axios.get(
      `${TORBOX_API_BASE}/torrents/mylist`,
      {
        params: {
          bypass_cache: true,
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );
    
    if (response.data?.data) {
      // Find torrent by hash
      return response.data.data.find(t => 
        t.hash && t.hash.toLowerCase() === magnetHash.toLowerCase()
      );
    }
    
    return null;
  } catch (error) {
    console.error('[TorBox] Error finding existing torrent:', error.message);
    return null;
  }
}

async function requestDownloadLink(torrentId, fileId, userApiKey) {
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) return null;
  
  try {
    const response = await axios.get(
      `${TORBOX_API_BASE}/torrents/requestdl`,
      {
        params: {
          token: apiKey,
          torrent_id: torrentId,
          file_id: fileId,
        },
        timeout: 30000,
      }
    );
    
    return response.data?.data;
  } catch (error) {
    console.error('[TorBox] Error requesting download link:', error.response?.data || error.message);
    return null;
  }
}

async function checkTorboxCache(magnetHash, userApiKey) {
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) return null;
  
  try {
    // Check if torrent is already cached on TorBox servers
    const response = await axios.get(
      `${TORBOX_API_BASE}/torrents/checkcached`,
      {
        params: {
          hash: magnetHash,
          format: 'object',
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 10000,
      }
    );
    
    const cacheData = response.data?.data?.[magnetHash];
    
    if (cacheData && cacheData.cached) {
      console.log(`[TorBox] ✅ Hash ${magnetHash} is CACHED on TorBox!`);
      return cacheData;
    }
    
    console.log(`[TorBox] ❌ Hash ${magnetHash} is NOT cached on TorBox`);
    return null;
  } catch (error) {
    console.error('[TorBox] Error checking cache:', error.message);
    return null;
  }
}

async function getCachedStreamInstant(magnetHash, magnetLink, userApiKey) {
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) return null;
  
  try {
    // Step 1: Check if cached (instant check, no download)
    const cacheCheck = await checkTorboxCache(magnetHash, userApiKey);
    
    if (!cacheCheck) {
      return null; // Not cached, skip
    }
    
    // Step 2: Add magnet (instant if cached)
    console.log(`[TorBox] Adding cached torrent ${magnetHash}...`);
    const addResult = await addMagnetToTorbox(magnetLink, userApiKey);
    
    if (!addResult?.data?.torrent_id) {
      console.error('[TorBox] Failed to add cached magnet');
      return null;
    }
    
    const torrentId = addResult.data.torrent_id;
    
    // Step 3: Get torrent info (should be instant for cached)
    const torrentInfo = await getTorrentInfo(torrentId, userApiKey);
    
    if (!torrentInfo || !torrentInfo.files || torrentInfo.files.length === 0) {
      console.log('[TorBox] No files in cached torrent');
      return null;
    }
    
    // Step 4: Filter video files
    const videoFiles = torrentInfo.files.filter(f => {
      const ext = f.name?.toLowerCase().split('.').pop();
      return ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext);
    });
    
    if (videoFiles.length === 0) {
      return null;
    }
    
    // Step 5: Get download links (instant for cached)
    const streams = [];
    
    for (const file of videoFiles.slice(0, 3)) {
      const downloadLink = await requestDownloadLink(torrentId, file.id, userApiKey);
      
      if (downloadLink) {
        streams.push({
          name: 'TorBox',
          title: file.name,
          url: downloadLink,
          behaviorHints: {
            notWebReady: false,
          },
        });
      }
    }
    
    console.log(`[TorBox] ✅ Got ${streams.length} instant stream(s) for ${magnetHash}`);
    return streams;
    
  } catch (error) {
    console.error('[TorBox] Error getting instant stream:', error.message);
    return null;
  }
}

async function getStreamFromMagnet(magnetLink, magnetHash, userApiKey) {
  // Check memory cache first
  const cached = cacheService.getTorboxStream(magnetHash);
  if (cached) {
    console.log(`[TorBox] Using memory cached stream for ${magnetHash}`);
    return cached;
  }
  
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) {
    console.log('[TorBox] No API key available, skipping');
    return null;
  }
  
  try {
    // Step 1: Check existing torrents in user's account
    let existingTorrent = await findExistingTorrent(magnetHash, userApiKey);
    
    // Step 2: If not in account, add it to TorBox
    if (!existingTorrent) {
      console.log(`[TorBox] Adding magnet ${magnetHash} to TorBox...`);
      const addResult = await addMagnetToTorbox(magnetLink, userApiKey);
      
      if (addResult?.data?.torrent_id) {
        // Wait a moment for TorBox to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        existingTorrent = await getTorrentInfo(addResult.data.torrent_id, userApiKey);
      }
    }
    
    if (!existingTorrent) {
      console.log(`[TorBox] Could not add torrent ${magnetHash}`);
      return null;
    }
    
    console.log(`[TorBox] Torrent ${magnetHash} status: ${existingTorrent.download_state || 'unknown'}`);
    
    // Step 3: Check if torrent has files ready
    const videoFiles = existingTorrent.files?.filter(f => {
      const ext = f.name?.toLowerCase().split('.').pop();
      return ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext);
    }) || [];
    
    if (videoFiles.length === 0) {
      console.log(`[TorBox] No video files found in torrent ${magnetHash}`);
      return null;
    }
    
    // Step 4: Get download links for video files
    const streams = [];
    
    for (const file of videoFiles.slice(0, 5)) {
      try {
        const downloadLink = await requestDownloadLink(existingTorrent.id, file.id, userApiKey);
        
        if (downloadLink) {
          streams.push({
            name: 'TorBox',
            title: file.name,
            url: downloadLink,
            behaviorHints: {
              notWebReady: false,
            },
          });
        }
      } catch (err) {
        console.log(`[TorBox] Could not get link for file ${file.name}: ${err.message}`);
      }
    }
    
    if (streams.length > 0) {
      cacheService.setTorboxStream(magnetHash, streams);
      console.log(`[TorBox] ✅ Got ${streams.length} stream(s) for ${magnetHash}`);
      return streams;
    }
    
    console.log(`[TorBox] Torrent ${magnetHash} not ready yet (downloading or processing)`);
    return null;
    
  } catch (error) {
    console.error('[TorBox] Error getting stream:', error.message);
    return null;
  }
}

async function getStreamsForContent(magnets, userApiKey) {
  const streams = [];
  
  for (const magnet of magnets.slice(0, 5)) {
    if (!magnet.hash) continue;
    
    const magnetStreams = await getStreamFromMagnet(magnet.magnet, magnet.hash, userApiKey);
    
    if (magnetStreams && magnetStreams.length > 0) {
      streams.push(...magnetStreams.map(s => ({
        ...s,
        title: `${magnet.name}\n${s.title}`,
      })));
    }
  }
  
  return streams;
}

module.exports = {
  addMagnetToTorbox,
  getTorrentInfo,
  requestDownloadLink,
  getStreamFromMagnet,
  getStreamsForContent,
  checkTorboxCache,
  findExistingTorrent,
  getCachedStreamInstant,
};
