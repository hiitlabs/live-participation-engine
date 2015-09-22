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
 * User constructor
 */

var debug = require('debug')('io:UserConstructor'); debug('module loading');
var console = require('./Logger')('io:UserConstructor');
var invariant = require('./utils/invariant');

/**
 * Dependencies
 */

var SiteConfig = require('./SiteConfig');
var HttpMiddleware = require('./HttpMiddleware');
var useragent = require('useragent');
var DataStore = require('./DataStore');
var db = DataStore.namespace('UserConstructor');

var base64id = require('base64id');
function uid() {
  return 'u' + base64id.generateId().slice(0, 10);
}

// Actual instances are only available after nextTick
var BlockStore = require('./BlockStore');
var UserStore = require('./UserStore');

var Events = require('./Events'); // event bus is needed for update signaling
// TODO perhaps better to signal via UserStore collection etc

/**
 * Exports a user constructor
 */

exports = module.exports = UserConstructor;

exports.createUserFromHttpRequest = function(httpRequest) {
  var configOut = {};
  configOut.id = db.getUniqueId();
  debug('generated new id %s', configOut.id);
  var user = new UserConstructor(configOut);
  // Parse user agent and save to session and user.
  user.addHttpSessionFromHttpRequest(httpRequest);
  user.save();
  return user;
};

exports.createUserFromDefaultConfig = function(userConfig) {
  var validConfig = {};
  validConfig.id = db.getUniqueId();
  debug('generated new id %s', validConfig.id);
  validConfig.personas = {
    networkingCode: userConfig.networkingCode,
    username: userConfig.username,
    networkingType: userConfig.networkingType
  };
  var user = new UserConstructor(validConfig);
  // Parse user agent and save to session and user.
  //user.addHttpSessionFromHttpRequest(httpRequest);
  user.save();
  return user;
};

exports.loadUser = function(id) {
  debug('loadUser called: %s', id);
  var config = db.get(id);
  if (!config) {
    debug('config not found: %s', id);
    return;
  }
  // Do schema migration here if you really need
  return new UserConstructor({
    id: id,
    config: config,
    httpSessionIds: db.get(id + 'httpSessionIds'),
    personas: db.get(id + 'personas'),
    networkIds: db.get(id + 'networkIds')
  });
};

UserConstructor.prototype.save = function() {
  debug('saving instance %s', this.id);
  db.set(this.id, this.config);
  db.set(this.id + 'httpSessionIds', this.httpSessionIds);
  db.set(this.id + 'personas', this.personas);
  db.set(this.id + 'networkIds', this.networkIds);
  return this;
}

// There will be a few hundred users at most

function UserConstructor(options) {
  if (!(this instanceof UserConstructor)) return new UserConstructor(options);
  options = options || {};
  this.config = options.config || {};

  invariant(options.id, '.id required.');
  this.id = options.id;

  // Persistent
  this.httpSessionIds = options.httpSessionIds || [];
  this.personas = options.personas || {};
  // Save a global username for now (could differentiate between web and
  // control, for example)
  if (!this.personas.userpin) {
    this.personas.userpin = '';
  }
  if (!this.personas.networkingCode) {
    this.personas.networkingCode = '';
  }
  if (!this.personas.username) {
    //this.personas.username = '' + this.id;
    this.personas.username = '';
  }
  if (!this.personas.groupId) {
    //this.personas.groupId = ''
  }
  if (!this.personas.networkingType) {
    //this.personas.networkingType = 'user';
  }
  if (!this.personas.hidden) {
    //this.personas.hidden = false;
  }
  // TODO structure
  this.networkIds = options.networkIds || [];

  // Non-persistent defaults
  this.httpSessions = {};
  //this.clientWindows = {};
  this.eioSockets = {};

  // ensure sessiondb loaded
  invariant(HttpMiddleware.sessionStore.db.loaded, 'sessiondb not yet ready');

  this.httpSessionIds.forEach(function(httpSessionId) {
    // TODO It might be pointless to fetch the session -- perhaps better would be to
    // define a getter that would get a fresh session object whenever needed to
    // avoid race conditions in express vs eioSockets
    // TODO or even better, make an own session object and use only sessionid via cookies
    var httpSession = HttpMiddleware.sessionStore.get(httpSessionId);
    if (httpSession) {
      httpSession.id = httpSessionId; // TODO for some reason the id is not in the session object itself?
      this.httpSessions[httpSessionId] = httpSession;
    }
  }, this);

  // Init clientWindows and eioSockets only on demand
}


