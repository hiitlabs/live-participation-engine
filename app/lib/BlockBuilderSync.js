/**
  Presemo 4 - Live Participation Engine
  Copyright (C) 2013-2015 Screen.io

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as
  published by the Free Software Foundation, either version 3 of the
  License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * Builds js, html and css of a blocktype for each channeltype
 */
/*jshint node: true */

"use strict";

if (!module.parent) {
  throw new Error('direct running not supported');
}

var debug = require('debug')('io:BlockBuilderSync');

var console = require('./Logger')('io:BlockBuilderSync');

var async = require('async');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var fs = require('fs');
var glob = require('glob');
var join = require('path').join;
var relative = require('path').relative;
var basename = require('path').basename;
var minifyHtml = require('./utils/minifyHtml');
var replaceConstants = require('./utils/replaceConstants');
var template = require('./utils/template');
var uglifyjs = require('uglify-js');
var cleancss = require('clean-css');
var zlib = require('zlib');
var DEV = require('./DEV');

var BlockBuilderSync = function build(blocktype, buildDone) {
  debug('build called on %s', blocktype);

  if (!blocktype) throw new Error('blocktype missing');

  var BLOCK_DIR = join(__dirname, '../blocktypes/' + blocktype);

  if (!BLOCK_DIR) throw new Error('block dir missing');

  var blockFound = fs.existsSync(BLOCK_DIR);
  if (!blockFound) throw new Error('block dir not found!');

  var siblingFound = fs.existsSync(join(BLOCK_DIR, '../core'));
  if (!siblingFound) throw new Error('invalid block dir location!');

  var CLIENT_DIR = join(BLOCK_DIR, 'client');
  var BUILD_DIR = join(
    __dirname,
    '../../build/' + blocktype + '/client-build'
  );
  var PUBLIC_DIR = join(
    __dirname,
    '../../build/' + blocktype + '/client-public'
  );

  continueBuild(
    blocktype, BLOCK_DIR, CLIENT_DIR,
    BUILD_DIR, PUBLIC_DIR, buildDone
  );
}

