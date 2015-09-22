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
 * Core block
 */

// TODO clarify relation of core block frontends and channel frontends, and
// core block backend and channel backends.

var BLOCKTYPE = require('path').basename(__dirname);

var debug = require('debug')('io:' + BLOCKTYPE); debug('module loading');
var console = require('../../../app/lib/Logger')('io:' + BLOCKTYPE);
var invariant = require('../../lib/utils/invariant');

// for saving CSV-report
var join = require('path').join;
var fs = require('fs');

/**
 * Block dependencies
 */

var SiteConfig = require('../../lib/SiteConfig');

var BlockBuilderSync = require('../../lib/BlockBuilderSync');

var throttle = require('../../lib/utils/throttle');

var DataStore = require('../../lib/DataStore');
var db = DataStore.namespace(BLOCKTYPE);

var rpc = require('../../lib/rpc');

var base64id = require('base64id');
function uid() {
  return 'b' + base64id.generateId().slice(0, 10);
}

// TODO convert underscore dependencies to separate util functions
var _ = require('underscore');

// NOTE: other instances are only available on nextTick due to circular requires
var BlockStore = require('../../lib/BlockStore');
var UserStore = require('../../lib/UserStore');

/**
 * Exports a block constructor
 */
exports = module.exports = CoreBackend;

/**
 * Export static methods
 */
exports.__buildFrontendAssets = function(done) {
  debug('buildFrontendAssets called');
  // TODO refactor api
  BlockBuilderSync(BLOCKTYPE, done);
};

exports.__getFrontendAssetUrlsForChannel = function(channel) {
  var channeltype = channel.type;
  var assets = {
    css: [{
      url: '/' + SiteConfig.SITEROUTE + '/assets/static/css/bootstrap.min.css.gz_'
    }],
    js: [{
      url: '/' + SiteConfig.SITEROUTE + '/assets/core/core-' + SiteConfig.SITELANG + '-' + channeltype + '.min.js.gz_'
    }]
  };
  if (channel.type === 'screen') {
    assets.css.push({
      url: 'http://fonts.googleapis.com/css?family=Open+Sans',
      ext: true
    });
  }
  return assets;
};

// TODO
exports.__getPackageInfo = function() {
  debug('getPackageInfo called');
};

exports.__createBlock = function(configIn) {
  var configOut = {};
  configOut.id = configIn.id; // id must be 'core' for now
  // Add other configurable parameters here
  var block = new CoreBackend(configOut);
  block.save();
  return block;
};

exports.__dangerouslyCreateBlock = function(dangerousFormObject, channels) {
  console.error('should not be called on core');
};

var loaded = false;
exports.__loadBlock = function(id) {
  debug('loadBlock called');
  invariant(!loaded, 'core is singleton for now');
  loaded = true;
  if (!db.get(id)) return;
  return new CoreBackend({
    id: id,
    config: db.get(id),
    frontends: db.get(id + 'frontends')
  });
};

CoreBackend.prototype.save = function() {
  db.set(this.id, this.config);
  db.set(this.id + 'frontends', this.frontends);
  return this;
};

function defaults(obj, props) {
  if (typeof props === 'function') {
    props = props();
  }
  for (var key in props) {
    if (obj[key] === undefined) {
      obj[key] = props[key];
    }
  }
}

function CoreBackend(options) {
  if (!(this instanceof CoreBackend)) return new CoreBackend(options);
  options = options || {};
  invariant(options.id, 'CoreBackend: .id required.');
  this.id = options.id;
  this.type = BLOCKTYPE;
  this.config = options.config || {};
  this.frontends = {};
  // TODO not used properly yet, mostly adding some channel config props
  this.frontends = options.frontends || {};
  defaults(this.frontends, {
    invertColors: false,
    showSiteUrl: true,
    showSocketCount: true,
    showUsernameInput: false
  });

  // Coreblock keeps track of current usercount for now across all channels.
  // These are not persisted, as sockets will be reset in any case when restarting.
  this.socketCount = 0;

  this.rpc = rpc.block;

  // Each block has also live references to its channels.
  this.channels = {};
  // These references are updated when channels are loaded.
}

CoreBackend.prototype.__injectChannel = function(channel) {
  this.channels[channel.id] = channel;
};

