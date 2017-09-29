// if iisnode is being used, it defines the port we need to use in an environment
// variable; if this variable is defined, we override the config with it otherwise
// the web app won't work correctly
var config = require('ghost/core/server/config');
if (process.env.PORT) {
    config.set('server:port', process.env.PORT);
}
