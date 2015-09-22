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
 * Server module
 */

var debug = require('debug')('io:HttpServer'); debug('module loading');

var console = require('./Logger')('io:HttpServer');

var connDebug = require('debug')('io:connDebug');

/**
 * Dependencies
 */

var HttpMiddleware = require('./HttpMiddleware');

//var read = require('fs').readFileSync;
//var join = require('path').join;
var http = require('http');
//var https = require('spdy'); // spdy works too
//var tlsnappy = require('tlsnappy'); // tlsnappy + spdy

/**
 * Optional HTTPS keys
 */

// var keyDir = join(__dirname, 'keys');
// var httpsOptions = {
//   key: read(join(keyDir, 'spdy-key.pem')),
//   cert: read(join(keyDir, 'spdy-cert.pem')),
//   ca: read(join(keyDir, 'spdy-csr.pem')),
//   ciphers: '!aNULL:!ADH:!eNull:!LOW:!EXP:RC4+RSA:MEDIUM:HIGH'
//   //maxStreams: 15,
//   //windowSize: 1024,
//   //plain: 'spdy/3, //['spdy/3', 'spdy/2', 'http/1.1', 'http/1.0'];
// };

/**
 * Create and export HTTP server
 */

var HttpServer = http.createServer(HttpMiddleware.app);
//var HttpServer = https.createServer(httpsOptions, HttpMiddleware.app); // spdy
//var HttpServer = https.createServer(tlsnappy.Server, httpsOptions, HttpMiddleware.app); // tpsnappy + spdy
HttpServer.on('listening', function() {
  console.info('Listening on %j in %s mode', HttpServer.address(), HttpMiddleware.app.settings.env);
});
HttpServer.on('close', function() {
  debug('Server closed, closing dbs');
  // Append-only files should be quite fine without these too
  //if (db.flushing || db._queue.length) console.error('db not flushed!');
  //if (sessiondb.flushing || sessiondb._queue.length) console.error('sessiondb not flushed!');
  //db._writeStream.end();
  //sessiondb._writeStream.end();
});
//HttpServer.on('error', function() { });
//HttpServer.connections
//HttpServer.maxConnections

// TODO additional reporting
// TODO one could add an identifier to every socket
// TODO perhaps move the attach(server) method https://github.com/LearnBoost/engine.io/blob/master/lib/engine.io.js
// that is now used in channel instantiation to here and handle manually, to keep track of everything

var base64id = require('base64id');
function uid() {
  return 's' + base64id.generateId().slice(0, 10);
}

// TODO move lockSet buffering from eio and http middleware to connection handler
// instead of stalling early requests there

if (connDebug.enabled) {

  HttpServer.on('connection', function(socket) {
    //console.log(Object.keys(socket._handle.fd))
    //console.log(socket._handle.fd)

    socket.debugId = uid();
    connDebug('SOCKET in: %s', socket.debugId);
    //socket.setNoDelay(true);
    //socket.setKeepAlive(true, 10*1000)
    //socket.setTimeout(2*60*1000)
    socket.on('end', function() {
      connDebug('SOCKET end: %s, %j', socket.debugId, arguments);
    });
    socket.on('close', function() {
      connDebug('SOCKET close: %s, %j', socket.debugId, arguments);
    });
    socket.on('error', function() {
      connDebug('SOCKET error: %s, %j', socket.debugId, arguments);
    });
    socket.on('finish', function() {
      connDebug('SOCKET finish: %s, %j', socket.debugId, arguments);
    });
    socket.on('drain', function() {
      connDebug('SOCKET drain: %s, %j', socket.debugId, arguments);
    });
  });
  HttpServer.on('connect', function(req) {
    connDebug('REQUEST in: %s', req.socket.debugId);
  });
  // This will be next to express middleware chain
  HttpServer.on('request', function(req, res) {
    connDebug('REQUEST in: %s, %s, %j', req.socket.debugId, req.url, req.headers);
    var url = req.url;
    res.once('finish', function() {
      connDebug('RES finish: %s, %s, %j', req.socket.debugId, url, res._headers);
    });
  });
  HttpServer.on('timeout', function(socket) {
    connDebug('SOCKET timeout: %s', socket.debugId);
    socket.destroy();
  });
}

/**
 * Start / Stop (extending server instance)
 */

var start = HttpServer.start = function(handle) {
  console.info('start called');
  if (start.called || stop.called) return;
  //if (db.loaded && sessiondb.loaded && !waitingForMaster) {
  debug('http server starting');
  start.called = true;
  HttpServer.listen(handle); // Default connection backlog 512 (third listen arg + 1)
};