CoreBackend.prototype.__getBlockFrontendConfigForChannelUser = function(channel, user) {
  var frontendConfig = {
    id: this.id,
    type: this.type,
  }
  if (user.personas.groupId) {
    frontendConfig.groupId = user.personas.groupId;
  }

  // TODO move
  if (user.personas.userpin) {
    frontendConfig.userpin = user.personas.userpin;
  }
  // networkingCode
  // points
  if (user.personas.username) {
    frontendConfig.username = user.personas.username;
  }
  if (this.type == 'control') {
    frontendConfig.userlist = SiteConfig.USERLIST;
  }
  //if (SiteConfig.EDITING) {
  //  frontendConfig.EDITING = SiteConfig.EDITING;
  //}

  frontendConfig.invertColors = this.frontends.invertColors;
  if (channel.type !== 'web') {
    frontendConfig.socketCount = this.socketCount;
    frontendConfig.showSiteUrl = this.frontends.showSiteUrl;
    frontendConfig.showSocketCount = this.frontends.showSocketCount;
  }
  if (channel.type !== 'screen') {
    frontendConfig.showUsernameInput = this.frontends.showUsernameInput;
  }
  return frontendConfig;
};

CoreBackend.prototype.__getFrontendDataForChannel = function(channel, httpRequest) {
  invariant(false, '__getFrontendDataForChannel not used on core block yet');
};

// Export, Print report
CoreBackend.prototype.$printReport = function(req, clientTime) {
  if (req.channel.type !== 'control') return;

  // Use only control channel for now
  if (typeof req.channel.getBlockReports !== 'function') {
    console.warn('getBlockReports not implemented');
    return;
  }

  var report = req.channel.getBlockReports(clientTime);
  //var report = BlockStore.getReport();
  if (!report) {
    console.warn('$printReport() not succeeded');
    return;
  }

  var reportCSV = '';
  var reportCSVURL = '/' + SiteConfig.SITEROUTE + '/assets/report.csv';
  if (SiteConfig.SHOW_CSV_EXPORT) {
    if (typeof req.channel.getBlockReportsCSV !== 'function') {
      console.warn('getBlockReportsCSV not implemented');
    } else {
      reportCSV = req.channel.getBlockReportsCSV(clientTime);
    }
  }

  // Experiment with user report
  if (false) {
    report += Object.keys(UserStore._users).map(function(userId) {
      var user = UserStore._users[userId];
      // config,id,httpSessionIds,personas,networkIds,httpSessions,eioSockets
      //return Object.keys(user.personas);
      return 'USERID=' + user.id +
        (user.personas.userpin ? ' PIN=' + user.personas.userpin : '') +
        (user.personas.networkingCode ? ' CODE=' + user.personas.networkingCode : '') +
        (user.personas.username ? ' USERNAME=' + user.personas.username : '') +
        (typeof user.personas.points !== 'undefined' ? ' POINTS=' + user.personas.points : '') +
        (user.personas.control ? ' CONTROL' : '') +
        (user.personas.screen ? ' SCREEN' : '') +
        (user.personas.stage ? ' STAGE' : '') +
        '';
    }).join('\n') + '\n';
  }

  console.info({
    userId: req.user.id,
    channelId: req.channel.id
  }, '$printReport');

  // csv file serving goes here
  var csvPath = join(__dirname, '../../../public/assets/report.csv');
  fs.writeFile(csvPath, reportCSV, function (error) {
    if (error) console.warn('Error saving report.csv: %s', error);
    req.reply(null, report, reportCSVURL);
  });

};


// Some sitewide controls

CoreBackend.prototype.$invertColors = function(req, invertColors) {
  if (req.channel.type !== 'control') return;
  invertColors = !!invertColors;
  if (this.frontends.invertColors !== invertColors) {
    this.frontends.invertColors = invertColors;
    this.save();
    for (var channelId in this.channels) {
      this.rpc(channelId + ':$setConfig', {invertColors: this.frontends.invertColors});
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      invertColors: this.frontends.invertColors
    }, '$invertColors');
  }
};

