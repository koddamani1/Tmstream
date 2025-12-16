module.exports = {
  // ============================================================
  // API KEYS - Set these via environment variables or secrets
  // ============================================================
  
  // TorBox API Key - Get from https://torbox.app
  // Set via: TORBOX_API_KEY environment variable
  TORBOX_API_KEY: process.env.TORBOX_API_KEY || '',
  
  // OMDb API Key - Get from http://www.omdbapi.com/apikey.aspx
  // Set via: OMDB_API_KEY environment variable
  OMDB_API_KEY: process.env.OMDB_API_KEY || '',
  
  // Fanart.tv API Key - Get from https://fanart.tv/get-an-api-key/
  // Set via: FANART_API_KEY environment variable
  FANART_API_KEY: process.env.FANART_API_KEY || '',

  // ============================================================
  // RSS FEED URLS - 1TamilMV Forums
  // Insert or modify RSS feed URLs here
  // ============================================================
  RSS_FEEDS: [
    // PreDVD/DVDScr/CAM/TC releases
    'https://www.1tamilmv.kiwi/index.php?/forums/forum/10-predvd-dvdscr-cam-tc.xml/',
    
    // WEB-HD/iTunes HD/BluRay releases
    'https://www.1tamilmv.kiwi/index.php?/forums/forum/11-web-hd-itunes-hd-bluray.xml/',
    
    // HD Rips/DVD Rips/BR Rips
    'https://www.1tamilmv.kiwi/index.php?/forums/forum/12-hd-rips-dvd-rips-br-rips.xml/',
    
    // Hollywood Movies in Multi Audios
    'https://www.1tamilmv.kiwi/index.php?/forums/forum/17-hollywood-movies-in-multi-audios.xml/',
    
    // HDTV/SDTV/HDTV Rips
    'https://www.1tamilmv.kiwi/index.php?/forums/forum/14-hdtv-sdtv-hdtv-rips.xml/',
    
    // Web Series & TV Shows
    'https://www.1tamilmv.kiwi/index.php?/forums/forum/19-web-series-tv-shows/',
  ],

  // ============================================================
  // 1TAMILBLASTERS URL
  // Insert or modify the 1TamilBlasters website URL here
  // ============================================================
  TAMILBLASTERS_URL: 'https://1tamilblasters.band/',

  // ============================================================
  // SCRAPING INTERVALS (in minutes)
  // ============================================================
  RSS_SCRAPE_INTERVAL: 30,        // 1TamilMV RSS feeds update interval
  TAMILBLASTERS_SCRAPE_INTERVAL: 10, // 1TamilBlasters update interval

  // ============================================================
  // CACHE SETTINGS (in seconds)
  // ============================================================
  CACHE_TTL: {
    RSS: 1800,          // 30 minutes for RSS content
    TAMILBLASTERS: 600, // 10 minutes for TamilBlasters content
    TORBOX: 300,        // 5 minutes for TorBox responses
    METADATA: 3600,     // 1 hour for OMDb/Fanart metadata
  },

  // ============================================================
  // STREMIO ADDON CONFIGURATION
  // ============================================================
  ADDON: {
    id: 'community.tamilmovies',
    version: '1.0.0',
    name: 'Tamil Movies & Series',
    description: 'Stream Tamil movies and series from 1TamilMV and 1TamilBlasters via TorBox',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Tamil_Nadu_emblem.svg/200px-Tamil_Nadu_emblem.svg.png',
    background: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920',
    contactEmail: '',
    types: ['movie', 'series'],
    catalogs: [
      {
        type: 'movie',
        id: 'tamil-movies',
        name: 'Tamil Movies',
      },
      {
        type: 'movie',
        id: 'tamil-movies-hd',
        name: 'Tamil HD Movies',
      },
      {
        type: 'movie',
        id: 'hollywood-multi',
        name: 'Hollywood (Multi Audio)',
      },
      {
        type: 'series',
        id: 'tamil-series',
        name: 'Tamil Series',
      },
    ],
    resources: ['catalog', 'stream', 'meta'],
    idPrefixes: ['tt'],
  },
};
