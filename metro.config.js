const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force react-native-worklets to resolve from compiled lib/module
// instead of TypeScript src/ to avoid "Unable to resolve ./serializable" errors.
const workletsLibPath = path.resolve(
  __dirname,
  'node_modules/react-native-worklets/lib/module/index'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react-native-worklets' ||
    moduleName === 'react-native-worklets/src/index'
  ) {
    return {
      filePath: workletsLibPath + '.js',
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
