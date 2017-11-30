// let users know which database is being initialised
var logging = require('ghost-ignition').logging();
var config = require('ghost/core/server/config');
logging.info('Migrating ' + config.get('env'));

// if we're running in Azure and not configuring production, warn the user
if ((process.env.REGION_NAME) && (process.env.WEBSITE_SKU) && (!process.env.EMULATED) && (config.get('env') !== 'production')) {
	logging.warn('Appear to be running in Azure but not configuring production database');
};

// migrate database to latest version
var KnexMigrator = require('knex-migrator');
knexMigrator = new KnexMigrator({
    knexMigratorFilePath: __dirname + '\\node_modules\\ghost'
});

knexMigrator.migrate()
	.then(function onMigrateSuccess() {
		logging.info('Migration succeeded');
		return null;
	})
	.catch(function onMigrateError(err) {
		logging.error('Migration failed: ' + err.message);
	});
