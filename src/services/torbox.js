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
    // Check if torrent is already cached on TorBox
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
    
    return response.data?.data?.[magnetHash];
  } catch (error) {
    console.error('[TorBox] Error checking cache:', error.message);
    return null;
  }
}

async function getStreamFromMagnet(magnetLink, magnetHash, userApiKey) {
  const cached = cacheService.getTorboxStream(magnetHash);
  if (cached) {
    console.log(`[TorBox] Using cached stream for ${magnetHash}`);
    return cached;
  }
  
  const apiKey = getApiKey(userApiKey);
  if (!apiKey) {
    console.log('[TorBox] No API key available, skipping');
    return null;
  }
  
  try {
    // First check if we already have this torrent
    const existingTorrent = await findExistingTorrent(magnetHash, userApiKey);
    
    let torrentId;
    let torrentInfo;
    
    if (existingTorrent) {
      console.log(`[TorBox] Found existing torrent ${magnetHash} (ID: ${existingTorrent.id})`);
      torrentId = existingTorrent.id;
      torrentInfo = existingTorrent;
    } else {
      // Check if torrent is cached on TorBox servers
      const cacheCheck = await checkTorboxCache(magnetHash, userApiKey);
      
      if (!cacheCheck || !cacheCheck.cached) {
        console.log(`[TorBox] Torrent ${magnetHash} not in your account and not cached on TorBox`);
        return null;
      }
      
      console.log(`[TorBox] Torrent ${magnetHash} is cached on TorBox! Adding...`);
      
      const addResult = await addMagnetToTorbox(magnetLink, userApiKey);
      
      if (!addResult?.data?.torrent_id) {
        console.error('[TorBox] Failed to add magnet to TorBox');
        return null;
      }
      
      torrentId = addResult.data.torrent_id;
      
      // Wait for TorBox to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      torrentInfo = await getTorrentInfo(torrentId, userApiKey);
    }
    
    if (!torrentInfo || !torrentInfo.files || torrentInfo.files.length === 0) {
      console.log('[TorBox] No files found in torrent');
      return null;
    }
    
    const videoFiles = torrentInfo.files.filter(f => {
      const ext = f.name?.toLowerCase().split('.').pop();
      return ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext);
    });
    
    if (videoFiles.length === 0) {
      console.log('[TorBox] No video files found');
      return null;
    }
    
    const streams = [];
    
    for (const file of videoFiles.slice(0, 5)) {
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
    
    if (streams.length > 0) {
      cacheService.setTorboxStream(magnetHash, streams);
      console.log(`[TorBox] ✅ Generated ${streams.length} stream(s) for ${magnetHash}`);
    }
    
    return streams;
    
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
};
