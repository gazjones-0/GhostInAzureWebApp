var module = require('module');
var path = require('path');

if (module.modulePathCacheExists !== true) {
	var cacheItems = [];
	cacheItems.push ('var module=require(\'module\');');
	for(var item in module._pathCache) {
		cacheItems.push('module._pathCache[\'' + convertStringToCode(item) + '\']=\'' + convertStringToCode(module._pathCache[item]) + '\';');
	}
	cacheItems.push('module.modulePathCacheExists = true;');
	var cache = cacheItems.join('');
	require('fs').writeFileSync(path.resolve(__dirname, 'server.cache.modulePath.js'), cache);
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
