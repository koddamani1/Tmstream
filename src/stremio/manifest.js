const config = require('../../config');

const ALL_CATALOGS = {
  'tamil-movies': {
    type: 'movie',
    id: 'tamil-movies',
    name: 'Tamil Movies',
    extra: [
      { name: 'skip', isRequired: false },
      { name: 'search', isRequired: false },
    ],
  },
  'tamil-movies-hd': {
    type: 'movie',
    id: 'tamil-movies-hd',
    name: 'Tamil HD Movies',
    extra: [
      { name: 'skip', isRequired: false },
      { name: 'search', isRequired: false },
    ],
  },
  'hollywood-multi': {
    type: 'movie',
    id: 'hollywood-multi',
    name: 'Hollywood (Multi Audio)',
    extra: [
      { name: 'skip', isRequired: false },
      { name: 'search', isRequired: false },
    ],
  },
  'tamil-series': {
    type: 'series',
    id: 'tamil-series',
    name: 'Tamil Series',
    extra: [
      { name: 'skip', isRequired: false },
      { name: 'search', isRequired: false },
    ],
  },
};

function getManifest() {
  return {
    id: config.ADDON.id,
    version: config.ADDON.version,
    name: config.ADDON.name,
    description: config.ADDON.description,
    logo: config.ADDON.logo,
    background: config.ADDON.background,
    contactEmail: config.ADDON.contactEmail,
    types: config.ADDON.types,
    catalogs: Object.values(ALL_CATALOGS),
    resources: ['catalog', 'stream', 'meta'],
    idPrefixes: ['tt', 'tamilmv'],
    behaviorHints: {
      adult: false,
      configurable: true,
      configurationRequired: false,
    },
  };
}

function getConfiguredManifest(userConfig) {
  const selectedCatalogs = userConfig.catalogs || Object.keys(ALL_CATALOGS);
  const catalogs = selectedCatalogs
    .filter(id => ALL_CATALOGS[id])
    .map(id => ALL_CATALOGS[id]);
  
  const types = [...new Set(catalogs.map(c => c.type))];
  
  return {
    id: config.ADDON.id,
    version: config.ADDON.version,
    name: config.ADDON.name,
    description: `${config.ADDON.description} - Configured with ${catalogs.length} catalogs`,
    logo: config.ADDON.logo,
    background: config.ADDON.background,
    contactEmail: config.ADDON.contactEmail,
    types: types.length > 0 ? types : config.ADDON.types,
    catalogs: catalogs.length > 0 ? catalogs : Object.values(ALL_CATALOGS),
    resources: ['catalog', 'stream', 'meta'],
    idPrefixes: ['tt', 'tamilmv'],
    behaviorHints: {
      adult: false,
      configurable: true,
      configurationRequired: false,
    },
  };
}

module.exports = {
  getManifest,
  getConfiguredManifest,
  ALL_CATALOGS,
};