CoreBackend.prototype.$showSiteUrl = function(req, showSiteUrl) {
  if (req.channel.type !== 'control') return;
  showSiteUrl = !!showSiteUrl;
  if (this.frontends.showSiteUrl !== showSiteUrl) {
    this.frontends.showSiteUrl = showSiteUrl;
    this.save();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {showSiteUrl: this.frontends.showSiteUrl});
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      showSiteUrl: this.frontends.showSiteUrl
    }, '$showSiteUrl');
  }
};

CoreBackend.prototype.$showSocketCount = function(req, showSocketCount) {
  if (req.channel.type !== 'control') return;
  showSocketCount = !!showSocketCount;
  if (this.frontends.showSocketCount !== showSocketCount) {
    this.frontends.showSocketCount = showSocketCount;
    this.save();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {showSocketCount: this.frontends.showSocketCount});
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      showSocketCount: this.frontends.showSocketCount
    }, '$showSocketCount');
  }
};

CoreBackend.prototype.$showUsernameInput = function(req, showUsernameInput) {
  if (req.channel.type !== 'control') return;
  showUsernameInput = !!showUsernameInput;
  if (this.frontends.showUsernameInput !== showUsernameInput) {
    this.frontends.showUsernameInput = showUsernameInput;
    this.save();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'screen') {
        this.rpc(channelId + ':$setConfig', {showUsernameInput: this.frontends.showUsernameInput});
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      showUsernameInput: this.frontends.showUsernameInput
    }, '$showUsernameInput');
  }
};

// userConstructor announces all new sockets to core via this for now
CoreBackend.prototype.__addEioSocket = function(eioSocket) {
  // For now, only web clients are counted as online.
  if (eioSocket.channel.type !== 'web') {
    return;
  }

  this.socketCount++;
  console.info({
    socketCount: this.socketCount
  }, 'socketCount');
  // TODO perhaps avoid creating so many closures
  // TODO more intelligent socket count in userConstructor, now browser refresh
  // may often send two updates, first the closed socket, then the opened socket.
  // Alternatively just use channel.eio.clientsCount or such
  var core = this;
  eioSocket.on('close', function() {
    if (core.socketCount > 0) {
      //delete core.socketIds[socketId];
      core.socketCount--;
      core.sendSocketCountThrottled();
      core.rpc('control:$setSocket', {
        id: eioSocket.id,
        removed: true
      });
      console.info({
        socketCount: core.socketCount
      }, 'socketCount');
    }
  });

  if (!this.sendSocketCountThrottled) {
    this.sendSocketCountThrottled = throttle(this.sendSocketCount, 1000);
  }
  this.sendSocketCountThrottled();

  // Socket info can be sent to control channel, not really used yet.
  this.rpc('control:$setSocket', {
    id: eioSocket.id,
    type: eioSocket.channel.type,
    userId: eioSocket.user ? eioSocket.user.id : ''
  });
};

CoreBackend.prototype.sendSocketCount = function() {
  for (var channelId in this.channels) {
    if (this.channels[channelId].type !== 'web') {
      this.rpc(channelId + ':$setConfig', {socketCount: this.socketCount});
    }
  }
};

CoreBackend.prototype.socketsToWire = function() {
  // NOTE: Does not remember removed sockets, only current ones.
  var out = {};
  for (var channelId in this.channels) {
    var channel = this.channels[channelId];
    for (var socketId in channel.eioSockets) {
      var socket = channel.eioSockets[socketId];
      out[socket.id] = {
        id: socket.id,
        type: channel.type,
        userId: socket.user ? socket.user.id : ''
      };
    }
  }
  return out;
};

/**
 * Blocks will have their server methods in the prototype chain, indicated with $-prefix
 * (or extended there via convenience exposing methods)
 */

// Example, not used.
CoreBackend.prototype.$testServerMethod = function(req, arg1, arg2) {
  debug('test called!');

  if (req.channel.type === 'screen') {
    debug('on screen');
  }

  req.reply(null, 'test ok');

  // NOTE Possibility to test the connection
  //this.rpc('web:$testClientMethod', 'web test');
  //this.rpc('control:$testClientMethod', 'control test');
};

