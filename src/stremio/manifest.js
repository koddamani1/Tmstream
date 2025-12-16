const config = require('../../config');

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
    catalogs: config.ADDON.catalogs.map(catalog => ({
      type: catalog.type,
      id: catalog.id,
      name: catalog.name,
      extra: [
        { name: 'skip', isRequired: false },
        { name: 'genre', isRequired: false },
        { name: 'search', isRequired: false },
      ],
    })),
    resources: config.ADDON.resources,
    idPrefixes: config.ADDON.idPrefixes,
    behaviorHints: {
      adult: false,
      configurable: false,
    },
  };
}

module.exports = {
  getManifest,
};
