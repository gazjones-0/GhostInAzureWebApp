# [Ghost (1.13.0)](https://github.com/TryGhost/Ghost)

Ghost ready for deployment to an Azure Windows web app -- there's a one-click deployment button further down the page, but you should try and read the next few sections first.

## Before you deploy we have to talk about startup performance...

When I first deployed Ghost, the site took a while to startup, which I put down to it being the initial deployment; however, this happens whenever the app gets recycled (which can happen any time, but on the free and shared tiers it's every 20mins). Some investigation led me to the root cause -- Ghost uses a significant number of node modules, and Azure takes a long time to load them.

I tried do improve this with some caching (see later for more details on this), with limited success -- I did some (very) quick tests of start time by restarting the web app, browsing to the site and then looking at what Ghost records the boot time as in the log:

* Free - with caching around 10-12s (17-20s after a deployment; without caching around 20-25s)
* Shared - with caching around 8-10s (14-20s after a deployment; without cache around 20-25s)
* Basic - with caching around 6-7s (6-7s after a deployment; without cache around 30s)
* Standard - with caching around 6-7s (6-7s after a deployment; without cache around 30s)

The startup times for basic+ without caching were a bit surprising -- my guess is free and shared benefit from underlying infrastructure being in continual use whilst in basic and higher you have an additional hit of fresh resources being spun up; of course, basic+ bring other benefits not least that you can enable "always on", and the caching doesn't get you much in free or shared (my guess is the underlying infrastructure just isn't that powerful and the cache removes one bottleneck just to run into another).

## Potential workaround for slow startup times

Use Azure CDN to host a custom domain that essentially acts as a cache sat in front of your web app, so app recycles or slow responses shouldn't really matter -- note that I haven't tried this but saw it on <https://github.com/chadly/ghost> which I only found after I'd got Ghost up and running in Azure.

## Things I tried to improve startup performance

The underlying issue seems to be the file system used for web apps is just slow, so I first tried building a cache of every .js file in the node_modules directory, load this on startup and swap out node's file reader to read from the cache rather than hit the file system -- the thought behind this being that whilst this won't reduce the amount of data being loaded, it will remove pretty much all the file accesses.

This improved it a bit, but I did end up with an 80M cache, so I played with webpack to see if I could use it instead; unfortunately, it wasn't really designed with this scenario in mind and, whilst it had the core of what I needed, it got to the point that it looked like I'd need to start messing around with bits of webpack's internals to make it work and, honestly, I don't have enough node / webpack experience, or the spare time to go down that route (until I tried deploying Ghost I'd never even used node).

So instead I knocked out a crude dependency walker that worked out the modules Ghost loads at startup and just cached those (about a 14M cache as I recall); then I minified everything when building the cache (about a 7M cache) and then finally I tried gzipping it as well (about 1.4M zipped).

Even with this though it was still slow, so I looked further node's module loader internals and found that it can do a lot of directory traversing and processing (via `stat`) to work out the actual file to load; it builds a cache as it does this, but that won't help on a cold start, and, as it involved the disk, was likely another source of slowness in Azure, so on the first run of the app, it lets everything load in, and then saves the cache to disk; on subsequent app loads it loads the cache in first which means node shouldn't need to do any disk searching.

I freely admit that this is pretty dirty and hacky (not to mention tied to the node version in use), but it has a noticeable effect on subsequent app loads, so I've kept this in.

Whilst this isn't ideal, I can live with the 6-7s startup time on deployment / Ghost version upgrade (I've access to a standard service plan I can run it in), and I'm not really convinced things could be significantly improved without Microsoft looking at the underlying web app file system (which appears to be the fundamental issue) -- my probably 5+ year old dev machine starts Ghost in about 2s (1.5s on subsequent loads) with my caching version... also, after I'd done this, I found some reports of Azure function suffering from a similar issue that they solved in a similar way (see <https://github.com/Azure/azure-functions-pack>) which leads me to suspect a similar root cause for web apps.

I've folded this into the master branch but you can find the original experiment on the [cacheFilesInMemory](https://github.com/gazooka/GhostInAzureWebApp/tree/cacheFilesInMemory) and [preloadModulePathCache](https://github.com/gazooka/GhostInAzureWebApp/tree/preloadModulePathCache) branches if you're interested.

Azure now supports Linux app service plans so it'd be an interesting experiment to run Ghost in one of these and see if it has the same issue.

## Deployment

[![Deploy to Azure](http://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/)

Note that if deploying to a basic or lower plan the deployment might fail (it sometimes does, it sometimes doesn't) - the app still appears to work, but I'd recommend that if deployment doesn't succeed, then either keep re-deploying it until it succeeds or deploy to a standard app service and then downgrade the plan. The issue appears to be the amount of time it takes to install all the node modules and run the postinstall script (which gets automatically run during deployment), and I think sometimes the underlying infrastructure gets recycled in the middle of the deployment.

### The postinstall.js script

This is run automatically as part of deployment, and does the following:

* Updates the website url in `config.production.json` to match where it's deployed; the config in the repository is set to `ghostinazurewebapp.azurewebsites.net` so the script will change this to match whatever you named it during deployment
* Ensures the database has been migrated to the latest version (might be required if Ghost has been upgraded)
* Creates `server.js` from `server.template.js`
* Creates the cache

The `server.js` file is what's run by iisnode and is built from `server.template.js`; it does a couple of things:

* Sets up the cache
* Configures the port the app uses to work in Azure
* Starts Ghost

When `server.js` is created, the contents of the Ghost startup script are copied in so Ghost starts up identically to how it would if normally deployed.

### Other scripts

#### dbinit.js

Completely re-initialises the database if you want to reset everything back to as it would be after a fresh install; you can run this against the production database in Azure with the following command from the console (note the `set` command before the `node` command; by default `node_env` isn't set in the console):

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
