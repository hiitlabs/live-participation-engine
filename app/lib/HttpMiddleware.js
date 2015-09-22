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
 * Common Express (or Connect) http app
 */

var debug = require('debug')('io:HttpMiddleware'); debug('module loading');
var console = require('./Logger')('io:HttpMiddleware');

/**
 * Dependencies
 */

var DataStore = require('./DataStore');
var GlobalLock = require('./GlobalLock');
var join = require('path').join;
var express = require('express');
var DirtyStore = require('./connect-dirty')(express);
var HttpRouter = require('./HttpRouter');
var SiteConfig = require('./SiteConfig');
var DEV = require('./DEV');

/**
 * Exports
 */

var HttpMiddleware = {

  app: express(),

  // Expose sessionstore
  sessionStore: new DirtyStore({db: DataStore.sessiondb}),

  // Parse cookie, export to use in socket connections too
  cookieParser: express.cookieParser(SiteConfig.COOKIESECRET),

  // Create or fetch session, export to use in socket connections too
  sessionGetter: null
};

// TODO think how to reduce dependency of SiteConfig.SITEROUTE to allow site renames
// TODO perhaps use req.path rewrites cleverly, or just let users login again
HttpMiddleware.sessionGetter = express.session({
  key: SiteConfig.COOKIEKEY,
  cookie: {
    path: '/' + SiteConfig.SITEROUTE,
    httpOnly: true,
    maxAge: 180 * 24 * 60 * 60 * 1000
  },
  store: HttpMiddleware.sessionStore
});

var app = HttpMiddleware.app;

app.disable('x-powered-by');
// When behind load balancer, trust X-Forwarded-* headers (req.ip, req.protocol etc)
if (SiteConfig.TRUST_PROXY) {
  app.enable('trust proxy');
}

/**
 * Common HTTP middleware (in req processing order)
 */

// Loggers
if (DEV) {
  if (debug.enabled)
    app.use(function(req, res, next) {
      debug('incoming http request %s', req.url);
      res.once('finish', function() {
        debug('RES finish %s', req.url);
      });
      next();
    });
  app.use(express.logger('dev'));
} else {
  //app.use(express.logger());
  // A simple adapter for logging, TODO print properties
  app.use(express.logger({
    stream: {
      write: function(str) {
        console.info(str);
      }
    }
  }));
}

// Request staller (during start and recompiling modules)
// Important for sessiondb loading, for example.
// TODO move stalling earlier to HttpServer if possible
app.use(function(req, res, next) {
  if (GlobalLock.ready) {
    next();
  } else {
    debug('buffering request');
    // Beware! This will quickly gather a backlog of hundreds of requests
    // and the event emitter will be very busy when when the event eventually emits.
    GlobalLock.once('ready', next);
  }
});

// Return favicon request early
// This route is never triggered in a mounted application, only on dev.
if (DEV) {
  app.use(function(req, res, next) {
    if (req.url == '/favicon.ico') {
      res.writeHead('404'); // or 204
      res.end();
      return;
    }
    next();
  });
}

// Allow custom routes for blocks before cookie parsing
app.use(HttpRouter.middleware);

// Parse cookie, exported to use in socket connections too
app.use(HttpMiddleware.cookieParser);

// Create or fetch session, exported to use in socket connections too
app.use(HttpMiddleware.sessionGetter);

// Parse form POSTs (equivalent to app.use(express.bodyParser()) )
app.use(express.json());
app.use(express.urlencoded());
// Disabled for now, allows filling the disk with temp files if not handled separately.
// Enable for specific routes only.
//app.use(express.multipart({uploadDir: '', limit: '5mb'}));

// Gzip responses
// Disabled for now, the assets will be served gzipped already and index.html is not so large.
//app.use(express.compress({}));

// Catch urls that express can't handle
// https://github.com/mozilla/browserid/issues/2887
app.use(function(req, res, next) {
  var result;
  try {
    result = decodeURIComponent(req.url);
  } catch (e) {}
  if (!result) {
    debug('invalid url requested: %s', req.url);
    res.send(404);
    return;
  }
  next();
});

// Serve gzipped .css.gz and .js.gz without compressing again.
// This is optimistic: if the path does not exist, the request will fall through the routes and static middleware;
// in that case the added headers are removed later below so that the error response can be understood.
// One could also infer accepted gzip from req headers and alter url to include the gzipped asset.
// Here we default to gzip in any case (some corporate proxies can strip accept-encoding headers, but should
// understand gzipped responses still).
// Uses '.gz_' as latest IE11 and old Safaris confuse .gz and content-encoding headers.
app.use(function(req, res, next) {
  var path = req.path;
  if (path.slice(-4) !== '.gz_') {
    return next();
  }
  if (path.slice(-7) == '.js.gz_') {
    res.set('Content-Encoding', 'gzip');
    res.set('Content-Type', 'application/javascript; charset=UTF-8');
    return next();
  }
  if (path.slice(-8) == '.css.gz_') {
    res.set('Content-Encoding', 'gzip');
    res.set('Content-Type', 'text/css; charset=UTF-8');
    return next();
  }
  next();
});

// Route requests to channels
//app.use(app.router);
app.use('/' + SiteConfig.SITEROUTE, app.router); // TODO app.router() for v4.0

// Serve static files, such as blocktype builds, from public dir
var oneDay = 24 * 60 * 60 * 1000;
app.use('/' + SiteConfig.SITEROUTE, express['static'](join(__dirname, '..', '..', 'public'), {maxAge: oneDay}));

// Not Found
/** /
app.use(function(req, res, next){
  res.statusCode = 404;

  // respond with html page
  if (req.accepts('html')) {
    if ('HEAD' == req.method) return res.end();
    res.send('Cannot ' + req.method + ' ' + utils.escape(req.originalUrl));
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});
/**/

// If falls through the static middleware, reverse the added headers
app.use(function(req, res, next) {
  var path = req.path;
  if (path.slice(-4) !== '.gz_') {
    return next();
  }
  if (path.slice(-7) == '.js.gz_') {
    res.removeHeader('Content-Encoding');
    res.removeHeader('Content-Type');
    return next();
  }
  if (path.slice(-8) == '.css.gz_') {
    res.removeHeader('Content-Encoding');
    res.removeHeader('Content-Type');
    return next();
  }
  next();
});

//Error handlers
if (DEV) {
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
  express.errorHandler.title = 'io';
} else {
  app.use(function(err, req, res, next) {
    if (err.status) res.statusCode = err.status;
    if (res.statusCode < 400) res.statusCode = 500;
    console.error(err);
    if (res.headerSent) { // TODO res.headersSent for v4.0
      console.error('headers already sent, destroying socket');
      return req.socket && req.socket.destroy();
    }
    res.send(res.statusCode);
  });
}

module.exports = HttpMiddleware;