function continueBuild(BLOCKTYPE, BLOCK_DIR, CLIENT_DIR,
    BUILD_DIR, PUBLIC_DIR, buildDone) {

  var BUILDENV = process.env.NODE_ENV;
  if (!BUILDENV || BUILDENV == 'development') BUILDENV = 'dev';

  var BUILDCLEAN = process.env.BUILDCLEAN;

  var debug = require('debug')('io:BlockBuilderSync:' + BLOCKTYPE);

  debug('build continuing on %s', BLOCK_DIR);

  var CHANNELTYPES = ['web', 'screen', 'control', 'stage'];
  var LANGUAGES = ['en', 'fi'];

  var REQUIRED_DIRS = [];
  REQUIRED_DIRS.push(CLIENT_DIR);
  REQUIRED_DIRS.push(join(CLIENT_DIR, 'lang'));
  REQUIRED_DIRS.push(BUILD_DIR);
  REQUIRED_DIRS.push(PUBLIC_DIR);
  CHANNELTYPES.forEach(function(channeltype) {
    REQUIRED_DIRS.push(join(BUILD_DIR, channeltype));
    LANGUAGES.forEach(function(language) {
      REQUIRED_DIRS.push(join(BUILD_DIR, channeltype, language));
    });
  });

  /**
  * Build utils scoped to this build
  */

  function ensureRequiredDirs() {
    debug('ensuring required dirs exist');
    REQUIRED_DIRS.forEach(function(dir) {
      mkdirp.sync(dir);
    });
  }

  // Cache filesystem stats
  var filelistCache = {};
  var globCache = {};
  var statCache = {};
  function cacheDirStats() {
    debug('caching directory stat calls');
    filelistCache = {};
    globCache = {};
    statCache = {};
    REQUIRED_DIRS.forEach(function(dir) {
      cacheSingleDirStats(dir);
    });
  }
  function cacheSingleDirStats(requiredDir) {
    // Consider only files that do not start with an underscore
    var query = new glob.Glob(
      join(requiredDir, '!(_)*.*'),
      {nonull: false, stat: true, sync: true}
    );
    var files = query.found;
    var error = query.error;
    if (error) throw new Error(error);

    filelistCache[requiredDir] = files;
    // Add to globCache and statCache
    var key;
    for (key in query.cache) {
      globCache[key] = query.cache[key];
    }
    for (key in query.statCache) {
      statCache[key] = query.statCache[key];
    }
  }

  // Reset the build dir after errors etc, to prevent modification times
  // hindering rebuilding
  function resetBuildDirs() {
    console.info('%s: removing channel build dirs', BLOCKTYPE);
    var BUILD_DIR_CHANNELS = CHANNELTYPES.map(function(channeltype) {
      return join(BUILD_DIR, channeltype);
    });
    BUILD_DIR_CHANNELS.forEach(function(dir) {
      rimraf.sync(dir);
    });
  }

  // If build config changes (buildEnv, for example), we have to
  // ignore modification times and build anyway, so clean the build dirs.
  // Other option is to build each env to separate dir, but then active dir
  // would need to be inserted to places.
  var PREV_BUILD_ENV_FILE = join(BUILD_DIR, '.buildenv');
  var PREV_BUILD_ENV = '';
  function loadPreviousBuildEnv() {
    debug('loading previous build env');
    var there = fs.existsSync(PREV_BUILD_ENV_FILE);
    if (!there) return;

    var data = fs.readFileSync(PREV_BUILD_ENV_FILE, 'utf8');
    PREV_BUILD_ENV = data.trim();
  }
  function handleBuildEnvChange() {
    debug(
      'previous build env: %s, new build env: %s', PREV_BUILD_ENV, BUILDENV
    );
    if (PREV_BUILD_ENV != BUILDENV || BUILDCLEAN) {
      // Buildenv changed, needs to clean the build data
      console.info('%s: build env changed from %s to %s, removing old build files', BLOCKTYPE, PREV_BUILD_ENV, BUILDENV);
      resetBuildDirs();
    } else {
      // Same buildEnv, proceed as usual
      debug('using existing build files');
    }
  }
  function saveBuildEnv(done) {
    debug('saving build env: %s', BUILDENV);
    fs.writeFileSync(PREV_BUILD_ENV_FILE, BUILDENV);
    done();
  }

  // Removing built files that do not have sources anymore (due to source
  // renames)
  function cleanChannelBuildDirs() {
    debug('cleaning channel build dirs');
    CHANNELTYPES.forEach(function(channeltype) {
      cleanChannelBuildDir(channeltype);
    });
  }
  // TODO lang dirs are not cleaned for now
  function cleanChannelBuildDir(channeltype) {
    var sourceFilenames = {};
    filelistCache[CLIENT_DIR].map(function(filepath) {
      return basename(filepath);
    }).forEach(function(filename) {
      sourceFilenames[filename] = true;
    });

    var BUILD_DIR_CHANNEL = join(BUILD_DIR, channeltype);

    var targetFilenames = filelistCache[BUILD_DIR_CHANNEL].map(
      function(filepath) {
        return basename(filepath);
      }
    );

    var removedFilePaths = [];
    targetFilenames.forEach(function(filename) {
      if (!sourceFilenames[filename]) {
        removedFilePaths.push(join(BUILD_DIR_CHANNEL, filename));
      }
    });

    if (removedFilePaths.length) {
      console.info('%s: removing obsolete build files %s', BLOCKTYPE, removedFilePaths);
      // Aims to update the dir mod timestamp, otherwise the actual
      // client-public -files won't be rebuilt if files are only removed
      if (targetFilenames.indexOf('index.js') !== -1) {
        fs.utimesSync(join(BUILD_DIR_CHANNEL, 'index.js'), new Date(), new Date());
      }
    }

    removedFilePaths.forEach(function(removedFilePath) {
      fs.unlinkSync(removedFilePath);
    });
  }

  // Each source file is preprocessed to each channeltype by replacing constants
  // TODO get SUPPORTED_CHANNELTYPES from block definition or update this list
  // to contain all channeltypes that are used anywhere
  function getChannelBuildConstants(channeltype, siteLang) {
    var BUILD_CONSTANTS = {
      BLOCKTYPE: BLOCKTYPE,
      BUILDENV: '',
      DEV: false,
      TESTING: false,
      STAGING: false,
      PRODUCTION: false,
      CHANNELTYPE: '',
      WEB: false,
      CONTROL: false,
      STAGE: false,
      SCREEN: false
    };

    // Currently a global
    BUILD_CONSTANTS.BUILDENV = BUILDENV.toUpperCase();
    BUILD_CONSTANTS[BUILDENV.toUpperCase()] = true;

    // Set for each channeltype
    BUILD_CONSTANTS.CHANNELTYPE = channeltype.toUpperCase();
    BUILD_CONSTANTS[channeltype.toUpperCase()] = true;

    // Language is used only on special lang.js files
    if (siteLang) {
      BUILD_CONSTANTS.SITELANG = '';
      BUILD_CONSTANTS.EN = false;
      BUILD_CONSTANTS.FI = false;
      BUILD_CONSTANTS.SV = false;

      BUILD_CONSTANTS.SITELANG = siteLang.toUpperCase();
      BUILD_CONSTANTS[siteLang.toUpperCase()] = true;
    }

    return BUILD_CONSTANTS;
  }

  // Timestamps are compared to build only when needed
  function isCurrent(sourceFilepaths, targetFilepaths) {
    var sourceModifiedTime = getLatestModifiedTime(sourceFilepaths);
    var targetModifiedTime = getEarliestModifiedTime(targetFilepaths);
    return targetModifiedTime >= sourceModifiedTime;
  }

  function getLatestModifiedTime(filepaths) {
    var latestModifiedTime = 1;
    function compareModifiedTime(filepath) {
      var stat = statCache[filepath];
      var modifiedTime = stat ? stat.mtime.getTime() : 1;
      if (modifiedTime > latestModifiedTime) {
        latestModifiedTime = modifiedTime;
      }
    }
    if (Array.isArray(filepaths)) {
      filepaths.forEach(compareModifiedTime);
    } else {
      compareModifiedTime(filepaths);
    }
    return latestModifiedTime;
  }

  function getEarliestModifiedTime(filepaths) {
    var earliestModifiedTime = Date.now();
    function compareModifiedTime(filepath) {
      var stat = statCache[filepath];
      var modifiedTime = stat ? stat.mtime.getTime() : 1;
      if (modifiedTime < earliestModifiedTime) {
        earliestModifiedTime = modifiedTime;
      }
    }
    if (Array.isArray(filepaths)) {
      filepaths.forEach(compareModifiedTime);
    } else {
      compareModifiedTime(filepaths);
    }
    return earliestModifiedTime;
  }

  /**
  * JS builder client/*.js -> client-build/channeltype/*.js
  */

  function buildJS(done) {
    debug('checking js build');
    var files = glob.sync(
      join(CLIENT_DIR, '!(_)*.js'),
      {nonull: false, cache: globCache, statCache: statCache}
    );
    async.each(files, buildJSFile, done);
  }

  function buildJSFile(filepath, fileDone) {
    var fileContents = fs.readFileSync(filepath, 'utf8');
    async.each(
      CHANNELTYPES,
      buildJSFileForChannel(filepath, fileContents),
      fileDone
    );
  }

  function buildJSFileForChannel(filepath, fileContents) {
    return function(channeltype, done) {

      var filename = basename(filepath);
      var BUILD_DIR_CHANNEL = join(BUILD_DIR, channeltype);

      var targetFilepath = join(BUILD_DIR_CHANNEL, filename);

      if (isCurrent(filepath, targetFilepath)) {
        return done();
      }

      debug('%s: client/%s > client-build/%s/%s', BLOCKTYPE, filename, channeltype, filename);
      console.info('%s: client/%s > client-build/%s/%s', BLOCKTYPE, filename, channeltype, filename);

      var BUILD_CONSTANTS = getChannelBuildConstants(channeltype);

      var processedFileContents =
          replaceConstants(fileContents, BUILD_CONSTANTS);

      // Register as a common js module if filename does not include '.global.'
      if (filename.indexOf('.global.') == -1) {
        processedFileContents =
            'require.register("' + BLOCKTYPE + '/' + filename +
            '", function(exports, require, module) { ' +
            processedFileContents +
            '\n});';
      }

      // Minify file (or just beautify it if in dev env) if filename does not
      // include .min.
      if (filename.indexOf('.min.') == -1) {
        try {
          processedFileContents = minifyJS(processedFileContents);
        } catch (e) {
          console.error(
            'Error minifying file: %s (line numbers below are inaccurate)',
            targetFilepath
          );
          console.error('Parse error: %s', e);
          console.error('Parse error: %s', e && e.msg);
          throw e;
        }
      }

      // Global modules with empty content are ok.
      // If wrapped module is empty, save only an empty file without wrapper
      if (processedFileContents == 'require.register("' + BLOCKTYPE + '/' +
          filename + '", function(exports, require, module) {});') {
        processedFileContents = '';
      }
      // Minified version
      if (processedFileContents == 'require.register("' + BLOCKTYPE + '/' +
          filename + '",function(){});') {
        processedFileContents = '';
      }

      fs.writeFileSync(targetFilepath, processedFileContents);
      done();
    };
  }

  function minifyJS(fileContents) {
    var minifyOptions = {
      fromString: true,
      //warnings: true,
      //outSourceMap: targetFileGz + '.map',
      //sourceRoot: ''
      //compress: {
      //  global_defs: globalDefs
      //}
      output: {
        comments: function(node, comment) {
          if (comment.type == "comment2") {
              // multiline comment
              return (/@preserve|@license|@cc_on/i).test(comment.value);
          }
        }
      }
    };

    if (DEV) {
      // Strategy: always run through minifier to prevent errors in prod vs dev,
      // but just disable most minification options here, making code more
      // readable in case of errors
      minifyOptions.mangle = false;
      minifyOptions.compress = {
        //global_defs: globalDefs,
        sequences     : false,  // join consecutive statements with the “comma
                                // operator”
        properties    : false,  // optimize property access: a["foo"] → a.foo
        dead_code     : true,   // discard unreachable code
        drop_debugger : false,  // discard “debugger” statements
        unsafe        : false,  // some unsafe optimizations
        conditionals  : true,   // optimize if-s and conditional expressions
        comparisons   : false,  // optimize comparisons
        evaluate      : true,   // evaluate constant expressions
        booleans      : false,  // optimize boolean expressions
        loops         : false,  // optimize loops
        unused        : true,   // drop unused variables/functions
        hoist_funs    : false,  // hoist function declarations
        //keep_fargs    : true,   // keep unused function arguments
        hoist_vars    : false,  // hoist variable declarations
        if_return     : false,  // optimize if-s followed by return/continue
        join_vars     : false,  // join var declarations
        cascade       : false,  // try to cascade `right` into `left` in
                                // sequences
        side_effects  : false,  // drop side-effect-free statements
        drop_console  : false,  // discard calls to `console.*` functions
        warnings      : false   // warn about potentially dangerous
                                // optimizations/code
      };
      minifyOptions.output.beautify = true;
    }

    // TODO perhaps caching of parsed AST for multiple channels
    var result = uglifyjs.minify(fileContents, minifyOptions);
    //var map = result.map;
    var minified = result.code;
    return minified;
  }

  /**
  * HTML builder client/*.html -> client-build/channeltype/*.html
  */

  function buildHTML(done) {
    debug('checking html build');

    var files = glob.sync(
      join(CLIENT_DIR, '!(_)*.html'),
      {nonull: false, cache: globCache, statCache: statCache}
    );
    async.each(files, buildHTMLFile, done);
  }

  function buildHTMLFile(filepath, fileDone) {
    var fileContents = fs.readFileSync(filepath, 'utf8');
    async.each(
      CHANNELTYPES,
      buildHTMLFileForChannel(filepath, fileContents),
      fileDone
    );
  }

  function buildHTMLFileForChannel(filepath, fileContents) {
    return function(channeltype, done) {

      var filename = basename(filepath);
      var BUILD_DIR_CHANNEL = join(BUILD_DIR, channeltype);

      var targetFilepath = join(BUILD_DIR_CHANNEL, filename);

      if (isCurrent(filepath, targetFilepath)) {
        return done();
      }

      console.info('%s: client/%s > client-build/%s/%s', BLOCKTYPE, filename, channeltype, filename);

      var BUILD_CONSTANTS = getChannelBuildConstants(channeltype);

      var processedFileContents =
          replaceConstants(fileContents, BUILD_CONSTANTS);

      // Minify file if filename does not include .min.
      if (filename.indexOf('.min.') == -1) {
        processedFileContents = minifyHTML(processedFileContents);
      }

      // Parse HTML as template
      var processedTemplateFn = template(processedFileContents);

      // Render the template with bogus values to see if it will come empty
      // If there are complex javascript in template, could break on undefined
      // properties
      var processedCandidate = processedTemplateFn({});
      processedCandidate = processedCandidate.trim();
      if (!processedCandidate.length) {
        processedFileContents = '';
      }

      // Wrap only if there is content, otherwise save an empty file
      if (processedFileContents.length) {

        // TODO could allow other kinds of HTML embedding based on filename,
        // perhaps evaluating the template function to simple string.
        // But stringifying can be done on the client side too.
        processedFileContents =
            '"use strict";module.exports=' + processedTemplateFn.source + ';';

        // HTML templates are exposed as common js modules for now
        processedFileContents =
            'require.register("' + BLOCKTYPE + '/' + filename +
            '", function(exports, require, module) { ' +
            processedFileContents +
            '\n});';

        // HTML template functions are always minified
        try {
          processedFileContents = minifyJS(processedFileContents);
        } catch (e) {
          console.error(
            'Error minifying file: %s (line numbers below are inaccurate)',
            targetFilepath
          );
          console.error('Parse error: %s', e);
          throw e;
        }

      }

      fs.writeFileSync(targetFilepath, processedFileContents);
      done();
    };
  }

  function minifyHTML(fileContents) {
    var minified = minifyHtml(fileContents);
    return minified;
  }

  /**
  * CSS builder client/*.css -> client-build/channeltype/*.css
  */

  function buildCSS(done) {
    debug('checking css build');

    var files = glob.sync(
      join(CLIENT_DIR, '!(_)*.css'),
      {nonull: false, cache: globCache, statCache: statCache}
    );
    async.each(files, buildCSSFile, done);
  }

  function buildCSSFile(filepath, fileDone) {
    var fileContents = fs.readFileSync(filepath, 'utf8');
    async.each(
      CHANNELTYPES,
      buildCSSFileForChannel(filepath, fileContents),
      fileDone
    );
  }

  function buildCSSFileForChannel(filepath, fileContents) {
    return function(channeltype, done) {

      var filename = basename(filepath);
      var BUILD_DIR_CHANNEL = join(BUILD_DIR, channeltype);

      var targetFilepath = join(BUILD_DIR_CHANNEL, filename);

      if (isCurrent(filepath, targetFilepath)) {
        return done();
      }

      console.info('%s: client/%s > client-build/%s/%s', BLOCKTYPE, filename, channeltype, filename);

      var BUILD_CONSTANTS = getChannelBuildConstants(channeltype);

      var processedFileContents =
          replaceConstants(fileContents, BUILD_CONSTANTS);

      // Render template immediately
      processedFileContents = template(processedFileContents)();

      // Minify file if filename does not include .min.
      if (filename.indexOf('.min.') == -1) {
        // Otherwise always run through minifier to prevent errors in prod vs
        // dev
        processedFileContents = minifyCSS(processedFileContents);

        processedFileContents = processedFileContents.trim();
      }

      // Wrap only if there is content, otherwise save an empty file
      if (processedFileContents.length) {

        // TODO there could be other exposing mechanisms
        // CSS files are exposed as common js modules for now
        // TODO some filenames could be rendered as ordinary strings,
        // and then bundled together as ordinary css to separate file.

        // Or '.global.' filenames could be exposed as global styles already
        // when run as global js. But for now the commonjs styles allow
        // concatenating several stylesheets to one, and then exposing them
        // when actually loading the module, so let's prefer this for now.

        processedFileContents =
            'module.exports=' + JSON.stringify(processedFileContents) + ';';

        processedFileContents =
            'require.register("' + BLOCKTYPE + '/' + filename +
            '", function(exports, require, module) { ' +
            processedFileContents +
            '\n});';

        try {
          processedFileContents = minifyJS(processedFileContents);
        } catch (e) {
          console.error(
            'Error minifying file: %s (line numbers below are inaccurate)',
            targetFilepath
          );
          console.error('Parse error: %s', e);
          throw e;
        }

      }

      fs.writeFileSync(targetFilepath, processedFileContents);
      done();
    };
  }

  function minifyCSS(fileContents) {
    // Conservative options for now
    // TODO check whether something breaks if advanced are enabled
    var minifyOptions = {
      processImport: false,
      noRebase: true,
      noAdvanced: true,
      compatibility: 'ie8'
    };
    if (DEV) {
      minifyOptions.keepBreaks = true;
      /*
      var minifyOptions = {
        keepSpecialComments: '*', // * for keeping all (default), 1 for keeping
                                  // first one, 0 for removing all
        keepBreaks: false,        // whether to keep line breaks (default is
                                  // false)
        benchmark: false,         // turns on benchmarking mode measuring time
                                  // spent on cleaning up (run npm run bench to
                                  // see example)
        removeEmpty: false,       // whether to remove empty elements (default
                                  // is false)
        debug: false,             // set to true to get minification statistics
                                  // under stats property (see
                                  // test/custom-test.js for examples)
        root: '',                 // path to resolve absolute @import rules and
                                  // rebase relative URLs
        relativeTo: '',           // path with which to resolve relative @import
                                  // rules and URLs
        processImport: false,     // whether to process @import rules
        noRebase: false,          // whether to skip URLs rebasing
        noAdvanced: false,        // set to true to disable advanced
                                  // optimizations - selector & property
                                  // merging, reduction, etc.
        selectorsMergeMode: '*'   // ie8 for IE8 compatibility mode,
                                  // * for merging all (default)

      }
      */
    }
    var minified = new cleancss(minifyOptions).minify(fileContents);
    return minified;
  }

  /**
  * Lang.js builder client/lang/*.js -> client-build/channeltype/en/*.js
  * Lang.js builder client/lang/*.js -> client-build/channeltype/fi/*.js
  */

  function buildLang(done) {
    debug('checking lang build');

    var files = glob.sync(
      join(CLIENT_DIR, 'lang', '!(_)*.js'),
      {nonull: false, cache: globCache, statCache: statCache}
    );
    async.each(files, buildLangFile, done);
  }

  function buildLangFile(filepath, fileDone) {
    var fileContents = fs.readFileSync(filepath, 'utf8');
    async.each(
      CHANNELTYPES,
      buildLangFileForChannel(filepath, fileContents),
      fileDone
    );
  }

  function buildLangFileForChannel(filepath, fileContents) {
    return function(channeltype, done) {
      async.each(
        LANGUAGES,
        buildLangFileForChannelForLang(filepath, fileContents, channeltype),
        done
      );
    };
  }

  function buildLangFileForChannelForLang(filepath, fileContents, channeltype) {
    return function(language, done) {

      var filename = basename(filepath);
      var CLIENT_DIR_LANG = join(CLIENT_DIR, 'lang');
      var BUILD_DIR_CHANNEL_LANG = join(BUILD_DIR, channeltype, language);

      var targetFilepath = join(BUILD_DIR_CHANNEL_LANG, filename);

      if (isCurrent(filepath, targetFilepath)) {
        return done();
      }

      console.info(
        '%s: client/lang/%s > client-build/%s/%s/%s',
        BLOCKTYPE, filename, channeltype, language, filename
      );

      var BUILD_CONSTANTS = getChannelBuildConstants(channeltype, language);

      var processedFileContents =
          replaceConstants(fileContents, BUILD_CONSTANTS);

      // src lang/trans.js, target en/trans.js and fi/trans.js, but required
      // still as trans.js
      // Register as a common js module if filename does not include '.global.'
      if (filename.indexOf('.global.') == -1) {
        processedFileContents =
            'require.register("' + BLOCKTYPE + '/' + filename +
            '", function(exports, require, module) { ' +
            processedFileContents +
            '\n});';
      }

      // Minify file (or just beautify it if in dev env) if filename does not
      // include .min.
      if (filename.indexOf('.min.') == -1) {
        try {
          processedFileContents = minifyJS(processedFileContents);
        } catch (e) {
          console.error(
            'Error minifying file: %s (line numbers below are inaccurate)',
            targetFilepath
          );
          console.error('Parse error: %s', e);
          throw e;
        }
      }

      // Global modules with empty content are ok.
      // If wrapped module is empty, save only an empty file without wrapper
      if (processedFileContents == 'require.register("' + BLOCKTYPE + '/' +
          filename + '", function(exports, require, module) {});') {
        processedFileContents = '';
      }
      // Minified version
      if (processedFileContents == 'require.register("' + BLOCKTYPE + '/' +
          filename + '",function(){});') {
        processedFileContents = '';
      }

      fs.writeFileSync(targetFilepath, processedFileContents);
      done();
    };
  }

  /**
  * Block publish client-build/channeltype/*.* ->
  * client-public/channeltype/blocktype-lang.js
  */

  function publishBlock(done) {
    debug('checking block build');

    async.each(CHANNELTYPES, buildBlockForChannel, done);
  }

  function buildBlockForChannel(channeltype, channelDone) {

    var BUILD_DIR_CHANNEL = join(BUILD_DIR, channeltype);

    var targetFilepaths = LANGUAGES.map(function(language) {
      return join(
        PUBLIC_DIR,
        BLOCKTYPE + '-' + language + '-' + channeltype + '.min.js.gz_'
      );
    });

    // Concatenates all built files for now, could build different packages
    // based on type, filename, subdirectory etc.

    var builtFilepaths = glob.sync(
      join(BUILD_DIR_CHANNEL, '**/*.*'),
      {nonull: false, cache: globCache, statCache: statCache}
    );
    if (isCurrent(builtFilepaths, targetFilepaths)) {
      return channelDone();
    }
    // else something has changed, build all langs
    continueBuildBlockForChannel(channeltype, channelDone);
  }

  function continueBuildBlockForChannel(channeltype, channelDone) {
    var BUILD_DIR_CHANNEL = join(BUILD_DIR, channeltype);
    var builtFilepaths = glob.sync(
      join(BUILD_DIR_CHANNEL, '*.*'),
      {nonull: false, cache: globCache, statCache: statCache}
    );
    var builtFiles = builtFilepaths.map(function(filepath) {
      return fs.readFileSync(filepath, 'utf8');
    });
    async.each(
      LANGUAGES,
      buildBlockForChannelForLang(channeltype, builtFiles),
      channelDone
    );
  }

  function buildBlockForChannelForLang(channeltype, builtFiles) {
    return function(language, done) {

      var BUILD_DIR_CHANNEL = join(BUILD_DIR, channeltype);

      var builtLangpaths = glob.sync(
        join(BUILD_DIR_CHANNEL, language, '*.*'),
        {nonull: false, cache: globCache, statCache: statCache}
      );
      var builtLangFiles = builtLangpaths.map(function(filepath) {
        return fs.readFileSync(filepath, 'utf8');
      });
      writeBuildBlockForChannelForLang(
        channeltype,
        builtFiles,
        language,
        builtLangFiles,
        done
      );
    };
  }

  function writeBuildBlockForChannelForLang(channeltype, builtFiles, language,
                                            builtLangFiles, done) {

    var targetFilepath = join(
      PUBLIC_DIR,
      BLOCKTYPE + '-' + language + '-' + channeltype + '.min.js.gz_'
    );
    var targetFilepathWithoutGz = join(
      PUBLIC_DIR,
      BLOCKTYPE + '-' + language + '-' + channeltype + '.min.js'
    );

    console.info(
      '%s: client-build/%s/*.* > client-public/%s-%s-%s.min.js.gz_',
      BLOCKTYPE, channeltype, BLOCKTYPE, language, channeltype
    );

    var joinedFileContents =
        builtFiles.join('\n') + '\n' + builtLangFiles.join('\n') + '\n';

    // Save non-gzipped version, not used
    fs.writeFileSync(targetFilepathWithoutGz, joinedFileContents);
    // TODO experiment how easily sync writes are corrupted if process is
    // restarted violently, do we need to save by renaming always.
    // Better would be to ensure in process exit that all streams are closed,
    // but it can take some time with websockets etc.

    var gzip = zlib.createGzip({level: 9});
    var outStream = fs.createWriteStream(targetFilepath + '-buildtemp');
    // or perhaps the 'finish' event, but this should work
    outStream.on('close', function() {
      // atomic rename only when outStream is closed
      // Otherwise process restarts could leave a corrupted file
      fs.renameSync(targetFilepath + '-buildtemp', targetFilepath);
      //fs.unlinkSync(targetFilepath + '-buildtemp');
      done();
    });
    gzip.pipe(outStream);
    gzip.end(joinedFileContents);
  }

  /**
  * Builder will return an info object containing the resulting file sizes
  * Note that only the compiled bundle is measured, not external assets
  */

  var bundleInfo = {};

  function getBundleInfo(done) {

    async.each(LANGUAGES, function(language, languageDone) {
      bundleInfo[language] = {};

      async.each(CHANNELTYPES, function(channeltype, channelDone) {
        var targetFilepath = join(
          PUBLIC_DIR,
          BLOCKTYPE + '-' + language + '-' + channeltype + '.min.js.gz_'
        );
        var stats = fs.statSync(targetFilepath);
        bundleInfo[language][basename(targetFilepath)] = {
          size: stats.size
        };
        channelDone();
      }, languageDone);
    }, done);
  }

  /**
  * Creating symlink to site public dir
  */

  // TODO think whether to delegate this last publishing step to somewhere else,
  // enabling depublishing (unlinking) of inactive blocktypes, too
  function ensureSymlink(done) {
    debug('checking block public symlink');

    var sitePublicDir = join(__dirname, '../../public/assets');
    var blockPublicDir = join(sitePublicDir, BLOCKTYPE);

    var found = fs.existsSync(blockPublicDir);
    if (found) return done();

    mkdirp.sync(sitePublicDir);

    var blockAssetPathRelative = relative(sitePublicDir, PUBLIC_DIR);

    try {
      fs.symlinkSync(
        blockAssetPathRelative,
        blockPublicDir,
        'dir'
      );
    } catch (e) {
      // We'll ignore errors due to already existing filename
      if (e.code != 'EEXIST') {
        throw e;
      }
      // Later there could be also EACCES (and ENOENT) (or EPERM) issues
      // here.
    }
    done();
  }

  // ###########################################################################

  /**
  * Build order
  */

  function ensureCleanDirs() {
    loadPreviousBuildEnv(); // should perhaps clear it here in case build fails
    handleBuildEnvChange();
    ensureRequiredDirs();
    cacheDirStats();
    cleanChannelBuildDirs();
  }

  function buildFiles(done) {
    async.series([
      buildJS,
      buildHTML,
      buildCSS,
      buildLang
    ], done);
  }

  function publishBundle(done) {
    cacheDirStats();
    async.series([
      publishBlock,
      saveBuildEnv // last, in case build fails
    ], done);
  }

  // Start the build
  ensureCleanDirs();
  async.series([
    buildFiles,
    publishBundle,
    getBundleInfo,
    ensureSymlink
  ], function(error) {
    // Return the bundleInfo object too
    buildDone(error, bundleInfo);
  });
}

module.exports = BlockBuilderSync;