UserConstructor.prototype.addHttpSessionFromHttpRequest = function(httpRequest) {
  var httpSession = httpRequest.session;

  // NOTE httpRequest must come from express, so that used helpers are there
  var agent = useragent.lookup(httpRequest.get('user-agent'));

  // TODO some of these, such as ip, may be interesting when changed (wifi vs 3g)
  httpSession.info = {
    userAgent: httpRequest.get('user-agent'),
    langs: httpRequest.acceptedLanguages,
    browser: agent.toAgent(),
    os: agent.os,
    device: agent.device,
    referrer: httpRequest.get('referrer'), // or httpRequest.headers
    ip: httpRequest.ip, // or httpRequest.connection.address(), can be different later when mobile
    protocol: httpRequest.protocol,
    targetHost: httpRequest.host,
    targetPath: httpRequest.path // or httpRequest.url
  };
  //this.debug('source: referrer %s, ip %s, browser %s, os %s, device %s', httpRequest.get('Referrer'), httpRequest.ip, httpRequest.browser, httpRequest.os, httpRequest.device);
  //this.debug('target: protocol %s, domain %s, path: %s, xhr %s, spdy %s', httpRequest.protocol, httpRequest.host, httpRequest.path, httpRequest.xhr, httpRequest.spdyVersion);
  //Sometimes behind proxy:
  //httpRequest.header('x-real-ip') + ':' + httpRequest.header('x-real-port')

  // Save to httpSession
  httpSession.userId = this.id;
  httpSession.save();

  console.info('new httpSession info: %j', httpSession.info);

  // Save to user.sessions and sessionIds
  if (!httpSession.id) {
    console.error('httpSession id missing');
    return;
  }
  if (this.httpSessions[httpSession.id]) {
    console.error('httpSession %s already in collection', httpSession.id);
    return;
  }
  this.httpSessions[httpSession.id] = httpSession;
  this.httpSessionIds.push(httpSession.id);
};
// TODO remove session? Perhaps always better to mark an invalid session as invalid.
// Banning users, for example.

UserConstructor.prototype.handleNewEioSocket = function(eioSocket) {

  // TODO Could limit flooding requests here or lower in the stack

  eioSocket.user = this;

  // Cast to string
  var cid = '' + eioSocket.request.query.cid;
  // TODO check whether cid could become null in reconnects, for example, thus linking tabs
  eioSocket.clientWindowId = this.id + cid.substr(0, 10);
/*
  // TODO think whether to use clientWindows or only clientWindowIds, or not even them,
  if (this.clientWindows.hasOwnProperty(clientWindowId)) {
    // Existing clientWindow
    eioSocket.clientWindow = this.clientWindows[clientWindowId];
  } else {
    // New clientWindow, check session/channel limits
    //user.clientWindows.web
    //eioSocket.clientWindow = ClientWindow({id: clientWindowId});
    //this.clientWindows[clientWindowId] = eioSocket.clientWindow;
  }
*/

//  eioSocket.clientWindow.sockets[eioSocket.id] = eioSocket;
//  eioSocket.clientWindow.connectionCount = eioSocket.clientWindow.connectionCount|0 + 1;
  // Add possible rate-limiting here

  // There are different kinds of connections:
  // eioSocket.request.connection == eioSocket.transport.request.connection,
  // eioSocket.transport, .upgraded, .readyState
  // eioSocket.transport.socket, eioSocket.transport.dataReq, eioSocket.transport.socket._socket etc
  //var connection = eioSocket.request.connection;
  //socket.bufferSize, .remoteAddress .remotePort, .bytesRead, .bytesWritten
  //this.debug('connection %j', eioSocket.request.connection.address());


  // New sockets for same httpSession can come from different IP (wifi vs 3g)
  eioSocket.ip = eioSocket.request.connection.address();

  // Ensure limits

  console.info('new eioSocket:', eioSocket.ip, eioSocket.user.id, eioSocket.clientWindowId);

  // Enumerate user eioSockets and ask to close some other sockets, if existing
  for (var existingSocketKey in this.eioSockets) {
    //console.log(this.eioSockets)
    // TODO or get from real eioSockets collection?
    var existingSocket = this.eioSockets[existingSocketKey];

    if (existingSocket.clientWindowId == eioSocket.clientWindowId) {
      console.info(
        'existing socket in same clientWindow'
      );
      // TODO beware ping pong effect
      // And it is no use asking the client in same window to close, it may even
      // affect the new one
      // Beware, might somehow kill an existing tab on background reconnect or something
      //existingSocket.rpc('core.$close', 'Connection overlap.');
      // But could perhaps fasten the timeout of obsolete socket
    } else {

      if (existingSocket.channel.id == eioSocket.channel.id) {
        console.info('existing socket on this channel found');
        if (eioSocket.channel.type !== 'screen') {
          console.info('sending core.$close');
          // Cannot close the socket from the server side, as that would initiate
          // reconnect. But of course socket can be destroyed and sessionId blacklisted
          // for future sockets, etc
          // TODO send signal instead to allow translations
          existingSocket.rpc('core.$close', 'Opened in another tab.');
        }
      }
    }
  }

  // Persona management
  if (this.personas[eioSocket.channel.id]) {
    // existing persona
  } else {
    // new persona?
    this.personas[eioSocket.channel.id] = {
      id: this.id + ':' + eioSocket.channel.id,
      //username: null
      //avatar:
      //url:
      //linkedIn, fb
      //twitter:
    };
  }
  // TODO in case persona added, persist with
  //this.save();
  // If this is too chatty, make more specific save

  eioSocket.persona = this.personas[eioSocket.channel.id];

  this.eioSockets[eioSocket.id] = eioSocket;
  var self = this;
  eioSocket.on('close', function(reason) {
    console.info('socket %s close %s', eioSocket.id, reason);
    delete self.eioSockets[eioSocket.id];
    // TODO eventing when needed
  });

  //if (debug.enabled) {
  addDebugLoggerToEioSocket(eioSocket);
  //}
  // TODO if needed
  //addDataEventListenersToEioSocket(eioSocket);

  // announce socket to core block for counting
  // Could be done via Events bus or via UserStore collection too
  //Events.emit('UserStore:' + eioSocket.channel.id + ':count', eioSocket.server.clientsCount);
  BlockStore._blocks.core.__addEioSocket(eioSocket);
};

