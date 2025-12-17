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
    const response = await axios.post(
      `${TORBOX_API_BASE}/torrents/createtorrent`,
      { magnet: magnetLink },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
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
    console.log(`[TorBox] Processing magnet: ${magnetHash}`);
    
    const addResult = await addMagnetToTorbox(magnetLink, userApiKey);
    
    if (!addResult?.data?.torrent_id) {
      console.error('[TorBox] Failed to add magnet to TorBox');
      return null;
    }
    
    const torrentId = addResult.data.torrent_id;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const torrentInfo = await getTorrentInfo(torrentId, userApiKey);
    
    if (!torrentInfo || !torrentInfo.files || torrentInfo.files.length === 0) {
      console.log('[TorBox] No files found in torrent yet');
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
};