var stop = HttpServer.stop = function() {
  console.info('stop called');
  if (stop.called) return;
  debug(' -- Closing http server.');
  stop.called = true;
  if (HttpServer._handle) {
    debug('Stop accepting new connections, emits "close" when no connections left.');
    // Beware: Requests can come in via existing keepalive connections! (default timeout 2 min)
    // So in ideal case should start serving with 'Connection: close' headers after this.
    var EXIT_TIMEOUT = 2500;
    var exitTimer = setTimeout(function() {
      console.warn('Exit timeout of %s ms reached, non-clean exit', EXIT_TIMEOUT);
      // We don't have references to open sockets which could be .destroy()ed.
      // This will not trigger server.on('close') listeners.
      process.exit();
    }, EXIT_TIMEOUT);
    var connectionCounter = setInterval(function() {
      //debug('Connections: %s', HttpServer.connections); // server.connections would be sync getter
      HttpServer.getConnections(function(err, count) {
        console.info('Connections: %s', count); // HttpServer.connections would be sync getter
      });
    }, 1000);
    // Remember to always clear all created setIntervals etc on HttpServer.on('close')
    HttpServer.on('close', function() {
      clearInterval(connectionCounter);
      clearTimeout(exitTimer);
    });
    // This would trigger normal process exit if there would not be any connections left.
    HttpServer.close();
    return;
  }
  //setTimeout(function() {
  //  console.error('Hard exit');
  //   process.exit();
  // }, 2500);  // Edge cases (not yet started, already closed by error)
  if (!start.called) {
    console.warn('Trigger exit listerers early (but the dbs may not be ready yet)');
    HttpServer.emit('close');
    return;
  }
  console.warn('Server already closed/closing, do nothing.');
};


// // TODO adopt this nice solution from persona

// const MAX_WAIT_MS = 10000;
// const MAX_NICE_END_MS = 5000;

// function connectionListener(HttpMiddleware) {
//   var connections = [];

//   HttpMiddleware.app.on('connection', function(c) {
//     connections.push(c);
//     c.on('close', function() {
//       var where = connections.indexOf(c);
//       if (where >= 0) connections.splice(where, 1);
//     });
//   });

//   return function(callback) {
//     if (!callback) callback = function(cli) { cli(); };

//     var total_timeout = setTimeout(function() {
//       console.warn(MAX_WAIT_MS + "ms exceeded, going down forcefully...");
//       setTimeout(function() { process.exit(1); }, 0);
//     }, MAX_WAIT_MS);

//     var nice_timeout = setTimeout(function() {
//       console.warn("forcefully closing " + connections.length + " remaining connections...");
//       connections.forEach(function(c) { c.destroy(); });
//     }, MAX_NICE_END_MS);

//     HttpMiddleware.app.on('close', function() {
//       function clearTimeoutsAndCallClient() {
//         clearTimeout(nice_timeout);
//         clearTimeout(total_timeout);
//         callback(function() {
//           console.info("graceful shutdown complete...");
//         });
//       }

//       // if there aren't any open connections, we're done!
//       if (connections.length === 0) clearTimeoutsAndCallClient();

//       connections.forEach(function(c) {
//         c.on('close', function() {
//           if (!HttpMiddleware.app.connections && connections.length === 0) {
//             // once all connections are shutdown, let's call the client
//             // to let him shutdown all his open connections
//             clearTimeoutsAndCallClient();
//           }
//         });
//         c.end();
//       });
//     });
//     HttpMiddleware.app.close();
//   };
// }

// exports.handleTerminationSignals = function(HttpMiddleware, callback) {
//   var gotSignal = false;
//   var terminate = connectionListener(HttpMiddleware.app);
//   function endIt(signame) {
//     return function() {
//       if (gotSignal) return;
//       gotSignal = true;
//       console.warn("SIG" + signame + " received. closing " + HttpMiddleware.app.connections + " connections and shutting down.");
//       terminate(callback);
//     };
//   }

//   if (process.env.SUPPORTS_SIGNALS) {
//     process.on('SIGINT', endIt('INT')).on('SIGTERM', endIt('TERM')).on('SIGQUIT', endIt('QUIT'));
//   }
// };




/**
 * Monitoring connections
 */

// function monitor(msDelay) {
//   msDelay = msDelay || 60*1000;
//   var exec  = require('child_process').exec;
//   function healthMonitor() {
//     //var pid = require('posix').getpgid(0);
//     var pid = process.pid;

//     var child = exec('lsof -p ' + pid + ' -n', function(error, stdout, stderr) {
//       var closeWaitCount = 0, estabCount = 0, tcpCount = 0, totalCount = 0;
//       stdout.split('\n').slice(1,-1).forEach(function(line) {
//         totalCount++;
//         if (!/TCP/.test(line)) return;
//         if (/LISTEN/.test(line)) return;
//         tcpCount++;
//         if (/ESTABLISHED/.test(line)) { estabCount++; return; }
//         if (/CLOSE_WAIT/.test(line)) { closeWaitCount++; return; }
//         // Otherwise log SYN-SENT, SYN-RECEIVED, FIN-WAIT-1, FIN-WAIT-2, CLOSING, LAST-ACK, TIME-WAIT, CLOSED
//         console.log(line);
//       });
//       console.log('TCP/total %s/%s, established %s, close_wait %s', tcpCount, totalCount, estabCount, closeWaitCount);
//     });
//   }
//   healthMonitor();
//   var interval = setInterval(healthMonitor, msDelay);
//   server.on('close', function() {
//     clearInterval(interval);
//   });
// }
// monitor();

/**
 * Useful linux system metric parsing from
 * Node.js test for 1M HTTP Comet connections
 * https://github.com/ashtuchkin/node-millenium
 */

//require('./stats-extra')

// TODO utilize relevant cmds from here:
// http://devo.ps/blog/2013/03/06/troubleshooting-5minutes-on-a-yet-unknown-box.html

module.exports = HttpServer;
