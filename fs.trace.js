var fs = require('fs');

var fsAccess = fs.access;
fs.access = function(path, mode, callback) {
	console.log('access: ' + path);
	return fsAccess(path, mode, callback);
}

var fsAccessSync = fs.accessSync;
fs.accessSync = function(path, mode) {
	console.log('accessSync: ' + path);
	return fsAccessSync(path, mode);
}

var fsExists = fs.exists;
fs.exists = function(path, callback) {
	console.log('exists: ' + path);
	return fsExists(path, callback);
}

var fsExistsSync = fs.existsSync;
fs.existsSync = function(path) {
	console.log('existsSync: ' + path);
	return fsExistsSync(path);
}

/*
var fsReadFile = fs.readFile;
fs.readFile = function(path, options, callback) {
	console.log('readFile: ' + path);
	return fsReadFile(path, options, callback);
}

var fsReadFileSync = fs.readFileSync;
fs.readFileSync = function(path, options) {
	console.log('readFileSync: ' + path);
	return fsReadFileSync(path, options);
}
*/

var fsClose = fs.close;
fs.close = function(fd, callback) {
	console.log('close');
	return fsClose(fd, callback);
}

var fsCloseSync = fs.closeSync;
fs.closeSync = function(fd) {
	//console.log('closeSync');
	return fsCloseSync(fd);
}

var fsOpenSync = fs.openSync;
fs.openSync = function(path, flags, mode) {
	console.log('openSync: ' + path);
	return fsOpenSync(path, flags, mode);
}

var fsOpen = fs.open;
fs.open = function(path, flags, mode, callback) {
	console.log('open: ' + path);
	return fsOpen(path, flags, mode, callback);
}

var fsWrite = fs.write;
fs.write = function(fd, buffer, offset, length, position, callback) {
	console.log('write');
	return fsWrite(fd, buffer, offset, length, position, callback);
}

var fsWriteSync = fs.writeSync;
fs.writeSync = function(fd, buffer, offset, length, position) {
	console.log('writeSync');
	return fsWriteSync(fd, buffer, offset, length, position);
}

var fsRename = fs.rename;
fs.rename = function(oldPath, newPath, callback) {
	console.log('rename');
	return fsRename(oldPath, newPath, callback);
}

var fsRenameSync = fs.renameSync;
fs.renameSync = function(oldPath, newPath) {
	console.log('renameSync');
	return fsRenameSync(oldPath, newPath);
}

var fsTruncate = fs.truncate;
fs.truncate = function(path, len, callback) {
	console.log('truncate');
	return fsTruncate(path, len, callback);
}

var fsTruncateSync = fs.truncateSync;
fs.truncateSync = function(path, len) {
	console.log('truncateSync');
	return fsTruncateSync(path, len);
}

var fsFTruncate = fs.ftruncate;
fs.ftruncate = function(path, len, callback) {
	console.log('ftruncate');
	return fsFTruncate(path, len, callback);
}

var fsFTruncateSync = fs.ftruncateSync;
fs.ftruncateSync = function(path, len) {
	console.log('ftruncateSync');
	return fsFTruncateSync(path, len);
}

var fsRmdir = fs.rmdir;
fs.rmdir = function(path, callback) {
	console.log('rmdir');
	return fsRmdir(path, callback);
}

var fsRmdirSync = fs.rmdirSync;
fs.rmdirSync = function(path) {
	console.log('rmdirSync');
	return fsRmdirSync(path);
}

var fsFdatasync = fs.fdatasync;
fs.fdatasync = function(fd, callback) {
	console.log('fdatasync');
	return fsFdatasync(fd, callback);
};

var fsFdatasyncSync = fs.fdatasyncSync;
fs.fdatasyncSync = function(fd) {
	console.log('fdatasyncSync');
	return fsFdatasyncSync(fd);
};

var fsFsync = fs.fsync;
fs.fsync = function(fd, callback) {
	console.log('fsync');
	return fsFsync(fd, callback);
};

var fsFsyncSync = fs.fsyncSync;
fs.fsyncSync = function(fd) {
	console.log('fsyncSync');
	return fsFsyncSync(fd);
};

var fsMkdir = fs.mkdir;
fs.mkdir = function(path, mode, callback) {
	console.log('mkdir: ' + path);
	return fsMkdir(path, mode, callback);
}

var fsMkdirSync = fs.mkdirSync;
fs.mkdirSync = function(path, mode) {
	console.log('mkdirSync: ' + path);
	return fsMkdirSync(path, mode);
}

var fsReaddir = fs.readdir;
fs.readdir = function(path, options, callback) {
	console.log('readdir: ' + path);
	return fsReaddir(path, options, callback);
}

var fsReaddirSync = fs.readdirSync;
fs.readdirSync = function(path, options) {
	console.log('readdirSync: ' + path);
	return fsReaddirSync(path, options);
}

var fsFstat = fs.fstat;
fs.fstat = function(fd, callback) {
	console.log('fstat');
	return fsFstat(fd, callback)
}

var fsStatSync = fs.statSync;
fs.statSync = function(path) {
	console.log('statSync: ' + path);
	return fsStatSync(path);
}

var fsLstat = fs.lstat;
fs.lstat = function(path, callback) {
	console.log('lstat: ' + path);
	return fsLstat(path, callback)
}

var fsLstatSync = fs.lstatSync;
fs.lstatSync = function(path) {
	console.log('lstatSync: ' + path);
	return fsLstatSync(path);
}

var fsReadlink = fs.readlink;
fs.readlink = function(path, options, callback) {
	console.log('readlink: ' + path);
	return fsReadlink(path, options, callback);
}

var fsReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function(path, options) {
	console.log('readlinkSync: ' + path);
	return fsReadlinkSync(path, options);
}

var fsSymlink = fs.symlink;
fs.symlink = function(target, path, type, callback) {
	console.log('symlink: ' + target);
	return fsSymlink(target, path, type, callback);
}

var fsSymlinkSync = fs.symlinkSync;
fs.symlinkSync = function(target, path, type) {
	console.log('symlinkSync: ' + target);
	return fsSymlinkSync(target, path, type);
}

var fsLink = fs.link;
fs.link = function(existingPath, newPath, callback) {
	console.log('link: ' + existingPath);
	return fsLink(existingPath, newPath, callback);
}

var fsLinkSync = fs.linkSync;
fs.linkSync = function(existingPath, newPath) {
	console.log('linkSync: ' + existingPath);
	return fsLinkSync(existingPath, newPath);
}

var fsUnlink = fs.unlink;
fs.unlink = function(path, callback) {
	console.log('unlink: ' + path);
	return fsUnlink(path, callback);
}

var fsUnlinkSync = fs.unlinkSync;
fs.unlinkSync = function(path) {
	console.log('unlinkSync: ' + path);
	return fsUnlinkSync(path);
}
