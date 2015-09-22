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

var debug = require('debug')('io:ChannelConstructorEio'); debug('module loading');
var console = require('../lib/Logger')('io:ChannelConstructorEio');

var connDebug = require('debug')('io:connDebug');

/**
 * Dependencies
 */

var SiteConfig = require('../lib/SiteConfig');
var HttpServer = require('../lib/HttpServer');
var HttpMiddleware = require('../lib/HttpMiddleware');
var engine = require('engine.io');
var GlobalLock = require('../lib/GlobalLock');
var UserStore = require('../lib/UserStore');
var rpc = require('../lib/rpc');
var DEV = require('../lib/DEV');

/**
 * Exports a setup function
 */

exports = module.exports = setup;

function setup(channel) {

  channel.beforeEioSocketConnection = beforeEioSocketConnection.bind(channel);

  channel.parseHttpSession = parseHttpSession;

  channel.onEioSocketConnection = onEioSocketConnection;

  // Channels have eioSockets/clientWindows/httpSessions/users
  createEioSocketServer(channel);
}

function createEioSocketServer(channel) {
  var eio = channel.eio = attachEioServer(HttpServer, {
    // Config could be customized for each channel type (screen, control, web etc)
    pingInterval: 25000, // Orig 60000
    pingTimeout: 60000, // Set separately on client to 10000
    transports: ['polling', 'websocket'], //['polling', 'websocket', 'flashsocket']
    //allowUpgrades: false,
    cookie: false,
    path: '/' + SiteConfig.SITEROUTE + '/' + channel.config.channelRoute + '/_io',
    // Let's not destroy unhandled upgrades for now, should not be too much overhead for now
    destroyUpgrade: false,
    destroyUpgradeTimeout: 10000
  });

  // Rename engine.io clients to eioSockets, and define clients as windows or something
  channel.eioSockets = eio.clients;

  // TODO move this to some kind of middleware chain similarly to http
  eio.on('connection', channel.beforeEioSocketConnection);
};

/**
 * Engine.io intercepting /site/channel/_io
 */

// Moved eio attach method here for debugging:
function attachEioServer(HttpServer, options) {
  var eioServer = new engine.Server(options);
  options = options || {};
  var path = (options.path || '/engine.io').replace(/\/$/, '');

  var destroyUpgrade = (options.destroyUpgrade !== undefined) ? options.destroyUpgrade : true;
  var destroyUpgradeTimeout = options.destroyUpgradeTimeout || 1000;

  // normalize path
  path += '/';

  function check(httpRequest) {
    return path == httpRequest.url.substr(0, path.length);
  }

  // cache and clean up listeners
  var listeners = HttpServer.listeners('request').slice(0);
  HttpServer.removeAllListeners('request');
  HttpServer.on('close', eioServer.close.bind(eioServer));

  // add request handler
  HttpServer.on('request', function(httpRequest, httpResponse){
    if (check(httpRequest)) {
      if (connDebug.enabled) logHttpRequest(httpRequest, httpResponse);
      //debug('intercepting request for path "%s"', path);
      eioServer.handleRequest(httpRequest, httpResponse);
    } else {
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].call(HttpServer, httpRequest, httpResponse);
      }
    }
  });

  if(~eioServer.transports.indexOf('websocket')) {
    HttpServer.on('upgrade', function(httpRequest, socket, head) {
      if (check(httpRequest)) {
        if (connDebug.enabled) logHttpUpgrade(httpRequest, socket, head);
        eioServer.handleUpgrade(httpRequest, socket, head);
      } else if (false !== options.destroyUpgrade) {
        setTimeout(function() {
          if (socket.writable && socket.bytesWritten <= 0) {
            // If no eio server has handled the request, end the socket.
            return socket.end();
          }
        }, options.destroyUpgradeTimeout);
      }
    });
  }

  return eioServer;
}

function logHttpRequest(httpRequest, httpResponse) {
  connDebug('EIO REQUEST in: %s, %s, %j', httpRequest.socket.debugId, httpRequest.url, httpRequest.headers);
  var url = httpRequest.url; // Save if altered
  httpResponse.once('finish', function() {
    connDebug('EIO RES finish: %s, %s, %j', httpRequest.socket.debugId, url, httpResponse._header);
  });
}

function logHttpUpgrade(httpRequest, socket, head) {
  connDebug('EIO UPGRADE REQ in: %s, %s, %j', httpRequest.socket.debugId, httpRequest.url, httpRequest.headers);
  var url = httpRequest.url;
}

function beforeEioSocketConnection(eioSocket) {
  // TODO move stalling earlier to HttpServer
  if (GlobalLock.ready) {
    this.onEioSocketConnection(eioSocket);
  } else {
    this.debug('GlobalLock not ready, stalling connection');
    var self = this;
    // Note: Could create a large backlog of closures
    GlobalLock.once('ready', function() {
      self.onEioSocketConnection(eioSocket);
    });
  }
};

/**
 * Utilize same cookie parser and session getter from the express side on sockets
 */

