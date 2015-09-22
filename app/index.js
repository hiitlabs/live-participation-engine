/**
 * Main platform runner
 */

//"use strict";

// Detect accidental globals
require('./lib/utils/detectGlobalLeaks')();

var debug = require('debug')('io:main'); debug('module loading');
var version = exports.version = '4.0';
var DEV = require('./lib/DEV');
var invariant = require('./lib/utils/invariant');

invariant(!module.parent, 'Required as a submodule, not supported');

/**
 * Config
 */

// Set NODE_ENV to 'production', else it is 'development', later perhaps
// 'staging' etc
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

// Sync loading of config.json for now to ease loading.
var SiteConfig = require('./lib/SiteConfig');

var console = require('./lib/Logger')('io:main');

// TODO consolidate env vars
var NODE_ENV = process.env.NODE_ENV;
var FORCE_RUN = process.env.FORCE_RUN;

process.title =
    process.title + ':' + SiteConfig.SITEROUTE + ':' + SiteConfig.PORT;
console.info(
  'Starting %s-%s %s pid %s (%s) in %s %s',
  version, NODE_ENV, process.version, process.pid, process.title,
  process.platform, process.arch
);
console.info('Current directory: %s', process.cwd());
//console.log('Parent ppid is %s', require('posix').getpgid(0));
//console.log('Process groups %s %s', process.getgid(), process.getuid());
if (DEV) {
  console.warn('Run with NODE_ENV=production to strip debugs and minify assets.');
}


if (Boolean(process.stdout.isTTY) || Boolean(process.stderr.isTTY)) {
  console.warn(
    'Pipe the output to a file in production (node index.js 1>>1.log 2>>2.log) or ' +
    'otherwise the logging will block on writes.'
  );
}

/**
 * Global signal listeners
 */

// On first Ctrl-C, start graceful shutdown, on next Ctrl+C exit immediately
process.once('SIGINT', function() {
  HttpServer.stop();
});

process.on('exit', function(codeOrSignal) {
  debug('Process exit: %s', codeOrSignal);
});

if (!DEV) {
  process.on('uncaughtException', function(err) {
    // TODO centralized error logging
    console.error('Uncaught Exception:\n %j', (err && err.stack) || err);
    console.error('uncaughtException: %s', err);
    console.error(err);
  });
}

// Basic loading decisions:
// - how to deal with database connections, when read/write ready
// - when to start listening (accepting) connections on port
// - when to allow requests (http and websocket) to proceed (assets ready, session DBs available)
// - what to do async, what in sync (initial requires are sync, but later additions async)

/**
 * A global GlobalLock to stall requests when reconfiguring
 */

var GlobalLock = require('./lib/GlobalLock');

/**
 * Databases
 */
// TODO do not require dbs directly, only the loaded event emitter
var DataStore = require('./lib/DataStore');

/**
 * Event bus
 */

// TODO log events via this event emitter or separate emitter?

var Events = require('./lib/Events');

/**
 * HTTP server
 */

//var HttpMiddleware = require('./lib/HttpMiddleware'); // Express app

var HttpServer = require('./lib/HttpServer'); // HTTP or SPDY server

HttpServer.on('listening', function() {
  debug('SiteConfig %j', SiteConfig);
});

/**
 * Spawned or run directly
 */

if (process.send) {
  debug('Spawned as a child process, setting up interprocess listeners');
  // TODO refactor with process.once perhaps to get server only first
  process.on('message', function(msg, handle) {
    if (msg === 'connection') {
      debug('connection received from master');
      // If HttpServer.listen() is not yet called, will break
      HttpServer._handle.onconnection(handle._handle);
      return;
    }
    if (msg === 'server') { // or use process.once()
      debug('http server received from master');
      HttpServer.start(handle); // This needs to be immediate (no waiting of dbs anymore etc)
    }
  });
  // Kill process if idle for two sequential hours
  function idleKill() {
    var siteIdle = false;
    function checkIdle() {
      HttpServer.getConnections(function(err, count) {
        if (count) {
          // There are connections, defer check
          console.info('idle check: %s connections', count)
          siteIdle = false;
          deferCheckIdle();
          return;
        }
        if (!count && !siteIdle) {
          // First idle tick, wait for next
          console.info('idle check: first idle tick, waiting for next')
          siteIdle = true;
          deferCheckIdle();
          return;
        }
        if (!count && siteIdle) {
          // Second idle tick, kill process
          console.info('idle check: second idle tick, killing process')
          process.exit();
          return;
        }
      });
    }
    function deferCheckIdle() {
      setTimeout(function() {
        checkIdle();
        // TODO perhaps set configurable SITE_TIMEOUT / 2
        // Now 1 hour + 1 hour (two sequential idle ticks needed)
      }, 60*60*1000);
    }
    deferCheckIdle();
  }
  idleKill();

  process.on('disconnect', function() {
    // Master disconnected, let's close
    HttpServer.stop();
  });

} else {
  debug('Started directly, will start listening on port next tick');
  process.nextTick(function() {
    HttpServer.start(SiteConfig.PORT);
  });
}

/**
 * This process does not serve domain root, everything is prefixed by IO_ROUTE
 */

//HttpMiddleware.get('/', function(req, res, next) { res.send(''); });


/**
 * Main init, wait until DBs ready to proceed with loading
 */

var DATABASES_LOCK = 'databases';
GlobalLock.add(DATABASES_LOCK);

DataStore.db.on('bothLoaded', function() {
  require('./lib/initStores');
  GlobalLock.release(DATABASES_LOCK);
});

/**
 * Optional development / production helpers
 */

// process.once('SIGUSR2', function() {
//   // Graceful reload testing, for nodemon
//   HttpServer.stop();
// });
// // Better
// process.once('SIGUSR2', function() {
//   gracefulShutdown(function() {
//     process.kill(process.pid, 'SIGUSR2');
//   });
// });

// process.on('SIGHUP', function () {
//   console.log('Got SIGHUP signal.');
// });
