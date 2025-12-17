const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../../config');
const cacheService = require('../services/cache');
const database = require('../services/database');
const { parseTitle, extractMagnetsFromPage, updateMagnetsCache } = require('./rss');

async function scrapeTamilblasters() {
  console.log('[TamilBlasters] Starting scrape...');
  const allItems = [];
  
  try {
    const response = await axios.get(config.TAMILBLASTERS_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    const $ = cheerio.load(response.data);
    const postLinks = [];
    
    $('article a, .entry-title a, .post-title a, h2 a, h3 a').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      
      if (href && title && href.includes(config.TAMILBLASTERS_URL.replace('https://', '').replace('http://', '').split('/')[0])) {
        if (!href.includes('/category/') && !href.includes('/tag/') && !href.includes('/page/')) {
          postLinks.push({ url: href, title });
        }
      }
    });
    
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      
      if (href && title.length > 10) {
        const isMovieLink = /\d{4}/.test(title) && 
                           (title.toLowerCase().includes('tamil') || 
                            title.toLowerCase().includes('telugu') || 
                            title.toLowerCase().includes('hindi') ||
                            title.toLowerCase().includes('download') ||
                            /\d{3,4}p/i.test(title));
        
        if (isMovieLink && !postLinks.some(p => p.url === href)) {
          postLinks.push({ url: href, title });
        }
      }
    });
    
    const magnetsOnMainPage = [];
    $('a[href^="magnet:"]').each((i, el) => {
      const magnetLink = $(el).attr('href');
      if (magnetLink) {
        const hashMatch = magnetLink.match(/btih:([a-fA-F0-9]{40})/i) || 
                         magnetLink.match(/btih:([a-zA-Z2-7]{32})/i);
        const nameMatch = magnetLink.match(/dn=([^&]+)/);
        
        magnetsOnMainPage.push({
          magnet: magnetLink,
          hash: hashMatch ? hashMatch[1].toLowerCase() : null,
          name: nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : 'Unknown',
        });
      }
    });
    
    if (magnetsOnMainPage.length > 0) {
      allItems.push({
        title: 'TamilBlasters Main Page',
        link: config.TAMILBLASTERS_URL,
        parsed: { title: 'TamilBlasters', type: 'movie' },
        magnets: magnetsOnMainPage,
        source: 'tamilblasters',
        category: 'main',
      });
    }
    
    const uniqueLinks = [...new Map(postLinks.map(item => [item.url, item])).values()];
    console.log(`[TamilBlasters] Found ${uniqueLinks.length} unique post links`);
    
    for (const post of uniqueLinks.slice(0, 15)) {
      try {
        const magnets = await extractMagnetsFromPage(post.url);
        
        if (magnets.length > 0) {
          const parsed = parseTitle(post.title);
          
          allItems.push({
            title: post.title,
            link: post.url,
            parsed,
            magnets,
            source: 'tamilblasters',
            category: parsed.type === 'series' ? 'series' : 'movies',
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[TamilBlasters] Error scraping post ${post.url}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('[TamilBlasters] Error scraping main page:', error.message);
  }
  
  console.log(`[TamilBlasters] Scraped ${allItems.length} items with magnets`);
  cacheService.setTamilblastersContent(allItems);
  updateMagnetsCache();
  
  await saveToDatabase(allItems);
  
  return allItems;
}

async function saveToDatabase(items) {
  let savedContent = 0;
  let savedMagnets = 0;
  
  for (const item of items) {
    try {
      const contentId = await database.upsertContent({
        title: item.title,
        cleanTitle: item.parsed?.cleanTitle || null,
        year: item.parsed?.year ? parseInt(item.parsed.year) : null,
        type: item.parsed?.type || 'movie',
        category: item.category || null,
        source: item.source || 'tamilblasters',
        pubDate: null,
      });
      
      if (contentId) {
        savedContent++;
        
        for (const magnet of item.magnets) {
          if (magnet.hash) {
            await database.upsertMagnet(contentId, {
              magnet: magnet.magnet,
              hash: magnet.hash,
              name: magnet.name || item.title,
              quality: item.parsed?.quality || null,
            });
            savedMagnets++;
          }
        }
      }
    } catch (error) {
      console.error(`[TamilBlasters] Error saving to database: ${error.message}`);
    }
  }
  
  console.log(`[TamilBlasters] Saved ${savedContent} content items and ${savedMagnets} magnets to database`);
}

module.exports = {
  scrapeTamilblasters,
};
