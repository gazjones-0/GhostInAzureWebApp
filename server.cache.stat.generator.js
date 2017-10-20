var fs = require('fs');
var path = require('path');

if (fs.statCacheExists !== true) {
	var cacheItems = [];
	cacheItems.push('var fs=require(\'fs\');');
	cacheItems.push('fs.statCache = [];');
	cacheItems.push('var originalLstatSync = fs.lstatSync;');
	cacheItems.push('fs.lstatSync = function(path) {');
		cacheItems.push('if (fs.statCache[path]) {');
			cacheItems.push('return fs.statCache[path];');
		cacheItems.push('}');
		cacheItems.push('return originalLstatSync(path);');
	cacheItems.push('};');
	cacheItems.push('var originalStatSync = fs.statSync;');
	cacheItems.push('fs.statSync = function(path) {');
		cacheItems.push('if (fs.statCache[path]) {');
			cacheItems.push('return fs.statCache[path];');
		cacheItems.push('}');
		cacheItems.push('return originalStatSync(path);');
	cacheItems.push('};');
	for(var item in fs.statCache) {
		// ignore the content data and logs
		if (!item.startsWith('content/data') && !item.startsWith('content/logs')) {
			cacheItems.push('fs.statCache[\'' + convertStringToCode(item) + '\']=' + fs.statCache[item]);
		}
	}
	cacheItems.push('fs.statCacheExists = true;');
	var cache = cacheItems.join('');
	require('fs').writeFileSync(path.resolve(__dirname, 'server.cache.stat.js'), cache);
}

// converts a string into an escaped javascript string
function convertStringToCode(content) {
	var strReplaceAll = require('str-replace-all');
	content = strReplaceAll('\\', '\\\\', content);
	content = strReplaceAll('\f', '\\f', content);
	content = strReplaceAll('\n', '\\n', content);
	content = strReplaceAll('\r', '\\r', content);
	content = strReplaceAll('\t', '\\t', content);
	content = strReplaceAll('\v', '\\v', content);
	content = strReplaceAll('\'', '\\\'', content);
	return content;
};
