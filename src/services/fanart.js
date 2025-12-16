const axios = require('axios');
const config = require('../../config');
const cacheService = require('./cache');

const FANART_API_BASE = 'http://webservice.fanart.tv/v3';

async function getMovieImages(imdbId) {
  if (!imdbId || !imdbId.startsWith('tt')) {
    return null;
  }
  
  const cached = cacheService.getFanart(imdbId);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await axios.get(`${FANART_API_BASE}/movies/${imdbId}`, {
      params: {
        api_key: config.FANART_API_KEY,
      },
      timeout: 10000,
    });
    
    const images = {
      poster: null,
      background: null,
      logo: null,
      banner: null,
      thumb: null,
    };
    
    if (response.data) {
      if (response.data.movieposter?.length > 0) {
        images.poster = response.data.movieposter[0].url;
      }
      
      if (response.data.moviebackground?.length > 0) {
        images.background = response.data.moviebackground[0].url;
      }
      
      if (response.data.hdmovielogo?.length > 0) {
        images.logo = response.data.hdmovielogo[0].url;
      } else if (response.data.movielogo?.length > 0) {
        images.logo = response.data.movielogo[0].url;
      }
      
      if (response.data.moviebanner?.length > 0) {
        images.banner = response.data.moviebanner[0].url;
      }
      
      if (response.data.moviethumb?.length > 0) {
        images.thumb = response.data.moviethumb[0].url;
      }
    }
    
    cacheService.setFanart(imdbId, images);
    return images;
    
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error(`[Fanart.tv] Error fetching images for ${imdbId}:`, error.message);
    }
    return null;
  }
}

async function getTvImages(tvdbId) {
  if (!tvdbId) {
    return null;
  }
  
  const cacheKey = `tv_${tvdbId}`;
  const cached = cacheService.getFanart(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await axios.get(`${FANART_API_BASE}/tv/${tvdbId}`, {
      params: {
        api_key: config.FANART_API_KEY,
      },
      timeout: 10000,
    });
    
    const images = {
      poster: null,
      background: null,
      logo: null,
      banner: null,
    };
    
    if (response.data) {
      if (response.data.tvposter?.length > 0) {
        images.poster = response.data.tvposter[0].url;
      }
      
      if (response.data.showbackground?.length > 0) {
        images.background = response.data.showbackground[0].url;
      }
      
      if (response.data.hdtvlogo?.length > 0) {
        images.logo = response.data.hdtvlogo[0].url;
      } else if (response.data.clearlogo?.length > 0) {
        images.logo = response.data.clearlogo[0].url;
      }
      
      if (response.data.tvbanner?.length > 0) {
        images.banner = response.data.tvbanner[0].url;
      }
    }
    
    cacheService.setFanart(cacheKey, images);
    return images;
    
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error(`[Fanart.tv] Error fetching TV images for ${tvdbId}:`, error.message);
    }
    return null;
  }
}

async function enrichMetadata(metadata) {
  if (!metadata || !metadata.id) {
    return metadata;
  }
  
  const images = await getMovieImages(metadata.id);
  
  if (images) {
    if (images.poster && !metadata.poster) {
      metadata.poster = images.poster;
    }
    if (images.background) {
      metadata.background = images.background;
    }
    if (images.logo) {
      metadata.logo = images.logo;
    }
  }
  
  return metadata;
}

module.exports = {
  getMovieImages,
  getTvImages,
  enrichMetadata,
};