CoreBackend.prototype.$createBlock = function(req, dangerousFormObject) {
  if (req.channel.type !== 'control') {
    console.warn('$createBlock() called from unauthorized channel');
    return;
  }

  if (dangerousFormObject == null || typeof dangerousFormObject !== 'object') {
    console.warn('$createBlock() called with invalid dangerousFormObject');
    return;
  }

  var block = BlockStore.dangerouslyCreateBlock(dangerousFormObject);
  if (!block) {
    console.warn('$createBlock() not succeeded');
    return;
  }

  debug('$createBlock(): added new block, acking client');
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: block.id
  }, '$createBlock');

  // This might come quite late, as the new block is already pushed to channels
  req.reply();
};

CoreBackend.prototype.$duplicateBlock = function(req, id) {
  if (req.channel.type !== 'control') return;
  if (id === 'core') return;

  var block = BlockStore.getBlock(id);
  if (!block) return;

  var newBlock;

  // Hardcode allowed blocktypes for now
  if (block.type === 'chat') {
    var dangerousFormObject = {
      type: 'chat',
      heading: block.frontends.heading,
      description: block.frontends.description
    };
    newBlock = BlockStore.dangerouslyCreateBlock(dangerousFormObject);
  } else if (block.type === 'rating') {
    var dangerousFormObject = {
      type: 'rating',
      heading: block.frontends.heading,
      description: block.frontends.description
    };
    newBlock = BlockStore.dangerouslyCreateBlock(dangerousFormObject);
  } else if (block.type === 'poll') {
    var dangerousFormObject = {
      type: 'poll',
      heading: block.frontends.heading,
      description: block.frontends.description,
      options: block.options.slice() // Create shallow copy in case it is mutated
    };
    newBlock = BlockStore.dangerouslyCreateBlock(dangerousFormObject);
  } else if (block.type === 'pollplus') {
    var dangerousFormObject = {
      type: 'pollplus',
      heading: block.frontends.heading,
      description: block.frontends.description,
      options: block.options.slice() // Create shallow copy in case it is mutated
    };
    newBlock = BlockStore.dangerouslyCreateBlock(dangerousFormObject);
  } else if (block.type === 'scatter') {
    var dangerousFormObject = {
      type: 'scatter',
      heading: block.frontends.heading,
      description: block.frontends.description,
      options: block.options.slice() // Create shallow copy in case it is mutated
    };
    newBlock = BlockStore.dangerouslyCreateBlock(dangerousFormObject);
  }

  if (!newBlock) {
    // Not supported blocktype
    console.warn('$createBlock() not succeeded');
    return;
  }

  debug('$duplicateBlock(): added new block, acking client');
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: block.id
  }, '$duplicateBlock');
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: newBlock.id
  }, '$createBlock');

  // This might come quite late, as the new block is already pushed to channels
  req.reply();
};

CoreBackend.prototype.$deleteBlock = function(req, id) {
  if (req.channel.type !== 'control') return;
  if (id === 'core') return;

  var block = BlockStore.getBlock(id);
  if (!block) return;

  BlockStore.removeBlock(block); // Will inform channels
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: block.id
  }, '$deleteBlock');
};

CoreBackend.prototype.$liftBlock = function(req, id) {
  if (req.channel.type !== 'control') return;
  if (id === 'core') return;

  var block = BlockStore.getBlock(id);
  if (!block) return;

  BlockStore.liftBlock(block);
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: block.id
  }, '$liftBlock');
};
// Or parametrize moveBlock
CoreBackend.prototype.$lowerBlock = function(req, id) {
  if (req.channel.type !== 'control') return;
  if (id === 'core') return;

  var block = BlockStore.getBlock(id);
  if (!block) return;

  BlockStore.lowerBlock(block);
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: block.id
  }, '$lowerBlock');
};

CoreBackend.prototype.$selectBlock = function(req, id, selected) {
  if (req.channel.type !== 'control') return;
  if (id === 'core') return;

  var block = BlockStore.getBlock(id);
  if (!block) return;

  BlockStore.selectBlock(block, !!selected);
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: block.id,
    selected: !!selected
  }, '$selectBlock');
};

CoreBackend.prototype.$showBlock = function(req, id, shown) {
  if (req.channel.type !== 'control') return;
  if (id === 'core') return;

  var block = BlockStore.getBlock(id);
  if (!block) return;

  BlockStore.showBlock(block, !!shown);
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: block.id,
    shown: !!shown
  }, '$showBlock');
};

