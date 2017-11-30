var config = require('ghost/core/server/config');
var deasync = require('deasync');
var fs = require('fs');
var knexMigrator = require('knex-migrator');
var logging = require('ghost-ignition').logging();
var path = require('path');
var replaceInFile = require('replace-in-file');
var strReplaceAll = require('str-replace-all');
var uglifyJs = require('uglify-es');
var zlib = require('zlib');

// to hold the generated server cache
var serverCacheItems = [];
var serverCacheFilesProcessed = [];

// files being processed
var configProductionJsonPath = path.resolve(__dirname, 'config.production.json');
var knexMigratorPath = path.resolve(__dirname, 'node_modules/ghost');
var serverJsPath = path.resolve(__dirname, 'server.js');
var serverCacheJsPath = path.resolve(__dirname, 'server.cache.js');
var serverCacheJsZippedPath = path.resolve(__dirname, 'server.cache.js.gz');
var serverCacheModulePathJs = path.resolve(__dirname, 'server.cache.modulePath.js');
var serverCacheModulePathTemplateJs = path.resolve(__dirname, 'server.cache.modulePath.template.js');
var serverCacheStatJs = path.resolve(__dirname, 'server.cache.stat.js');
var serverCacheStatTemplateJs = path.resolve(__dirname, 'server.cache.stat.template.js');
var serverTemplateJsPath = path.resolve(__dirname, 'server.template.js');
var ghostPath = path.resolve(__dirname, 'node_modules/ghost/index.js');
var serverCacheVariableName = 's';	// use a single letter to minimize the file size

// we do different post-install processes depending on where we're deployed and the environment; first see if we're in Azure
if ((process.env.REGION_NAME) && (process.env.WEBSITE_SKU) && (!process.env.EMULATED) && (process.env.WEBSITE_SITE_NAME)) {
	logging.info('Appear to be running in Azure, performing post-install for ' + config.get('env'));
	ensureProductionConfigMatchesAzureDeployment();
	ensureDatabaseHasBeenMigratedToLatestVersion();
	createServerJs();
	createServerCacheJs();
	createServerCacheModulePathJs();
	createServerCacheStatJs();
} else {
	// not running in Azure, so we should be running locally, only do post-install if we're not in production; if we're in
	// production, but running locally, assume the user is doing something specific and is handling things themselves
	if (config.get('env') !== 'production') {
		logging.info('Don\'t appear to be running in Azure, performing post-install for ' + config.get('env'));
		ensureDatabaseHasBeenMigratedToLatestVersion();
		createServerJs();
		createServerCacheJs();
		createServerCacheModulePathJs();
		createServerCacheStatJs();
	} else {
		logging.warn('Don\'t appear to be running in Azure, skipping post-install as environment is currently ' + config.get('env'));
		logging.warn('When repo is deployed to Azure the database in Azure will be automatically migrated to the latest version so you don\'t need to; if you still wish to migrate the local database to the latest version use node dbmigrate.js');
	};
};

// updates config.production.json to match where we're deployed
function ensureProductionConfigMatchesAzureDeployment() {
	logging.info('Updating config.production.json to match site name ' + process.env.WEBSITE_SITE_NAME.toLowerCase());
	var options = {
		files: configProductionJsonPath,
		from: /ghostinazurewebapp[.]azurewebsites[.]net/g,
		to: process.env.WEBSITE_SITE_NAME.toLowerCase() + '.azurewebsites.net'
	};
	replaceInFile.sync(options);
	logging.info('Updated config.production.json to match site name ' + process.env.WEBSITE_SITE_NAME.toLowerCase());
};

// migrates database to the latest version; if it's already on the latest this will do nothing
function ensureDatabaseHasBeenMigratedToLatestVersion() {
	logging.info('Migrating database to latest version');

	var migrationFinished = false;
	var migrator = new knexMigrator({
		knexMigratorFilePath: knexMigratorPath
	});

	migrator.migrate()
		.then(function () {
			logging.info('Migrated database to latest version');
			migrationFinished = true;
		})
		.catch(function onMigrateError(err) {
			logging.error('Migration failed: ' + err.message);
			migrationFinished = true;
		});

	// for some reason the migration fails intermittently if we try and create the server cache whilst
	// the migration hasn't completed (specifically, if we try and compress all the files); so we wait
	// until the migration has completed before we do any further processing
	deasync.loopWhile(function(){return !migrationFinished;});
};

