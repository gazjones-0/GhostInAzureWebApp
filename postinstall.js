var config = require('ghost/core/server/config');
var knexMigrator = require('knex-migrator');
var logging = require('ghost-ignition').logging();
var path = require('path');
var replaceInFile = require('replace-in-file');

// we do different post-install processes depending on where we're deployed and the environment; first see if we're in Azure
if ((process.env.REGION_NAME) && (process.env.WEBSITE_SKU) && (!process.env.EMULATED) && (process.env.WEBSITE_SITE_NAME)) {
    logging.info('Appear to be running in Azure, performing post-install for ' + config.get('env'));
    ensureProductionConfigMatchesAzureDeployment();
    ensureDatabaseHasBeenMigratedToLatestVersion();
} else {
    // not running in Azure, so we should be running locally, only do post-install if we're not in production; if we're in
    // production, but running locally, assume the user is doing something specific and is handling things themselves
    if (config.get('env') !== 'production') {
        logging.info('Don\'t appear to be running in Azure, performing post-install for ' + config.get('env'));
        ensureDatabaseHasBeenMigratedToLatestVersion();
    } else {
        logging.warn('Don\'t appear to be running in Azure, skipping post-install as environment is currently ' + config.get('env'));
        logging.warn('When repo is deployed to Azure the database in Azure will be automatically migrated to the latest version so you don\'t need to; if you still wish to migrate the local database to the latest version use node dbmigrate.js');
	};
};

// updates config.production.json to match where we're deployed
function ensureProductionConfigMatchesAzureDeployment() {
    logging.info('Updating config.production.json to match site name ' + process.env.WEBSITE_SITE_NAME.toLowerCase());
    var options = {
        files: path.resolve(__dirname, 'config.production.json'),
        from: /ghostinazurewebapp[.]azurewebsites[.]net/g,
        to: process.env.WEBSITE_SITE_NAME.toLowerCase() + '.azurewebsites.net'
    };
    replaceInFile(options);
};

// migrates database to the latest version; if it's already on the latest this will do nothing
function ensureDatabaseHasBeenMigratedToLatestVersion() {
    logging.info('Migrating database to latest version');
    var migrator = new knexMigrator({
        knexMigratorFilePath: path.resolve(__dirname, 'node_modules/ghost')
    });

    migrator.migrate()
        .catch(function onMigrateError(err) {
            logging.error('Migration failed: ' + err.message);
        });
};
