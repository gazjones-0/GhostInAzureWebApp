'use strict';
const fs = require('fs');
const path = require('path');
const resolvePkg = require('resolve-pkg');
const readPkg = require('read-pkg');
const readPkgUp = require('read-pkg-up');
const DAG = require('dag-map').default;
const debug = require('debug')('find-plugins');

module.exports = findPlugins;
findPlugins.default = findPlugins;


function findPlugins(options) {
  options = options || {};
  options.dir = options.dir || process.cwd();
  debug('starting plugin search in %s', options.dir);

  try {
    options.pkg = readPkgUp.sync({ cwd: options.dir }).pkg;
  } catch(e) {
    console.error('Unable to read starting package.json');
    throw e;
  }

  let candidates;
  if (options.scanAllDirs) {
    candidates = findCandidatesInDir(options);
  } else {
    candidates = findCandidatesFromPkg(options);
  }

  debug(`found ${ candidates.length } plugin candidates: ${  candidates.map((c) => c.pkg.name).join(', ') }`);

  let includes = includesFromOptions(candidates, options);

  debug(`${ includes.length } plugins manually included: ${  includes.map((i) => i.pkg.name).join(', ') }`);

  candidates = candidates.concat(includes);

  let plugins = filterCandidates(candidates, options);

  debug(`found ${ plugins.length } plugins: ${ plugins.map((p) => p.pkg.name).join(', ') }`);

  if (options.sort) {
    return sortPlugins(plugins, options);
  }

  return plugins;
}

function includesFromOptions(candidates, options) {
  let includes = options.include || [];
  return includes.map((includedDir) => {
    try {
      return {
        dir: includedDir,
        pkg: readPkg.sync(path.join(includedDir, 'package.json'))
      };
    } catch (e) {
      return false;
    }
  });
}

function filterCandidates(candidates, options) {
  return candidates.filter((candidate) => {
    if (options.filter) {
      return options.filter(candidate);
    }
    if (!candidate.pkg.keywords) {
      return false;
    }
    return candidate.pkg.keywords.indexOf(options.keyword || options.pkg.name) > -1;
  });
}

function sortPlugins(unsortedPlugins, options) {
  debug(`sorting ${ unsortedPlugins.length } plugins`);
  let graph = new DAG();
  unsortedPlugins.forEach((plugin) => {
    let pluginConfig = plugin.pkg[options.configName || options.pkg.name] || {};
    graph.add(plugin.pkg.name, plugin, pluginConfig.before, pluginConfig.after);
  });
  let sortedPlugins = [];
  graph.topsort((key, value) => {
    if (value) {
      sortedPlugins.push(value);
    }
  });
  return sortedPlugins;
}

function findCandidatesInDir(options) {
  let dir = options.dir;
  debug(`searching all directories inside ${ dir } for plugin candidates`);
  return fs.readdirSync(dir)
    // Handle scoped packages
    .reduce((candidates, name) => {
      if (name.charAt(0) === '@') {
        fs.readdirSync(path.join(dir, name))
          .forEach((scopedPackageName) => {
            candidates.push(path.join(name, scopedPackageName));
          });
      } else {
        candidates.push(name);
      }
      return candidates;
    }, [])
    // Get the full directory path
    .map((name) => path.join(dir, name))
    // Ensure it actually is a directory
    .filter((dir) => {
      let lstat = fs.lstatSync(dir);
      return lstat.isDirectory() || lstat.isSymbolicLink();
    })
    // Load the package.json for each
    .map((dir) => {
      try {
        return { dir, pkg: readPkg.sync(path.join(dir, 'package.json')) };
      } catch (e) {
        return false;
      }
    }).filter(Boolean);
}

function findCandidatesFromPkg(options) {
  let pkg = options.pkg;
  debug('searching package.json for plugins: %o', pkg);
  let dependencies = [];
  if (!options.excludeDependencies) {
    dependencies = dependencies.concat(Object.keys(pkg.dependencies || {}));
  }
  if (options.includeDev) {
    dependencies = dependencies.concat(Object.keys(pkg.devDependencies || {}));
  }
  if (options.includePeer) {
    dependencies = dependencies.concat(Object.keys(pkg.peerDependencies || {}));
  }
  if (options.includeBundle) {
    dependencies = dependencies.concat(Object.keys(pkg.bundleDependencies || pkg.bundledDependencies || {}));
  }
  if (options.includeOptional) {
    dependencies = dependencies.concat(Object.keys(pkg.optionalDependencies || {}));
  }
  debug('checking these dependencies to see if they are plugins: %o', dependencies);
  return dependencies
    // Load package.json's from resolved package location
    .map((dep) => {
      let pkgDir = resolvePkg(dep, { cwd: options.dir });

      // Check if there's a symlink where you'd usually find this node_module
      let potentialSymlink = path.join(options.dir, 'node_modules', dep);
      // If there is, and it points to our actual source dir, then use the symlink path
      if (
        fs.existsSync(potentialSymlink)
        && fs.lstatSync(potentialSymlink).isSymbolicLink()
        && fs.realpathSync(potentialSymlink) === pkgDir
      ) {
        pkgDir = potentialSymlink;
      }

      if (!pkgDir) {
        if (options.includeDev) {
          debug(`Unable to resolve ${ dep } from ${ options.dir }. You set 'includeDev: true' - make sure you aren't trying to recursively find plugins (devDependencies aren't normally installed for your dependencies). 0therwise, try reinstalling node_modules`);
        } else {
          debug(`Unable to resolve ${ dep } from ${ options.dir }. Is your node_modules folder corrupted? Try removing it and reinstalling dependencies.`);
        }
        return false;
      }

      let foundPkg;
      try {
        foundPkg = readPkgUp.sync({ cwd: pkgDir });
      } catch (e) {
        debug('Unable to read package.json for %s, skipping', pkgDir);
        return false;
      }

      return { dir: path.dirname(foundPkg.path), pkg: foundPkg.pkg };
    }).filter(Boolean);
}
