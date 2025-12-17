const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS content (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        clean_title TEXT,
        year INTEGER,
        type VARCHAR(20) DEFAULT 'movie',
        category VARCHAR(100),
        source VARCHAR(50),
        pub_date TIMESTAMP,
        imdb_id VARCHAR(20),
        poster TEXT,
        background TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(title, source)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS magnets (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
        magnet_link TEXT NOT NULL,
        hash VARCHAR(64) NOT NULL,
        name TEXT,
        quality VARCHAR(50),
        size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hash)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS torbox_streams (
        id SERIAL PRIMARY KEY,
        magnet_hash VARCHAR(64) NOT NULL UNIQUE,
        torrent_id INTEGER,
        status VARCHAR(30) DEFAULT 'pending',
        download_url TEXT,
        file_name TEXT,
        file_size BIGINT,
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_imdb ON content(imdb_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_type ON content(type)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_magnets_hash ON magnets(hash)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_magnets_content ON magnets(content_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_torbox_status ON torbox_streams(status)
    `);
    
    console.log('[Database] Tables created successfully');
  } finally {
    client.release();
  }
}

async function upsertContent(content) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO content (title, clean_title, year, type, category, source, pub_date, imdb_id, poster, background)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (title, source) 
      DO UPDATE SET 
        clean_title = EXCLUDED.clean_title,
        year = EXCLUDED.year,
        type = EXCLUDED.type,
        category = EXCLUDED.category,
        imdb_id = EXCLUDED.imdb_id,
        poster = EXCLUDED.poster,
        background = EXCLUDED.background,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      content.title,
      content.cleanTitle || null,
      content.year || null,
      content.type || 'movie',
      content.category || null,
      content.source || 'unknown',
      content.pubDate || null,
      content.imdbId || null,
      content.poster || null,
      content.background || null
    ]);
    
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

async function upsertMagnet(contentId, magnet) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO magnets (content_id, magnet_link, hash, name, quality, size)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (hash) 
      DO UPDATE SET 
        content_id = EXCLUDED.content_id,
        name = EXCLUDED.name,
        quality = EXCLUDED.quality,
        size = EXCLUDED.size
      RETURNING id
    `, [
      contentId,
      magnet.magnet || magnet.magnetLink,
      magnet.hash,
      magnet.name || magnet.title || null,
      magnet.quality || magnet.parsed?.quality || null,
      magnet.size || null
    ]);
    
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

async function getTorboxStream(magnetHash) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM torbox_streams 
      WHERE magnet_hash = $1 
        AND status = 'ready'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [magnetHash]);
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function upsertTorboxStream(stream) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO torbox_streams (magnet_hash, torrent_id, status, download_url, file_name, file_size, expires_at, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (magnet_hash) 
      DO UPDATE SET 
        torrent_id = EXCLUDED.torrent_id,
        status = EXCLUDED.status,
        download_url = EXCLUDED.download_url,
        file_name = EXCLUDED.file_name,
        file_size = EXCLUDED.file_size,
        expires_at = EXCLUDED.expires_at,
        error_message = EXCLUDED.error_message,
        last_checked = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      stream.magnetHash,
      stream.torrentId || null,
      stream.status || 'pending',
      stream.downloadUrl || null,
      stream.fileName || null,
      stream.fileSize || null,
      stream.expiresAt || null,
      stream.errorMessage || null
    ]);
    
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

async function getContentWithTorboxStreams(type, catalogId, limit = 100, offset = 0) {
  const client = await pool.connect();
  
  try {
    let typeFilter = '';
    let categoryFilter = '';
    
    if (type === 'movie') {
      typeFilter = "AND c.type = 'movie'";
    } else if (type === 'series') {
      typeFilter = "AND c.type = 'series'";
    }
    
    if (catalogId === 'tamil-movies-hd') {
      categoryFilter = "AND (c.category = 'web-hd' OR c.category = 'hd-rips')";
    } else if (catalogId === 'hollywood-multi') {
      categoryFilter = "AND c.category = 'hollywood-multi'";
    } else if (catalogId === 'tamil-series') {
      categoryFilter = "AND (c.category = 'series' OR c.type = 'series')";
    }
    
    const result = await client.query(`
      SELECT DISTINCT ON (c.id) 
        c.id, c.title, c.clean_title, c.year, c.type, c.category, 
        c.source, c.imdb_id, c.poster, c.background, c.pub_date,
        ts.status as torbox_status, ts.download_url
      FROM content c
      INNER JOIN magnets m ON c.id = m.content_id
      INNER JOIN torbox_streams ts ON m.hash = ts.magnet_hash
      WHERE ts.status = 'ready'
        AND (ts.expires_at IS NULL OR ts.expires_at > CURRENT_TIMESTAMP)
        ${typeFilter}
        ${categoryFilter}
      ORDER BY c.id, c.pub_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function getMagnetsForContent(contentId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT m.*, ts.status as torbox_status, ts.download_url, ts.file_name
      FROM magnets m
      LEFT JOIN torbox_streams ts ON m.hash = ts.magnet_hash
      WHERE m.content_id = $1
      ORDER BY m.created_at DESC
    `, [contentId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function getReadyStreamsForHash(magnetHash) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM torbox_streams 
      WHERE magnet_hash = $1 
        AND status = 'ready'
        AND download_url IS NOT NULL
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [magnetHash]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function getPendingMagnets(limit = 50) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT DISTINCT m.hash, m.magnet_link, m.name
      FROM magnets m
      LEFT JOIN torbox_streams ts ON m.hash = ts.magnet_hash
      WHERE ts.id IS NULL 
         OR (ts.status = 'pending' AND ts.last_checked < NOW() - INTERVAL '5 minutes')
         OR (ts.status = 'error' AND ts.last_checked < NOW() - INTERVAL '30 minutes')
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function getAllMagnets() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT m.*, c.title as content_title, c.clean_title, c.year, c.type, c.imdb_id,
             ts.status as torbox_status, ts.download_url
      FROM magnets m
      LEFT JOIN content c ON m.content_id = c.id
      LEFT JOIN torbox_streams ts ON m.hash = ts.magnet_hash
      ORDER BY m.created_at DESC
    `);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function getContentByImdbId(imdbId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT c.*, m.hash, m.magnet_link, m.name as magnet_name, m.quality,
             ts.status as torbox_status, ts.download_url, ts.file_name
      FROM content c
      INNER JOIN magnets m ON c.id = m.content_id
      LEFT JOIN torbox_streams ts ON m.hash = ts.magnet_hash
      WHERE c.imdb_id = $1
      ORDER BY m.created_at DESC
    `, [imdbId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
  upsertContent,
  upsertMagnet,
  getTorboxStream,
  upsertTorboxStream,
  getContentWithTorboxStreams,
  getMagnetsForContent,
  getReadyStreamsForHash,
  getPendingMagnets,
  getAllMagnets,
  getContentByImdbId,
};
