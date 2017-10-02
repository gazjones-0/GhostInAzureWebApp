var fs = require('fs');

// load our cache
var serverCache = require('./server.cache');
var originalReadFileSync = fs.readFileSync;

// caching version of readFileSync that avoids the filesystem if the file is in the cache
function cachedReadFileSync(path, options) {
    if (!options || options === 'utf8') {
        var content = serverCache[path];
        if (content) {
            return content;
        };
    }
    return originalReadFileSync(path, options);
};

// replace standard readFileSync with our caching version
fs.readFileSync = cachedReadFileSync;

// if iisnode is being used, it defines the port we need to use in an environment
// variable; if this variable is defined, we override the config with it otherwise
// the web app won't work correctly
if (process.env.PORT) {
	// we do the require in-place here to ensure it comes from the cache
    require('ghost/core/server/config').set('server:port', process.env.PORT);
}
