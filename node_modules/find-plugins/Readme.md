[![Travis](https://img.shields.io/travis/davewasmer/find-plugins.svg?style=flat-square)](https://travis-ci.org/davewasmer/find-plugins)
[![Dependencies](https://img.shields.io/david/davewasmer/find-plugins.svg?style=flat-square)](https://david-dm.org/davewasmer/find-plugins)
[![npm downloads](https://img.shields.io/npm/dm/find-plugins.svg?style=flat-square)](https://www.npmjs.com/package/find-plugins)
![latest version](https://img.shields.io/npm/v/find-plugins.svg?style=flat-square)

# find-plugins

A simple tool to find installed npm packages that meet certain criteria. Great for finding installed plugins or complementary packages to yours.

## Usage

#### Simple

```js
// Looks up the package.json in process.cwd, and returns any dependencies
// listed that have your package's `name` in their keywords.
plugins = findPlugins();
```

#### Custom Keyword

```js
// Same as above, but rather than using your package.json name as the keyword
// to search for, it will look for dependencies with "plugin" in their keyword
// list.
plugins = findPlugins({
    keyword: 'plugin'
});
```

#### Custom Filter

```js
// This time, the supplied filter function will be called for each dependency,
// and only those that return true will be returned in the final array.
//
// The filter function is supplied the package.json of the dependency to check.
// In this case, this will find all dependencies whose name starts with
// "my-plugin-"
plugins = findPlugins({
    filter: function(pkg) {
        return /^my-plugin-/.test(pkg.name);
    }
});
```

#### Ignore package.json dependency list

```js
// The scanAllDirs option allows you to skip loading your app's package.json
// dependency list. Instead, it will scan all directories in the node_modules
// folder, regardless of whether they are listed as dependencies or not.
plugins = findPlugins({
    scanAllDirs: true
});
```

#### Specify node_modules directory and your package.json

```js
// Got an unusual setup? Just pass in the path of the directory containing your
// dependencies, and the path to your app's package.json file. `pkg` is
// optional if you are using `scanAllDirs` and `keyword` or `filter`.
plugins = findPlugins({
    dir: path.join('..', 'foo', 'bar', 'node_modules'),
    pkg: path.join('..', 'foo', 'bar', 'package.json')
});
```

#### Sort the plugins based on "before" and "after" config in their package.json's

```js
// Each plugin can optionally include a "plugin-config" (or whatever you pass in under `configName`)
// with a "before" and/or "after" property. These can be the name of another plugin (or an array of
// other plugin names) that this plugin should come before/after. The returned array will be sorted
// according to these rules via a directed acyclic graph
plugins = findPlugins({
    sort: true,
    configName: 'plugin-config'
});
```


## Options

```js
{

  /**
   * The node_modules directory to scan for plugins
   *
   * @type {string}
   */
  dir?: string = process.cwd(),

  /**
   * The path to the package.json that lists dependencies to check for plugins
   *
   * @type {string}
   */
  pkg?: string = './package.json',

  /**
   * An array of additional paths to check as plugins
   *
   * @type {string[]}
   */
  include?: string[] = [],

  /**
   * If supplied, a package will be considered a plugin if `keyword` is present in it's package.json
   * "keywords" array
   *
   * @type {string}
   */
  keyword?: string = pkg.name,

  /**
   * If sort: true is supplied, this determines what property of the plugin's package.json to check
   * for the sort configuration (it should be an object with "before" and "after" properties which
   * are arrays of other plugins names)
   *
   * @type {boolean}
   */
  sort?: boolean = false,

  /**
   * The property on a plugin's package.json that contains sort config (an object with "before"
   * and/or "after" properties, which are the names of the plugin, or arrays of names)
   *
   * @type {string}
   */
  configName?: string = pkg.name,

  /**
   * A custom filter function that will receive the package summary and should return a boolean
   * indicating whether or not that package is a plugin.
   *
   * @type {function}
   */
  filter?: (plugin: PluginSummary) => boolean,

  /**
   * If true, the package.json list of dependencies will be ignored, and all packages found in
   * dir will be checked.
   *
   * @type {boolean}
   */
  scanAllDirs?: boolean,

  /**
   * By default, findPlugins checks only the packages listed under "dependencies" in the
   * package.json. Setting this option to true will ignore those packages listed under
   * "dependencies".
   *
   * @type {boolean}
   */
  excludeDependencies?: boolean,

  /**
   * Also check packages listed under devDependencies
   *
   * @type {boolean}
   */
  includeDev?: boolean,

  /**
   * Also check packages listed under peerDependencies
   *
   * @type {boolean}
   */
  includePeer?: boolean,

  /**
   * Also check packages listed under bundleDependencies
   *
   * @type {boolean}
   */
  includeBundle?: boolean,

  /**
   * Also check packages listed under optionalDependencies
   *
   * @type {boolean}
   */
  includeOptional?: boolean

}
```

## Returns

```js
> findPlugins();
[
    {
        dir: './node_modules/foobar',
        pkg: { name: 'foobar', version: '0.0.1', ... }
    },
    ...
]
```
