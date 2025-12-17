const torboxService = require('./torbox');
const database = require('./database');
const config = require('../../config');

let isRunning = false;
let workerInterval = null;

async function processMagnet(magnet, apiKey) {
  const hash = magnet.hash;
  
  try {
    console.log(`[TorBox Worker] Processing magnet ${hash}...`);
    
    const cacheCheck = await torboxService.checkTorboxCache(hash, apiKey);
    
    if (!cacheCheck) {
      await database.upsertTorboxStream({
        magnetHash: hash,
        status: 'not_cached',
        errorMessage: 'Not available on TorBox cache',
      });
      return null;
    }
    
    console.log(`[TorBox Worker] Magnet ${hash} is cached on TorBox!`);
    
    const addResult = await torboxService.addMagnetToTorbox(magnet.magnet_link, apiKey);
    
    if (!addResult?.data?.torrent_id) {
      await database.upsertTorboxStream({
        magnetHash: hash,
        status: 'error',
        errorMessage: 'Failed to add magnet to TorBox',
      });
      return null;
    }
    
    const torrentId = addResult.data.torrent_id;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const torrentInfo = await torboxService.getTorrentInfo(torrentId, apiKey);
    
    if (!torrentInfo || !torrentInfo.files || torrentInfo.files.length === 0) {
      await database.upsertTorboxStream({
        magnetHash: hash,
        torrentId: torrentId,
        status: 'processing',
        errorMessage: 'Waiting for files',
      });
      return null;
    }
    
    const videoFiles = torrentInfo.files.filter(f => {
      const ext = f.name?.toLowerCase().split('.').pop();
      return ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext);
    });
    
    if (videoFiles.length === 0) {
      await database.upsertTorboxStream({
        magnetHash: hash,
        torrentId: torrentId,
        status: 'no_video',
        errorMessage: 'No video files found',
      });
      return null;
    }
    
    const file = videoFiles[0];
    const downloadLink = await torboxService.requestDownloadLink(torrentId, file.id, apiKey);
    
    if (!downloadLink) {
      await database.upsertTorboxStream({
        magnetHash: hash,
        torrentId: torrentId,
        status: 'error',
        errorMessage: 'Failed to get download link',
      });
      return null;
    }
    
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    
    await database.upsertTorboxStream({
      magnetHash: hash,
      torrentId: torrentId,
      status: 'ready',
      downloadUrl: downloadLink,
      fileName: file.name,
      fileSize: file.size,
      expiresAt: expiresAt,
    });
    
    console.log(`[TorBox Worker] ✅ Stream ready for ${hash}`);
    return downloadLink;
    
  } catch (error) {
    console.error(`[TorBox Worker] Error processing ${hash}:`, error.message);
    await database.upsertTorboxStream({
      magnetHash: hash,
      status: 'error',
      errorMessage: error.message,
    });
    return null;
  }
}

async function runWorker(apiKey) {
  if (isRunning) {
    console.log('[TorBox Worker] Already running, skipping...');
    return;
  }
  
  if (!apiKey) {
    console.log('[TorBox Worker] No API key configured, skipping...');
    return;
  }
  
  isRunning = true;
  
  try {
    const pendingMagnets = await database.getPendingMagnets(20);
    
    if (pendingMagnets.length === 0) {
      console.log('[TorBox Worker] No pending magnets to process');
      return;
    }
    
    console.log(`[TorBox Worker] Processing ${pendingMagnets.length} pending magnets...`);
    
    for (const magnet of pendingMagnets) {
      await processMagnet(magnet, apiKey);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[TorBox Worker] Batch complete');
    
  } catch (error) {
    console.error('[TorBox Worker] Error:', error.message);
  } finally {
    isRunning = false;
  }
}

function startWorker(apiKey, intervalMs = 60000) {
  if (workerInterval) {
    clearInterval(workerInterval);
  }
  
  console.log(`[TorBox Worker] Starting worker with ${intervalMs}ms interval`);
  
  runWorker(apiKey);
  
  workerInterval = setInterval(() => {
    runWorker(apiKey);
  }, intervalMs);
}

function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[TorBox Worker] Worker stopped');
  }
}

module.exports = {
  processMagnet,
  runWorker,
  startWorker,
  stopWorker,
};
