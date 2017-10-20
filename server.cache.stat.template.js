var fs = require('fs');
fs.statCacheExists = false;
fs.statCache = [];

var fslstatSync = fs.lstatSync;
fs.lstatSync = function(path) {
	var stats = fslstatSync(path);
	if (!fs.statCache[path]) {
		fs.statCache[path] = 'new fs.Stats(' + stats.dev + ', ' + stats.mode + ', ' + stats.nlink + ', ' + stats.uid + ', ' + stats.gid + ', ' + stats.rdev + ', ' + stats.blksize + ', ' + stats.ino + ', ' + stats.size + ', ' + stats.blocks + ', ' + stats.atime.getTime() + ', ' + stats.mtime.getTime() + ', ' + stats.ctime.getTime() + ', ' + stats.birthtime.getTime() + ');';
	}
	return stats;
}

var fsstatSync = fs.statSync;
fs.statSync = function(path) {
	var stats = fsstatSync(path);
	if (!fs.statCache[path]) {
		fs.statCache[path] = 'new fs.Stats(' + stats.dev + ', ' + stats.mode + ', ' + stats.nlink + ', ' + stats.uid + ', ' + stats.gid + ', ' + stats.rdev + ', ' + stats.blksize + ', ' + stats.ino + ', ' + stats.size + ', ' + stats.blocks + ', ' + stats.atime.getTime() + ', ' + stats.mtime.getTime() + ', ' + stats.ctime.getTime() + ', ' + stats.birthtime.getTime() + ');';
	}
	return stats;
}
