import path from 'path';

export interface PluginSummary {

  /**
   * The path to the plugin's directory
   *
   * @type {string}
   */
  dir: string;

  /**
   * The contents of the plugin's package.json file
   *
   * @type {*}
   */
  pkg: any;

}

export default function findPlugins(options?: {

  /**
   * The directory to scan for plugins. If `scanAllDirs` is true, this should be a node_modules
   * folder. If not, it should be a folder that contains a node_modules folder.
   *
   * @type {string}
   */
  dir?: string = 'node_modules',

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
   * modulesDir will be checked.
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

}): PluginSummary[];