// creates server.js from server.template.js which performs Azure-specific setup and then starts ghost using the script that comes with ghost
function createServerJs() {
	logging.info('Creating server.js');

	// we append the normal ghost startup script to our file, adjusting any require paths; this
	// ensures our startup is always in sync with whatever the ghost startup is
	var ghost = fs.readFileSync(ghostPath, 'utf8');
	ghost = strReplaceAll('require(\'.\\', 'require(\'ghost\\', ghost);
	ghost = strReplaceAll('require(\'./', 'require(\'ghost/', ghost);
	if (ghost.indexOf('logging.info(\'Ghost boot\'') >= 0) {
		ghost = ghost.substring(0, ghost.indexOf('logging.info(\'Ghost boot\''))
			+ '// generate module path cache (if it already exists this will do nothing)\n'
			+ '        require(\'./server.cache.modulePath.generator\');\n'
			+ '        // generate the stat cache (if it already exists this will do nothing)\n'
			+ '        require(\'./server.cache.stat.generator\');\n'
			+ '        ' + ghost.substring(ghost.indexOf('logging.info(\'Ghost boot\''));
	} else {
		logging.error('Can\'t find logging.info(\'Ghost boot\' in startup file, unable to create modulePath cache.');
	}

	// create file from the template
	var server = fs.readFileSync(serverTemplateJsPath, 'utf8');
	server =
		'// do not edit this file directly -- it was generated by postinstall.js from server.template.js\n\n'
		+ '//\n'
		+ '// content of server.template.js\n'
		+ '//\n'
		+ '\n'
		+ server
		+ '\n'
		+ '//\n'
		+ '// content of ghost\\index.js\n'
		+ '//\n'
		+ '\n'
		+ ghost;
	fs.writeFileSync(serverJsPath, server);

	logging.info('Created server.js');
};

// creates server.cache.js from all the javascript files in the deployment to improve startup performance, which
// otherwise can be extremely slow in Azure (especially in Free or Shared instances) due to the disk speed
function createServerCacheJs() {
	logging.info('Creating server.cache.js');

	// process the server.js file which will then add anything it depends on to the cache
	processFileForServerCache(path.parse(serverJsPath).dir, path.parse(serverJsPath).base);
	addFilesThatCannotBeDetectedToServerCache();
	serverCacheItems.push('module.exports=' + serverCacheVariableName + ';');
	var serverCache =
		'var ' + serverCacheVariableName + '=[];'
		+ serverCacheItems.join('');
	fs.writeFileSync(serverCacheJsPath, serverCache);

	logging.info('Created server.cache.js');

	// now create the zipped version
	createZippedServerCacheJs();
};

// creates a zipped version of the server cache to try and further improve the startup time
function createZippedServerCacheJs() {
	logging.info('Creating server.cache.js.gz');

	var gzip = zlib.createGzip({
		// best compression gives a marginally smaller file
		level: 9
		// anything other than default strategy increases file size
	});
	var input = fs.createReadStream(serverCacheJsPath);
	var output = fs.createWriteStream(serverCacheJsZippedPath);
	var compressionFinished = false;
	input.pipe(gzip)
		.on('error', function () {
			logging.error('Failed to create server.cache.js.gz');
			compressionFinished = true;
		})
		.pipe(output)
		.on('finish', function () {
			logging.info('Created server.cache.js.gz');
			compressionFinished = true;
		})
		.on('error', function () {
			logging.error('Failed to create server.cache.js.gz');
			compressionFinished = true;
		});

	// wait for compression to complete
	deasync.loopWhile(function(){return !compressionFinished;});
}