function parseHttpSession(httpRequest) {

  // This is sort of an hack, but works fine for now.

  // Utilize the same cookie parser from express side
  // Populates req.secret, req.cookies, req.signedCookies.
  HttpMiddleware.cookieParser(httpRequest, null, function(err) {
    // Note that this callback is sync, so control flow goes here directly
    if (err) {
      //error parsing cookies, reload etc
      console.error('Error parsing cookies from socket connection.');
    }
  });
  if (!httpRequest.secret || !httpRequest.cookies || !httpRequest.signedCookies) {
    console.error('Error parsing cookies from socket connection (2).');
    return;
  }

  // There are several ways to get the httpSessionId
  //var httpSessionId = req.signedCookies[SiteConfig.COOKIEKEY];
  // TODO bypass express session middleware and just use sessionId directly

  // Here utilize the same session getter from express side
  // Mock the required variables
  // NOTE this is fraqile, as session middleware internals can change
  httpRequest.originalUrl = httpRequest.url;
  var httpResponse = {};
  httpResponse.on = function() {};
  // Populates req.session and req.sessionID
  HttpMiddleware.sessionGetter(httpRequest, httpResponse, function(err) {
    // Note that this callback is sync for now, so control flow goes here directly
    if (err) {
      console.error('Error getting session from socket connection.');
    }
  });
  if (!httpRequest.session || !httpRequest.sessionID) {
    console.error('Error getting session from socket connection (2).');
    return;
  }

  // NOTE! If the session is expired or the cookies are not present, we should
  // reload the page as setting a cookie via engine.io is of course not reliable.
  // Current express session parser will generate a new session if not existing.

  // Get req.user (same code as in onBeforeRequest)

  if (httpRequest.session.userId) {
    this.debug('found userId in httpSession');
    httpRequest.user = UserStore.getUser(httpRequest.session.userId);
    if (!httpRequest.user) {
      if (DEV) {
        throw new Error('userid not found, clear both dbs in development');
      } else {
        console.error('userid not found, clear both dbs in development');
      }
    }
  } else {
    this.debug('not found userId in httpSession, not creating a new user via socket only');
    // NOTE! We are in socket handler, if user is not found, would be better to
    // resort to html reload etc as the user is first created there. But beware of reload loops.
  }
};

function onEioSocketConnection(eioSocket) {
  this.debug('new eioSocket %s', eioSocket.id);

  eioSocket.rpc = rpc.sendSingle;

  // Workaround engine.io bug: socket.request can be sometimes undefined.
  // When an already upgraded websocket request comes in, socket.request
  // can be undefined due to engine.io internals.
  if (!eioSocket.request) {
    this.debug('incoming socket without socket.request, searching from websocket upgrade');
    if (eioSocket.transport && eioSocket.transport.socket && eioSocket.transport.socket.upgradeReq) {
      this.debug('upgrade request found, setting to transport');
      // eioSocket.request is a getter, so let's set its target instead
      eioSocket.transport.request = eioSocket.transport.socket.upgradeReq;
    }
  }

  if (!eioSocket.request) {
    this.debug('incoming socket without socket.request, so closing');
    // Just close to be able to reconnect on background
    eioSocket.close();
    return;
  }

  this.debug('query: %j', eioSocket.request.query);
  this.debug('path: %s', eioSocket.request.url);

  // populate socket.request.sessionId, socket.request.session, socket.request.user etc
  this.parseHttpSession(eioSocket.request);

  // TODO refactor session parsing in layers
  if (!eioSocket.request.session) {
    return;
  }
  this.debug('httpSession: %j', eioSocket.request.session);

  if (!eioSocket.request.user) {
    //this.debug('incoming socket without socket.request.user, so reloading client to get one');
    this.debug('incoming socket without socket.request.user, client should enable cookies and reload manually');
    eioSocket.rpc('core.$close', 'Please enable cookies in your browser.');
    return;
  }

  if (this.type == 'control' || this.type == 'stage') {
    if (SiteConfig.CONTROLPIN.length !== 0 && !eioSocket.request.session.isAdmin) {
      console.error('Unauthorized socket access.');
      return;
    }
  }

  // Save shortcuts for use in rpc methods, for example
  eioSocket.channel =  this;
  eioSocket.httpSession = eioSocket.request.session;

  // TODO organize these
  var user = eioSocket.request.user;
  user.handleNewEioSocket(eioSocket);

  // TODO temporary hack to send something to client to prevent ipad stalling
  setTimeout(function() {
    eioSocket.rpc('core.$getInfo');
  }, 1000);

  var channelFrontendConfig = this.getChannelFrontendConfigForUser(user);

  // site channelConfig is sent with html, but possibly send update here if reconnect after sleep etc.
  this.debug('sending channelFrontendConfig');
  eioSocket.rpc('core.$setConfig', channelFrontendConfig);
  // Alternatively get current config via RPC request from clientWindow, but it is better to have it already on load

  // All messages are interpreted as RPC calls, no multiplexing
  // Add possible rate/size-limiting here
  eioSocket.on('message', function(messageStr) {
    debug('messageStr %s', messageStr);
    // check GlobalLock here in case live sockets used during async build
    if (GlobalLock.ready) {
      rpc.parse(eioSocket, messageStr);
    } else {
      // Beware! This will quickly gather a backlog of hundreds of messages
      // and the event emitter will be very busy when when the event eventually emits.
      // TODO check that cannot fail if socket is destroyed in the meantime etc
      GlobalLock.once('ready', function() {
        rpc.parse(eioSocket, messageStr);
      });
    }
  });

  eioSocket.on('close', function(reason) {
    debug('close %s', reason);
  });

  eioSocket.on('error', function(err) {
    console.error('socket error: %s', err);
  });
};
