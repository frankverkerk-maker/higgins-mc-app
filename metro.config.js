const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Blokkeer tijdelijke package-installatie mappen die Metro probeert te watchen
// Dit voorkomt de ENOENT crash bij *_tmp_* mappen (pnpm race condition)
config.resolver = config.resolver ?? {};
config.resolver.blockList = [
  /node_modules\/[^/]+_tmp_?\d*(\/.*)?$/,
  /node_modules\/pdfkit_tmp.*/,
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
