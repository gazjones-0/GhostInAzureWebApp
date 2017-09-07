var logging = require('ghost-ignition').logging();
var config = require('ghost/core/server/config');
var replace = require('replace-in-file');

// only do post-install if we're running in Azure
if ((process.env.REGION_NAME) && (process.env.WEBSITE_SKU) && (!process.env.EMULATED) && (process.env.WEBSITE_SITE_NAME)) {
	logging.info('Appear to be running in Azure, performing post-install for ' + config.get('env'));

	// update config.production.json to match actual site name
	logging.info('Updating config.production.json to match site name ' + process.env.WEBSITE_SITE_NAME.toLowerCase());
	var options = {
		files: __dirname + '\\config.production.json',
		from: /ghostinazurewebapp[.]azurewebsites[.]net/g,
		to: process.env.WEBSITE_SITE_NAME.toLowerCase() + '.azurewebsites.net'
	};
	replace(options);

	// migrate database to latest version
	logging.info('Migrating database to latest version');
	var KnexMigrator = require('knex-migrator');
	knexMigrator = new KnexMigrator({
		knexMigratorFilePath: __dirname + '\\node_modules\\ghost'
	});

	knexMigrator.migrate()
		.catch(function onMigrateError(err) {
			logging.error('Migration failed: ' + err.message);
		});
} else {
	if (config.get('env') !== 'production') {
		logging.info('Don\'t appear to be running in Azure, performing post-install for ' + config.get('env'));

		// migrate database to latest version
		logging.info('Migrating database to latest version');
		var KnexMigrator = require('knex-migrator');
		knexMigrator = new KnexMigrator({
			knexMigratorFilePath: __dirname + '\\node_modules\\ghost'
		});

		knexMigrator.migrate()
			.catch(function onMigrateError(err) {
				logging.error('Migration failed: ' + err.message);
			});
	} else {
		logging.warn('Don\'t appear to be running in Azure, skipping post-install as environment is currently ' + config.get('env'));
		logging.warn('When repo is deployed to Azure the database in Azure will be automatically migrated to the latest version so you don\'t need to; if you still wish to migrate the local database to the latest version use node dbmigrate.js');
	};
};
