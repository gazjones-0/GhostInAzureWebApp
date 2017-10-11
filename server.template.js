var fs = require('fs');
var path = require('path');

// load our module path cache
require('./server.cache.modulePath');

// load our cache
eval(require('zlib').gunzipSync(fs.readFileSync(path.resolve(__dirname, 'server.cache.js.gz'))).toString());

// save the original readFileSync that we'll override with our caching version
var originalReadFileSync = fs.readFileSync;

// caching version of readFileSync that avoids the filesystem if the file is in the cache
function cachedReadFileSync(file, options) {
	if (!options || options === 'utf8') {
		var fn = file.replace(path.resolve(__dirname, 'node_modules') + path.sep, '');
		if (fn.endsWith('.js')) {
			fn = fn.substr(0, fn.length - 3);
		}
		if (s[fn]) {
			return s[fn];
		};
	}
	return originalReadFileSync(file, options);
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
