# [Ghost (1.21.5)](https://github.com/TryGhost/Ghost)

Ghost ready for deployment to an Azure Windows web app -- there's a one-click deployment button further down the page, but you should try and read the next few sections first.

## Before you deploy we have to talk about startup performance...

With standard deployment, Ghost takes a while to start, and this happens whenever app's recycled (which can be any time; on free / shared it's every 20mins); investigation found root cause - Ghost uses lots of modules and Azure's slow to load them. I had some success improving this with caching - some very quick tests showed:

* Free - with caching ~3-6s (16-19s after deployment; without cache ~20-25s)
* Shared - with caching ~3-6s (16-19s after deployment; without cache ~20-25s)
* Basic - with caching ~3-6s (6-7s after deployment; without cache ~30s)
* Standard - with caching ~3-6s (6-7s after deployment; without cache ~30s)

Times for basic+ without cache were bit surprising -- my guess is free / shared benefit from underlying infrastructure being in continual use whilst basic+ has hit of spinning up resources (basic+ has other benefits like "always on" though).

## Potential workaround for slow startup times

Use Azure CDN to host a custom domain acting as cache in front of your web app -- I haven't tried this but saw it on <https://github.com/chadly/ghost> which I found after I'd got Ghost running in Azure.

## Deployment

[![Deploy to Azure](http://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/)

### If deployment fails...

If it's basic or lower and it fails (it sometimes does, sometimes doesn't), go to Azure portal and check 'Deployment Options'; if this shows it was successful you're good to go; if not, either keep re-deploying until it succeeds or deploy to a standard app service and then downgrade.

Installing the modules and running post-install takes a while, and underlying infrastructure sometimes gets recycled during it causing it to fail.

## Things I tried to improve startup performance

Underlying issue seems to be file system is slow, so I first tried building a cache of every .js file in node_modules, loading on startup and swapping node's file system to use the cache -- idea being it doesn't reduce amount of data but it removes the file accesses. This improved things, but cache was 80M so I played with webpack to try and reduce it, but webpack wasn't really designed for this and it looked like I'd need to mess with its internals and I don't have enough node / webpack experience or spare time for this. So I knocked out a crude dependency walker that built cache of modules Ghost loads at startup; this gave an ~14M cache; adding minification got to ~8M; gzipping it all got down to ~2M.

Things were still slow, so looking at node's module loader found it does lots of directory traversing and processing (via `stat`); it builds a cache but this doesn't help with cold starts, so on first run of app I let everything load in and then save the cache node built; on subsequent app starts it loads the cache in so it doesn't have to build it every cold start. Using a crude tracer I found there were still lots of `stat` calls in general during startup so I added an additional cache for these, both successful calls and ones which throw exceptions.

This is all pretty dirty and hacky (and tied to node version in use), but it noticeably improves startup.

I'd prefer faster startup but I can live with this. There are reports of Azure functions suffering similar issue that they solved like this (see <https://github.com/Azure/azure-functions-pack>).

I folded all these into master but you can find original experiments on the other brances. Azure supports Linux app services so it'd be interesting to run Ghost in one to see if it has same issue.

## Notes on the caching

Three caches, goal is avoid disk accesses:

* Cache of files Ghost loads during startup; loaded in one go
* Cache of module paths; whenever module is `require`d node looks at paths to work out where it really is and caches it; once app has started first time and cache built we store it on disk and load it on subsequent runs so don't have to build it
* Cache of stat results; various `stat` calls made during startup; like module paths we let record results first time app is run then store them on disk and load it on subsequent runs so don't need to check the disk

Caveat with above is it's assumed if anything in node_modules changes you re-deploy (or re-run post-install); this should be ok.

### The postinstall.js script

Runs automatically as part of deployment:

* Updates website url in `config.production.json` to match where it's deployed; config in repository is set to `ghostinazurewebapp.azurewebsites.net` so script changes this to match where deployed
* Ensures database has been migrated to latest version (might be required if Ghost has been upgraded)
* Creates `server.js` from `server.template.js`
* Creates the file cache

`server.js` file is what's run by iisnode and is built from `server.template.js`:

* Loads caches
* Configures port app uses to work in Azure
* Starts Ghost
* On first run of app, module path and stat caches are built (and used on subsequent startups)

When `server.js` is created, contents of Ghost startup script are copied in so Ghost starts up identically to how it would if normally deployed.

### Other scripts

#### dbinit.js

Completely re-initialises database if you want to reset everything back to as it would be after a fresh install; you can run this against the production database in Azure with the following command from the console (note the `set` command before the `node` command; by default `node_env` isn't set in the console):

```set node_env=production&node dbinit.js```

#### dbmigrate.js

Migrates the database to the latest version if for some reason you need to do this manually; you can run this against the production database in Azure with the following command from the console (note the `set` command before the `node` command; by default `node_env` isn't set in the console):

```set node_env=production&node dbmigrate.js```

## Running locally

Download the repository, do a `yarn install` to get all the modules and then run it by `node server.js`.

## ToDo

* Automatic backup of the database (Azure can't back it up as it's always in use)
* Using a custom domain as part of deployment
* Upgrading
