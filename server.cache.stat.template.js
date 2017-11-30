var fs = require('fs');
fs.statCacheExists = false;
fs.statCache = [];
fs.statExceptionCache = [];

// plug in our own version of lstatSync that caches the results
var fslstatSync = fs.lstatSync;
fs.lstatSync = function(path) {
	try {
		var stats = fslstatSync(path);
		if (!fs.statCache[path]) {
			fs.statCache[path] = 'new fs.Stats(' + stats.dev + ', ' + stats.mode + ', ' + stats.nlink + ', ' + stats.uid + ', ' + stats.gid + ', ' + stats.rdev + ', ' + stats.blksize + ', ' + stats.ino + ', ' + stats.size + ', ' + stats.blocks + ', ' + stats.atime.getTime() + ', ' + stats.mtime.getTime() + ', ' + stats.ctime.getTime() + ', ' + stats.birthtime.getTime() + ');';
		}
		return stats;
	} catch(ex) {
		if (!fs.statExceptionCache[path]) {
			fs.statExceptionCache[path] = '{ Error: new Error(\'' + convertStringToCode(ex.message) + '\'), errno: ' + ex.errno + ', code: \'' + convertStringToCode(ex.code) + '\', syscall: \'' + convertStringToCode(ex.syscall) + '\', path: \'' + convertStringToCode(ex.path) + '\' }';
		}
		throw ex;
	}
}

// plug in our own version of statSync that caches the results
var fsstatSync = fs.statSync;
fs.statSync = function(path) {
	try {
		var stats = fsstatSync(path);
		if (!fs.statCache[path]) {
			fs.statCache[path] = 'new fs.Stats(' + stats.dev + ', ' + stats.mode + ', ' + stats.nlink + ', ' + stats.uid + ', ' + stats.gid + ', ' + stats.rdev + ', ' + stats.blksize + ', ' + stats.ino + ', ' + stats.size + ', ' + stats.blocks + ', ' + stats.atime.getTime() + ', ' + stats.mtime.getTime() + ', ' + stats.ctime.getTime() + ', ' + stats.birthtime.getTime() + ');';
		}
		return stats;
	} catch(ex) {
		if (!fs.statExceptionCache[path]) {
			fs.statExceptionCache[path] = '{ Error: new Error(\'' + convertStringToCode(ex.message) + '\'), errno: ' + ex.errno + ', code: \'' + convertStringToCode(ex.code) + '\', syscall: \'' + convertStringToCode(ex.syscall) + '\', path: \'' + convertStringToCode(ex.path) + '\' }';
		}
		throw ex;
	}
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
