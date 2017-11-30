// let users know which database is being initialised
var logging = require('ghost-ignition').logging();
var config = require('ghost/core/server/config');
logging.info('Initialising ' + config.get('env'));

// if we're running in Azure and not configuring production, warn the user
if ((process.env.REGION_NAME) && (process.env.WEBSITE_SKU) && (!process.env.EMULATED) && (config.get('env') !== 'production')) {
	logging.warn('Appear to be running in Azure but not configuring production database');
};

// re-initialise database by resetting it and then initialising it
var KnexMigrator = require('knex-migrator');
knexMigrator = new KnexMigrator({
    knexMigratorFilePath: __dirname + '\\node_modules\\ghost'
});

logging.info('Resetting ' + config.get('env'));
knexMigrator.reset()
	.then(function onResetSuccess() {
		logging.info('Reset succeeded');
		knexMigrator.init()
			.then(function onInitSuccess() {
				logging.info('Initialisation succeeded');
				return null;
			})
			.catch(function onInitError(err) {
				logging.error('Initialisation failed: ' + err.message);
			});
		return null;
	})
	.catch(function onResetError(err) {
		logging.error('Reset failed: ' + err.message);
	});