function addDebugLoggerToEioSocket(eioSocket) {
  eioSocket.on('open', function() {
    console.info('eioSocket %s open', eioSocket.id);
  });
  eioSocket.on('upgrade', function(transport) {
    console.info('eioSocket %s upgraded to %s', eioSocket.id, transport && transport.name);
  });
  eioSocket.on('error', function(err) {
    console.warn('eioSocket %s error: %s', eioSocket.id, err);
  });
}

function addDataEventListenersToEioSocket(eioSocket) {
  eioSocket.packetsIn = 0;
  eioSocket.packetsOut = 0;
  eioSocket.dataIn = 0;
  eioSocket.dataOut = 0;

  eioSocket.on('packet', function(packet) {
    debug('packet in: %j', packet);
    ++eioSocket.packetsIn;
    if (packet.data) {
      var dataIn = packet.data.length;
      eioSocket.dataIn += dataIn;
    }
  });
  eioSocket.on('packetCreate', function(packet) {
    debug('creating out: %j', packet);
  });
  eioSocket.on('flush', function(data) {
    debug('flushing out: %j', data);
    eioSocket.packetsOut += data.length;
    for (var i = 0, dataOut; i < data.length; ++i) {
      dataOut = data[i].data || 0;
      if (dataOut) {
        eioSocket.dataOut += dataOut.length;
      }
    }
  });
  eioSocket.on('drain', function() {
    debug('flushed out');
  });
}

// X-Real-IP or X-Forwarded-For

function generateNetworkingCode() {
  //var networkingCode = db.get('currentNetworkingCode') || 100;
  //networkingCode = networkingCode + 3; // TODO + Math.random
  var networkingCode = (Math.random() * 10000)|0; // 4 digits
  //db.set('currentNetworkingCode', networkingCode|0);
  //if (networkingCode <= 9999) {
  networkingCode = ('0000' + networkingCode).slice(-4);

  var found = false;
  for (var userId in UserStore._users) {
    var user = UserStore._users[userId];
    if (user.personas.networkingCode === networkingCode) {
      found = true;
      break;
    }
  }
  if (!found) {
    return networkingCode;
  } else {
    return generateNetworkingCode();
  }
}