function createServerCacheModulePathJs() {
	logging.info('Creating server.cache.modulePath.js');
	if (!process.version.startsWith('v6.')) {
		logging.error('Unsupported node version - server.cache.modulePath may not work correctly');
	}
	fs.writeFileSync(serverCacheModulePathJs, fs.readFileSync(serverCacheModulePathTemplateJs, 'utf8'));
	logging.info('Created server.cache.modulePath.js');
}

function createServerCacheStatJs() {
	logging.info('Creating server.cache.stat.js');
	if (!process.version.startsWith('v6.')) {
		logging.error('Unsupported node version - server.cache.stat may not work correctly');
	}
	fs.writeFileSync(serverCacheStatJs, fs.readFileSync(serverCacheStatTemplateJs, 'utf8'));
	logging.info('Created server.cache.stat.js');
}

// processes a file for the server cache
function processFileForServerCache(dir, file) {
	// ignore any attemps to process the cache we're generating or the server file
	if (path.resolve(dir, file) === serverCacheJsPath) {
		return;
	}

	// no need to process the file if it has already been processed
	var content = serverCacheFilesProcessed[path.resolve(dir, file)]
	if (content) {
		return;
	}

	// try and compress this file to minimize the cache size
	var content = fs.readFileSync(path.resolve(dir, file), 'utf8');
	var compressionSucceeded = false;
	try
	{
		var compressedContent = uglifyJs.minify(
			content,
			{
				compress: true,
				mangle: true
			});
		compressionSucceeded = true;
	} catch (err) {
		// do nothing; uglify can't do all files so for any it can't we'll just add the file as-is
	}

	// we use the full path as the array index, but to save space we remove anything that'll be the same for every entry and remove the extension
	var arrayEntry = path.resolve(dir, file);
	arrayEntry = arrayEntry.replace(path.resolve(__dirname, 'node_modules') + path.sep, '');
	if (arrayEntry.endsWith('.js')) {
		arrayEntry = arrayEntry.substr(0, arrayEntry.length - 3);
	}

	// don't add the server file itself, or any of the caches we'll generate to the cache, but we'll still walk any dependencies they have
	if ((!(path.resolve(dir, file) === serverJsPath))
		&& (!(path.resolve(dir, file) === serverCacheModulePathJs))
		&& (!(path.resolve(dir, file) === serverCacheStatJs))) {
		// add the compressed file (or the uncompressed one if we couldn't compress it)
		if ((compressionSucceeded === true) && (!compressedContent.error)) {
			serverCacheItems.push(serverCacheVariableName + '[\'' + convertStringToCode(arrayEntry) + '\']=\'' + convertStringToCode(compressedContent.code) + '\';');
		} else {
			serverCacheItems.push(serverCacheVariableName + '[\'' + convertStringToCode(arrayEntry) + '\']=\'' + convertStringToCode(content) + '\';');
		}
		serverCacheFilesProcessed[path.resolve(dir, file)] = path.resolve(dir, file);
	}

	// do a crude search for require statements to add dependencies to the cache; this isn't perfect but works for vast majority of cases
	content.replace(/require\s*\(\s*(__dirname \+ '.*)'\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
	content.replace(/require\s*\(\s*(__dirname \+ ".*)"\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
	content.replace(/require\.resolve\s*\(\s*(__dirname \+ '.*)'\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
	content.replace(/require\.resolve\s*\(\s*(__dirname \+ ".*)"\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
	content.replace(/require\s*\(\s*'(.*)'\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
	content.replace(/require\s*\(\s*"(.*)"\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
	content.replace(/require\.resolve\s*\(\s*'(.*)'\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
	content.replace(/require\.resolve\s*\(\s*"(.*)"\s*\)/g, function (match, requirePath) { processRequire(dir, match, requirePath); } );
};

// processes a found require statement, adding the file(s) to the cache
function processRequire(dir, match, requirePath) {
	// sometimes the require path has __dirname prefixed to it so check for that and replace it with a local prefix
	if (requirePath.startsWith('__dirname + \'')) {
		requirePath = '.' + requirePath.substring(13);
	}

	// sometimes the require has an empty string appended to it so check for that and remove it
	if (requirePath.endsWith('\' + \'')) {
		requirePath = requirePath.substring(0, requirePath.length - 5);
	}

	// if there are multiple reqires in the match, process each one individually
	while(requirePath !== '') {
		var requirePathToProcess = requirePath;
		if (match.endsWith('\')')) {
			var i = requirePathToProcess.indexOf('\')');
			if (i >= 0) {
				requirePath = requirePathToProcess.substring(i);
				if (requirePath.indexOf('require(\'') >= 0) {
					requirePath = requirePath.substring(requirePath.indexOf('require(\'') + 9);
				} else {
					requirePath = '';
				}
				requirePathToProcess = requirePathToProcess.substring(0, i);
			} else {
				requirePath = '';
			}
		} else {
			var i = requirePathToProcess.indexOf('")');
			if (i >= 0) {
				requirePath = requirePathToProcess.substring(i);
				if (requirePath.indexOf('require("') >= 0) {
					requirePath = requirePath.substring(requirePath.indexOf('require("') + 9);
				} else {
					requirePath = '';
				}
				requirePathToProcess = requirePathToProcess.substring(0, i);
			} else {
				requirePath = '';
			}
		}

		// if it's a reference to a local file we'll only look for it locally
		if (requirePathToProcess.startsWith('./')) {
			if (attemptToProcessRequire(dir, requirePathToProcess, 'as-is') !== 1) {
				if (attemptToProcessRequire(dir, requirePathToProcess, 'as-is-with-dotjs-appended') !== 1) {
				}
			}
		} else {
			// not local so search globally as well
			if (attemptToProcessRequire(dir, requirePathToProcess, 'in-local-node_modules-dotjs-appended') !== 1) {
				if (attemptToProcessRequire(dir, requirePathToProcess, 'in-local-node_modules') !== 1) {
					if (attemptToProcessRequire(dir, requirePathToProcess, 'in-node_modules-dotjs-appended') !== 1) {
						if (attemptToProcessRequire(dir, requirePathToProcess, 'in-node_modules') !== 1) {
							if (attemptToProcessRequire(dir, requirePathToProcess, 'as-is') !== 1) {
								if (attemptToProcessRequire(dir, requirePathToProcess, 'as-is-with-dotjs-appended') !== 1) {
								}
							}
						}
					}
				}
			}
		}
	}
}

// attemps to process the details from a found require statement and adding the file to the cache
function attemptToProcessRequire(dir, file, style) {
	var possiblePath = path.resolve(dir, file);
	switch(style) {
		case 'as-is':
			break;
		case 'as-is-with-dotjs-appended':
			possiblePath = possiblePath + '.js';
			break;
		case 'in-local-node_modules':
			// start at the node_modules in this directory and work our way back to the root
			var partialPath = '';
			var localPath = path.resolve(dir, partialPath, 'node_modules', file);
			while(
				// keep going until we hit the node_modules in the root folder
				localPath !== path.resolve(__dirname, 'node_modules', 'node_modules', file)
				// we can ignore any paths that resolve to node_modules/node_modules
				&& localPath !== path.resolve(__dirname, 'node_modules', 'node_modules', file)
				// safety guard in case we end up outside the root folder for some reason
				&& localPath !== path.resolve('/', 'node_modules', file)) {
				attemptToProcessRequire(path.parse(localPath).dir, path.parse(localPath).base, 'as-is');
				partialPath = partialPath + '../';
				localPath = path.resolve(dir, partialPath, 'node_modules', file);
			}
			return 0;
		case 'in-local-node_modules-dotjs-appended':
			// start at the node_modules in this directory and work our way back to the root
			var partialPath = '';
			var localPath = path.resolve(dir, partialPath, 'node_modules', file) + '.js';
			while(
				// keep going until we hit the node_modules in the root folder
				localPath !== (path.resolve(__dirname, 'node_modules', file) + '.js')
				// we can ignore any paths that resolve to node_modules/node_modules
				&& localPath !== (path.resolve(__dirname, 'node_modules', 'node_modules', file) + '.js')
				// safety guard in case we end up outside the root folder for some reason
				&& localPath !== (path.resolve('/', 'node_modules', file) + '.js')) {
				attemptToProcessRequire(path.parse(localPath).dir, path.parse(localPath).base, 'as-is');
				partialPath = partialPath + '../';
				localPath = path.resolve(dir, partialPath, 'node_modules', file) + '.js';
			}
			return 0;
		case 'in-node_modules':
			possiblePath = path.resolve(__dirname, 'node_modules', file);
			break;
		case 'in-node_modules-dotjs-appended':
			possiblePath = path.resolve(__dirname, 'node_modules', file) + '.js';
			break;
	};

	// have a possible path, try and process it; we use a try...catch as statSync
	// throws on error and the paths we generate might not actually exist
	try {
		var stats = fs.statSync(possiblePath);

		// if it's a file process it
		if (stats.isFile()) {
			processFileForServerCache(path.parse(possiblePath).dir, path.parse(possiblePath).base);
			return 1;
		}

		// if it's a directory, we'll need to do some further processing to see if we can process it
		if (stats.isDirectory()) {
			// if there's a package.json, examine it to work out what the file to process really is
			try {
				var possiblePackageJson = path.resolve(possiblePath, 'package.json');
				stats = fs.statSync(possiblePackageJson);
				if (stats.isFile()) {
					// examine the package
					var packageJson = JSON.parse(fs.readFileSync(possiblePackageJson, 'utf8'));
					if (packageJson.main) {
						// see if the reference exists
						var possiblePackageJsonMain = path.resolve(possiblePath, packageJson.main);
						try {
							// if it's a file that exists then that's the file to process
							stats = fs.statSync(possiblePackageJsonMain);
							if (stats.isFile()) {
								processFileForServerCache(path.parse(possiblePackageJsonMain).dir, path.parse(possiblePackageJsonMain).base);
								return 1;
							}

							// if it's a directory that contains an index.js then that's the file to process
							if (stats.isDirectory()) {
								possiblePackageJsonMain = path.resolve(possiblePackageJsonMain, 'index.js');
								stats = fs.statSync(possiblePackageJsonMain);
								if (stats.isFile()) {
									processFileForServerCache(path.parse(possiblePackageJsonMain).dir, path.parse(possiblePackageJsonMain).base);
									return 1;
								}
							}
						} catch(err) {
							// ignore anything that doesn't exist
							if (err.code !== 'ENOENT') {
								throw err;
							}
						}

						// if it doesn't exist, check in case it's a reference to a file without the extension
						try {
							possiblePackageJsonMain = path.resolve(possiblePath, packageJson.main) + '.js';
							stats = fs.statSync(possiblePackageJsonMain);
							if (stats.isFile()) {
								processFileForServerCache(path.parse(possiblePackageJsonMain).dir, path.parse(possiblePackageJsonMain).base);
								return 1;
							}
						} catch(err) {
							// ignore anything that doesn't exist
							if (err.code !== 'ENOENT') {
								throw err;
							}
						}
					}
				}
			} catch(err) {
				// ignore anything that doesn't exist
				if (err.code !== 'ENOENT') {
					throw err;
				}
			}

			// no package.json but if it's got an index.js within it, that's the file to process
			try {
				var possibleIndexJs = path.resolve(possiblePath, 'index.js');
				stats = fs.statSync(possibleIndexJs);
				if (stats.isFile()) {
					processFileForServerCache(path.parse(possibleIndexJs).dir, path.parse(possibleIndexJs).base);
					return 1;
				}
			} catch(err) {
				// ignore anything that doesn't exist
				if (err.code !== 'ENOENT') {
					throw err;
				}
			}
		}
	} catch(err) {
		// ignore anything that doesn't exist
		if (err.code !== 'ENOENT') {
			throw err;
		}
	}
	return 0;
}

// some files get dynamically loaded, and so we won't pick them up; we just add these in here
function addFilesThatCannotBeDetectedToServerCache() {
	// ghost knex migrator config
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost'), 'MigratorConfig' + '\')', 'MigratorConfig');

	// ghost built-in config
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'config'), 'defaults\')', 'defaults');
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'config'), 'overrides\')', 'overrides');
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'config', 'env'), 'config.development\')', 'config.development');
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'config', 'env'), 'config.production\')', 'config.production');

	// ghost default scheduler
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'adapters', 'scheduling'), 'SchedulingDefault' + '\'', 'SchedulingDefault');

	// ghost internal apps
	var overrides = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'config', 'overrides.json'), 'utf8'));
	overrides.apps.internal.forEach(function (app) {
		processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'apps', app), 'index\')', 'index');
	});
	
	// ghost data
	addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'data', 'migrations', 'init'));
	addFilesInSubDirectoriesToServerCache(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'data', 'migrations', 'versions'));
	addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'data', 'schema', 'fixtures'));

	// ghost models
	addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'models'));
	
	// ghost themes built-in config
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'themes', 'config'), 'defaults\')', 'defaults');
	
	// ghost translations
	processRequire(path.resolve(__dirname, 'node_modules', 'ghost', 'core', 'server', 'translations'), 'en\')', 'en');

	// bookshelf
	if (serverCacheFilesProcessed[path.resolve(__dirname, 'node_modules', 'bookshelf', 'lib', 'bookshelf.js')]) {
		processRequire(path.resolve(__dirname, 'node_modules', 'bookshelf', 'lib', 'plugins'), 'registry' + '\')', 'registry');
	}

	// bookshelf-relations
	addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'bookshelf-relations'));
	addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'bookshelf-relations', 'lib'));

	// gscan
	addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'gscan', 'lib', 'checks'));

	// image-size
	if (serverCacheFilesProcessed[path.resolve(__dirname, 'node_modules', 'image-size', 'lib', 'types.js')]) {
		var types = require(path.resolve(__dirname, 'node_modules', 'image-size', 'lib', 'types.js'));
		types.forEach(function (type) {
			processRequire(path.resolve(__dirname, 'node_modules', 'image-size', 'lib', 'types'), type + '\')', type);
		});
	}

	// nconf
	if (serverCacheFilesProcessed[path.resolve(__dirname, 'node_modules', 'nconf', 'lib', 'nconf.js')]) {
		processRequire(path.resolve(__dirname, 'node_modules', 'nconf', 'lib', 'nconf', 'stores'), 'argv' + '\')', 'argv');
		processRequire(path.resolve(__dirname, 'node_modules', 'nconf', 'lib', 'nconf', 'stores'), 'env' + '\')', 'env');
		processRequire(path.resolve(__dirname, 'node_modules', 'nconf', 'lib', 'nconf', 'stores'), 'file' + '\')', 'file');
	}

	// oauth2orize
	if (serverCacheFilesProcessed[path.resolve(__dirname, 'node_modules', 'oauth2orize', 'lib', 'index.js')]) {
		addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'oauth2orize', 'lib', 'exchange'));
		addFilesInDirectoryToServerCache(path.resolve(__dirname, 'node_modules', 'oauth2orize', 'lib', 'grant'));
	}
}

// adds files in a directory to the server cache
function addFilesInDirectoryToServerCache(dir) {
	fs.readdirSync(dir).forEach(function(filename) {
		if ((/\.js$/.test(filename)) || (/\.json$/.test(filename))) {
			processFileForServerCache(dir, filename);
		}
	});
}

// adds files in sub-directories to the server cache
function addFilesInSubDirectoriesToServerCache(dir) {
	fs.readdirSync(dir).forEach(function(filename) {
		if (fs.statSync(path.resolve(dir, filename)).isDirectory()) {
			addFilesInDirectoryToServerCache(path.resolve(dir, filename));
		}
	});
}

// converts a string into an escaped javascript string
function convertStringToCode(content) {
	content = strReplaceAll('\\', '\\\\', content);
	content = strReplaceAll('\f', '\\f', content);
	content = strReplaceAll('\n', '\\n', content);
	content = strReplaceAll('\r', '\\r', content);
	content = strReplaceAll('\t', '\\t', content);
	content = strReplaceAll('\v', '\\v', content);
	content = strReplaceAll('\'', '\\\'', content);
	return content;
};