// Client can give info later
CoreBackend.prototype.$setInfo = function(req, stats) {
  debug('info from %s: %j', req.eioSocket && req.eioSocket.clientId, stats);
};

// TODO properly like heading edit etc
CoreBackend.prototype.$setUserpin = function(req, userpin) {
  if (typeof userpin !== 'string') return;
  userpin = trimWhitespace(userpin).substring(0, 200);

  // TODO validate as email etc
  if (userpin.split('@').length !== 2 || userpin.indexOf('.') === -1) {
    req.reply('INVALID_USERPIN');
    return;
  }

  // TODO move
  if (req.user.personas.userpin === userpin) {
    // PIN not changed, ok login
    req.reply();
    return;
  }

  var otherUser = UserStore.getByUserpin(userpin);
  if (otherUser) {
    // Found duplicate
    // Could merge users
    // httpSession.userId = otherUser.id;
    // otherUser.httpSessions[httpSession.id] = httpSession;
    // otherUser.httpSessions.push(httpSession.id)
    // remove from this user
    // otherUser.save()
    // But there are still eioSocket(s), for example, that are not
    // transferred under otherUser. Would need a reload.

    // TODO make configurable
    req.reply('USERPIN_ALREADY_TAKEN');
    return;
  }

  // TODO prevent duplicates if needed
  // if username is rolename then duplicates are asked for
  req.user.__setUserpin(userpin);

  var networkingCode = req.user.personas.networkingCode;
  for (var eioSocketId in req.user.eioSockets) {
    var eioSocket = req.user.eioSockets[eioSocketId];
    // Send same username to all sockets, all channels for now
    // Perhaps only per channeltype
    eioSocket.rpc('core.$setConfig', {
      userpin: userpin,
      networkingCode: networkingCode
    }); // TODO !!!
  }
  req.reply();
  // Announce to user list etc
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    userpin: userpin
  }, '$setUserpin');
};

// TODO properly like heading edit etc
CoreBackend.prototype.$setUsername = function(req, username) {
  if (typeof username !== 'string') return;
  username = trimWhitespace(username).substring(0, 200);

  // Check invalid username? Anything goes for now.

  if (req.user.personas.username === username) {
    // Username not changed, ok login
    req.reply();
    return;
  }

  // TODO prevent duplicates if needed
  // if username is rolename then duplicates are asked for
  var otherUser = UserStore.getByUsername(username);
  if (otherUser) {
    if (SiteConfig.UNIQUE_USERNAMES) {
      req.reply('USERNAME_ALREADY_TAKEN');
      return;
    }
    // Else fall through
  }

  req.user.__setUsername(username);
  for (var eioSocketId in req.user.eioSockets) {
    var eioSocket = req.user.eioSockets[eioSocketId];
    // Send same username to all sockets, all channels for now
    // Perhaps only per channeltype
    eioSocket.rpc('core.$setConfig', {username: username}); // TODO !!!
  }
  req.reply();
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    username: username
  }, '$setUsername');
};

// TODO move to own block
CoreBackend.prototype.$collectNetworkingCode = function(req, networkingCode) {
  if (typeof networkingCode !== 'string') {
    return;
  }
  if (typeof UserStore.getByNetworkingCode !== 'function') {
    return;
  }
  var otherUser = UserStore.getByNetworkingCode(networkingCode);
  if (!otherUser) {
    req.reply('INVALID_CODE');
    return;
  }
  if (otherUser.id === req.user.id) {
    req.reply('OWN_CODE');
    return;
  }

  if (typeof req.user.__addToNetwork === 'function') {
    if (!req.user.__addToNetwork(otherUser)) {
       req.reply('ALREADY_ADDED_CODE');
       return;
    };
  }

  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    otherUserId: otherUser.id
  }, '$collectNetworkingCode');

  for (var eioSocketId in req.user.eioSockets) {
    var eioSocket = req.user.eioSockets[eioSocketId];
    // Send same username to all sockets, all channels for now
    // Perhaps only per channeltype
    eioSocket.rpc('core.$setConfig', {
      networkingList: req.user.__networkToWire()
    }); // TODO !!!
  }
  for (var eioSocketId in otherUser.eioSockets) {
    var eioSocket = otherUser.eioSockets[eioSocketId];
    // Send same username to all sockets, all channels for now
    // Perhaps only per channeltype
    eioSocket.rpc('core.$setConfig', {
      networkingList: otherUser.__networkToWire()
    }); // TODO !!!
  }

  // Could have some info on the other user
  req.reply();
}

