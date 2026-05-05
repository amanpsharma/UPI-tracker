const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent Metro from bundling the Express backend
config.resolver.blockList = [/\/server\/.*/];

module.exports = config;
