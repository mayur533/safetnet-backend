const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Disable inspector proxy to prevent debugger connection issues
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Disable WebSocket upgrades for inspector connections
        if (req.headers.upgrade === 'websocket' && req.url?.includes('/inspector')) {
          res.statusCode = 404;
          res.end('Inspector disabled');
          return;
        }
        return middleware(req, res, next);
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