CoreBackend.prototype.$hideUser = function(req, id) {
  if (req.channel.type !== 'control') return;
  var user = UserStore.getUser(id);
  if (!user) {
    return;
  }
  // Just toggle for now
  user.personas.hidden = !user.personas.hidden;
  user.save();
  this.calcScoreboard();

  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    targetUserId: user.id,
    hidden: user.personas.hidden
  }, '$hideUser');
};

CoreBackend.prototype.$showScoreboardOnScreen = function(req) {
  if (req.channel.type !== 'control') return;

  // not persisted at this point
  this.scoreboardOnScreen = !this.scoreboardOnScreen;

  this.rpc('screen:$setConfig', {scoreboardOnScreen: this.scoreboardOnScreen}); // could be faster here
  this.rpc('stage:$setConfig', {scoreboardOnScreen: this.scoreboardOnScreen});
  this.rpc('control:$setConfig', {scoreboardOnScreen: this.scoreboardOnScreen});

  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    scoreboardOnScreen: this.scoreboardOnScreen
  }, '$showScoreboardOnScreen');
};

// TODO move
CoreBackend.prototype.scoreboardToWire = function() {
  if (!this.scoreboard) {
    // Only for first request
    this.calcScoreboard();
  }
  return this.scoreboard;
}

CoreBackend.prototype.calcScoreboard = function() {
  if (!this.scoreboard) {
    this.scoreboard = [];
  }
  //this.scoreboard.length = 0;

  var validUsers = [];
  for (var userId in UserStore._users) {
    var user = UserStore._users[userId];
    if (user.personas.networkingType === 'company' ||
      !(user.personas.points > 0) /*||
      user.personas.hidden*/) {
      continue;
    }
    validUsers.push({
      id: user.id,
      points: user.personas.points,
      username: user.personas.username,
      email: user.personas.userpin, // TODO clarify userpin vs email
      hidden: user.personas.hidden
    });
  }

  var ranking = _.sortBy(validUsers, function(description) {
    return -description.points;
  });

  var newScoreboard = [];
  var visibleCount = 15;
  for (var i = 0; i < ranking.length; i++) {
    var cur = ranking[i];
    if (!cur.hidden) {
      visibleCount--;
    }
    newScoreboard.push(cur);
    if (visibleCount <= 0) {
      break;
    }
  }

  var changed = false;
  if (this.scoreboard.length !== newScoreboard.length) {
    changed = true;
  }
  for (var i = 0; i < newScoreboard.length; i++) {
    var old = this.scoreboard[i];
    var cur = newScoreboard[i];
    if (!old || old.points !== cur.points ||
      old.username !== cur.username || old.hidden !== cur.hidden) {
      changed = true;
      break;
    }
  }

  // Could broadcast validUsers.length too

  if (changed) {
    this.scoreboard = newScoreboard;
    this.rpc('screen:$setConfig', {scoreboard: this.scoreboard}); // could be faster here
    this.rpc('stage:$setConfig', {scoreboard: this.scoreboard});
    this.rpc('control:$setConfig', {scoreboard: this.scoreboard});
  }

};

// Called from userConstructor log where points are calculated
//var previousScoreboard;
CoreBackend.prototype.publishScoreboard = function() {
  if (!this.calcScoreboardThrottled) {
    this.calcScoreboardThrottled = throttle(this.calcScoreboard, 1000);
  }
  this.calcScoreboardThrottled();
};

// TODO synchronize client clocks by calculating round-trip latency
// and sending server time stamp back
CoreBackend.prototype.$ping = function(req) {
  req.reply();
};

function trimWhitespace(str) {
  str = str.replace(/^\s+|\s+$/g, ''); // begin end remove
  str = str.replace(/\s+/g, ' '); // middle convert nonprintable to space and truncate
  return str;
}
