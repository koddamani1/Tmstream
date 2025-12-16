const axios = require('axios');
const config = require('../../config');
const cacheService = require('./cache');

const OMDB_API_BASE = 'http://www.omdbapi.com/';

async function getMetadata(imdbId) {
  if (!imdbId || !imdbId.startsWith('tt')) {
    return null;
  }
  
  const cached = cacheService.getMetadata(imdbId);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await axios.get(OMDB_API_BASE, {
      params: {
        i: imdbId,
        apikey: config.OMDB_API_KEY,
        plot: 'full',
      },
      timeout: 10000,
    });
    
    if (response.data?.Response === 'True') {
      const metadata = {
        id: imdbId,
        type: response.data.Type === 'series' ? 'series' : 'movie',
        name: response.data.Title,
        poster: response.data.Poster !== 'N/A' ? response.data.Poster : null,
        background: null,
        logo: null,
        description: response.data.Plot !== 'N/A' ? response.data.Plot : null,
        releaseInfo: response.data.Year,
        imdbRating: response.data.imdbRating !== 'N/A' ? response.data.imdbRating : null,
        genres: response.data.Genre !== 'N/A' ? response.data.Genre.split(', ') : [],
        runtime: response.data.Runtime !== 'N/A' ? response.data.Runtime : null,
        director: response.data.Director !== 'N/A' ? response.data.Director : null,
        cast: response.data.Actors !== 'N/A' ? response.data.Actors.split(', ') : [],
        country: response.data.Country,
        awards: response.data.Awards !== 'N/A' ? response.data.Awards : null,
      };
      
      cacheService.setMetadata(imdbId, metadata);
      return metadata;
    }
    
    return null;
  } catch (error) {
    console.error(`[OMDb] Error fetching metadata for ${imdbId}:`, error.message);
    return null;
  }
}

async function searchByTitle(title, year = null, type = null) {
  try {
    const params = {
      s: title,
      apikey: config.OMDB_API_KEY,
    };
    
    if (year) params.y = year;
    if (type) params.type = type;
    
    const response = await axios.get(OMDB_API_BASE, {
      params,
      timeout: 10000,
    });
    
    if (response.data?.Response === 'True' && response.data.Search) {
      return response.data.Search;
    }
    
    return [];
  } catch (error) {
    console.error(`[OMDb] Error searching for "${title}":`, error.message);
    return [];
  }
}

module.exports = {
  getMetadata,
  searchByTitle,
};