UserConstructor.prototype.__setUserpin = function(userpin) {
  // TODO these are currently in core block
  // TODO prevent duplicates if needed
  // TODO check if existing user has such a pin, then combine these users
  // if userpin is rolename then duplicates are asked for
  if (this.personas.userpin === userpin) {
    return;
  }

  this.personas.userpin = userpin;

  if (!this.personas.networkingCode) {
    // TODO move to UserStore or somewhere
    var networkingCode = generateNetworkingCode();
    this.personas.networkingCode = networkingCode;
  }

  //this.personas.networkingCode = ('' + userpin).substring(0,4);
  this.save();
  // Announce to user list etc
};

UserConstructor.prototype.__setUsername = function(username) {
  // TODO prevent duplicates if needed
  // if username is rolename then duplicates are asked for
  if (this.personas.username === username) {
    return;
  }

  this.personas.username = username;
  this.save();
  // Announce to user list etc
};

UserConstructor.prototype.__setGroupId = function(groupId) {
  if (this.personas.groupId === groupId) {
    return;
  }

  this.personas.groupId = groupId;
  this.save();
};

UserConstructor.prototype.__addToNetwork = function(otherUser) {
  if (this.networkIds.indexOf(otherUser.id) !== -1) {
    return false;
  }
  this.networkIds.push(otherUser.id);
  if (otherUser.personas.networkingType === 'company') {
    this.log('newContact2');
  } else {
    this.log('newContact');
  }
  this.save();

  otherUser.networkIds.push(this.id);
  if (otherUser.personas.networkingType === 'company') {
    otherUser.log('newContact2');
  } else {
    otherUser.log('newContact');
  }
  otherUser.save();

  return true;
}
// RemoveConnection

UserConstructor.prototype.__networkToWire = function() {
  // TODO move
  //console.log(this.networkIds)
  var out = {};
  //for (var i = 0; i < this.networkIds.length; i++) {
  for (var i = this.networkIds.length - 1; i >= 0; i--) {
    var otherUser = UserStore.getUser(this.networkIds[i]);
    if (!otherUser) continue; // Or check 'removed' flag
    out[otherUser.id] = {
      id: otherUser.id,
      username: otherUser.personas.username,
      points: otherUser.personas.points,
      type: otherUser.personas.networkingType
      // hidden
    };
  }
  //console.log(out)
  return out;
};

// TODO activity/event logging with persistence
UserConstructor.prototype.log = function(a, b, c, d, e, f) {
  if (this.logListeners) {
    for (var i = 0; i < this.logListeners.length; i++) {
      this.logListeners[i](a, b, c, d, e, f);
    }
  }

  //TODO for now, calculate points already here
  if (!this.personas.points) this.personas.points = 0;

  if (a === 'newMessage') {
    this.personas.points = this.personas.points + 1;
  } else
  if (a === 'newMessageInvert') {
    this.personas.points = this.personas.points - 1;
  } else
  if (a === 'newVote') {
    this.personas.points = this.personas.points + 1;
  } else
  if (a === 'newRatingMsg') {
    this.personas.points = this.personas.points + 1;
  } else
  if (a === 'newRatingMsgInvert') {
    this.personas.points = this.personas.points - 1;
  } else
  if (a === 'newRatingVote') {
    this.personas.points = this.personas.points + 1;
  } else
  if (a === 'bonusPoints') {
    this.personas.points = this.personas.points + 3;
  }
  if (a === 'newContact') {
    this.personas.points = this.personas.points + 1; // was 4
  } else
  if (a === 'newContact2') {
    this.personas.points = this.personas.points + 1; // was 15
  }

  this.save();

  if (SiteConfig.POINTS) {
    //TODO for now, publish points already here
    for (var eioSocketId in this.eioSockets) {
      var eioSocket = this.eioSockets[eioSocketId];
      // Send same username to all sockets, all channels for now
      // Perhaps only per channeltype
      eioSocket.rpc('core.$setConfig', {
        points: this.personas.points
      });
    }

    // TODO would be better to compare if really changed and only then push
    BlockStore._blocks.core.publishScoreboard();
  }

  // TODO think about log formats, could create a child console for each user
  console.info(a, b, c, d, e, f);
};

UserConstructor.prototype.listenLog = function(listener) {
  if (!this.logListeners) {
    this.logListeners = [];
  }
  this.logListeners.push(listener);
};
