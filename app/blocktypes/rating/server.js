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
 * Rating block
 */

var BLOCKTYPE = require('path').basename(__dirname);

var debug = require('debug')('io:' + BLOCKTYPE); debug('module loading');
var console = require('../../lib/Logger')('io:' + BLOCKTYPE);

// TODO inject common framework thingies via e.g. common require('..')

var SiteConfig = require('../../lib/SiteConfig');
//var models = require('../../lib/models');
var BlockBuilderSync = require('../../lib/BlockBuilderSync');
var DataStore = require('../../lib/DataStore');
var db = DataStore.namespace(BLOCKTYPE);
var _ = require('underscore'); // temporary
var throttle = require('../../lib/utils/throttle');
var rpc = require('../../lib/rpc');
//var ChannelStore = require('../../lib/ChannelStore');
//var BlockStore = require('../../lib/BlockStore');
var UserStore = require('../../lib/UserStore');
var invariant = require('../../lib/utils/invariant');

// TODO get this from block package.json or somewhere
var SUPPORTED_CHANNELTYPES = ['web', 'control', 'stage', 'screen'];
//var SUPPORTED_CHANNELTYPES_OBJ = toMap(SUPPORTED_CHANNELTYPES);

function blockSupports(channeltype) {
  return SUPPORTED_CHANNELTYPES.indexOf(channeltype) !== -1;
  //return SUPPORTED_CHANNELTYPES_OBJ[channeltype] === true;
}

/**
 * Exports a block backend instance constructor
 */
exports = module.exports = Block;

exports.__buildFrontendAssets = function(done) {
  // Think whether to use
  // SiteConfig.AVAILABLE_CHANNELTYPES or
  // block's SUPPORTED_CHANNELTYPES here
  // TODO refactor api
  BlockBuilderSync(BLOCKTYPE, done);
};

exports.__getFrontendAssetUrlsForChannel = function(channel) {
  debug('getFrontendAssetUrlsForChannel called');
  return {
    js: [{
      url: '/' + SiteConfig.SITEROUTE + '/assets/' + BLOCKTYPE + '/' + BLOCKTYPE + '-' + SiteConfig.SITELANG + '-' + channel.type + '.min.js.gz_'
    }]
  };
};

// TODO
exports.__getPackageInfo = function() {
  // Size info etc
  return {};
};

// If block can be created from config.json, adapt to schema here
exports.__createBlock = function(configIn) {
  var blockConfig = {};
  blockConfig.id = configIn.id; // id is required in config
  // Add other configurable properties here
  var block = new Block(blockConfig);
  block.save();
  return block;
};

// Validate input thoroughly, dangerous!
exports.__dangerouslyCreateBlock = function(dangerousFormObject) {
  debug(
    '__dangerouslyCreateBlock() called with dangerousFormObject: %j',
    dangerousFormObject
  );
  var blockConfig = {};
  blockConfig.id = db.getUniqueId();

  blockConfig.frontends = {};
  if (typeof dangerousFormObject.heading !== 'string') {
    dangerousFormObject.heading = '';
  }
  blockConfig.frontends.heading = trimWhitespace(dangerousFormObject.heading).substring(0, 500);

  if (typeof dangerousFormObject.description !== 'string') {
    dangerousFormObject.description = '';
  }
  blockConfig.frontends.description = trimWhitespace(dangerousFormObject.description).substring(0, 2000);

  debug('validated properties: %j', blockConfig);

  var block = new Block(blockConfig);
  block.save();

  console.info({
    blockId: blockConfig.id,
    heading: blockConfig.frontends.heading,
    description: blockConfig.frontends.description
  }, 'createRatingBlock');

  return block;
};

exports.__loadBlock = function(id) {
  var config = db.get(id);
  if (!config) return;

  return new Block({
    id: id,
    config: config,
    msgIds: db.get(id + 'msgIds'),
    results: db.get(id + 'results'),
    frontends: db.get(id + 'frontends'),
    participants: db.get(id + 'participants'),
    participantCount: db.get(id + 'participantCount')
  });
};

Block.prototype.save = function() {
  db.set(this.id, this.config);
  db.set(this.id + 'msgIds', this.msgIds);
  db.set(this.id + 'results', this.results);
  db.set(this.id + 'frontends', this.frontends);
  db.set(this.id + 'participants', this.participants);
  db.set(this.id + 'participantCount', this.participantCount);
  return this;
};
Block.prototype.saveFrontends = function() {
  db.set(this.id + 'frontends', this.frontends);
  return this;
};
Block.prototype.saveParticipants = function() {
  db.set(this.id + 'participants', this.participants);
  db.set(this.id + 'participantCount', this.participantCount);
  return this;
};
Block.prototype.saveMessages = function() {
  db.set(this.id + 'msgIds', this.msgIds);
  return this;
};
Block.prototype.saveResults = function() {
  db.set(this.id + 'results', this.results);
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

function Block(options) {
  if (!(this instanceof Block)) return new Block(options);
  options = options || {};
  invariant(options.id, '.id required.');
  this.id = options.id;
  this.type = BLOCKTYPE;
  this.config = options.config || {};

  this.frontends = options.frontends || {};
  defaults(this.frontends, {
    active: true,
    selected: false,
    visible: false,
    heading: '',
    description: '',
    ratingButtons: true,
    likertScale: false,
    showStddevOnScreen: false,
    showPercentages: false,
    hideMsgsOnWeb: false,
    moderated: false,
    usernames: false,
  });

  //this.msgIds = options.msgIds || [];
  this.participants = options.participants || {};
  this.participantCount = options.participantCount || 0;

  this.rpc = rpc.block;

  // Each block has live references to its channels
  this.channels = {};

  this.msgs = {};
  this.msgIds = options.msgIds || [];
  // Move loading to __loadBlock if db get becomes async
  this.msgIds.forEach(function(msgId) {
    var msg = Message.load(msgId);
    if (!msg) {
      console.error('msg not found!');
      return;
    }
    this.msgs[msg.id] = msg;
  }, this);

  this.results = options.results || [];
}

// Channels will inject themselves when they are instantiated
Block.prototype.__injectChannel = function(channel) {
  invariant(
    blockSupports(channel.type), 'Unsupported channeltype %s.', channel.type
  );
  // TODO ensure that getFrontendConfig can give right kind of properties
  this.channels[channel.id] = channel;
}

Block.prototype.__getBlockFrontendConfigForChannelUser = function(channel, user) {
  var staticConfig = {
    id: this.id,
    type: this.type,
    visible: this.frontends.visible,
    selected: this.frontends.selected,
    active: this.frontends.active,
    heading: this.frontends.heading || '',
    description: this.frontends.description || '',
    usernames: !!this.frontends.usernames,
    hideMsgsOnWeb: !!this.frontends.hideMsgsOnWeb,
    likertScale: this.frontends.likertScale, // must be before ratingButtons for now
    ratingButtons: this.frontends.ratingButtons,
  };

  if (channel.type !== 'web') {
    staticConfig.showStddevOnScreen = this.frontends.showStddevOnScreen; // before results for now
    staticConfig.results = this.results;
    staticConfig.moderated = this.frontends.moderated;
    staticConfig.showPercentages = this.frontends.showPercentages;
  }
  if (channel.type === 'control') {
    staticConfig.participantCount = this.participantCount;
  }

  return staticConfig;
};

// Possibility to add some frontendData to generated markup
Block.prototype.__getFrontendDataForChannel = function(channel, httpRequest) {
  return '';
};

Block.prototype.__setVisible = function(visible) {
  visible = !!visible;
  if (this.frontends.visible !== visible) {
    this.frontends.visible = visible;
    this.saveFrontends();
    this.rpc('$setConfig', {visible: this.frontends.visible});
  }
  return this;
};

Block.prototype.__setSelected = function(selected) {
  selected = !!selected;
  if (this.frontends.selected !== selected) {
    this.frontends.selected = selected;
    this.saveFrontends();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {selected: this.frontends.selected});
      }
    }
    //this.rpc('$setConfig', {selected: this.frontends.selected});
  }
  return this;
};

Block.prototype.__getBlockReport = function(timeDiff) {
  var out = '';
  out += this.frontends.heading + '\n\n';
  if (this.frontends.description) {
    out += this.frontends.description + '\n\n';
  }
  if (SiteConfig.SITELANG === 'fi') {
    out += this.participantCount + ' osallistujaa\n\n';
  } else {
    out += this.participantCount + ' participants\n\n';
  }

  var results = this.results;

  for (var i = 0; i < results.length; i++) {
    var result = results[i];
    if (SiteConfig.SHOWRATINGSTATS && this.frontends.likertScale) {
      if (result.points) {
        out += '' + result.points + ' +/- ' + result.stddev + ' (N=' + result.N + ') ';
      } else {
        out += '(0) ';
      }
    } else {
      if (result.points) {
        out += '(' + result.points + ') ';
      } else {
        out += '(0) ';
      }
    }
    out += result.text + '\n';
  }

  return out;
};

Block.prototype.__getBlockReportCSV = function(timeDiff) {
  var out = '';

  if (SiteConfig.SITELANG === 'fi') {
    out += 'ÄÄNESTYS\n';
  } else {
    out += 'RATING\n';
  }

  out += this.frontends.heading + '\n';
  if (this.frontends.description) {
    out += this.frontends.description + '\n';
  }
  if (SiteConfig.SITELANG === 'fi') {
    out += this.participantCount + ' osallistujaa\n';
  } else {
    out += this.participantCount + ' participants\n';
  }

  var results = this.results;

  for (var i = 0; i < results.length; i++) {
    //var option = options[i];
    var result = results[i];
    out += result.text + '\t';
    if (SiteConfig.SHOWRATINGSTATS && this.frontends.likertScale) {
      if (result.points) {
        out += '' + result.points + '\t+/-\t' + result.stddev + '\tN=\t' + result.N + '\n';
      } else {
        out += '0\t\t\t\t\n';
      }
    } else {
      if (result.points) {
        out += '' + result.points + '\n';
      } else {
        out += '0\n';
      }
    }
  }

  return out;
};


// Or routed via core?
// TODO disciplined way of resetting the block contents
Block.prototype.$clear = function(req) {
  if (req.channel.type !== 'control') return;
  // If there are throttled functions firing later, they should be
  // ok as they operate on then current data.

  this.msgIds = [];
  // Note: msg objects will stay in db, but unreferenced
  this.msgs = {};
  this.participants = {};
  this.participantCount = 0;
  this.results = [];
  this.save();
  this.rpc('$clear');
  // Or use this.sendParticipantCount();
  this.rpc('control:$setConfig', {participantCount: this.participantCount});

  for (var channelId in this.channels) {
    if (this.channels[channelId].type !== 'web') {
      this.rpc(channelId + ':$setConfig', {results: this.results});
    }
  }
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: this.id
  }, '$clear');
}

Block.prototype.$active = function(req, active) {
  if (req.channel.type !== 'control') return;
  active = !!active;
  if (this.frontends.active !== active) {
    this.frontends.active = active;
    this.saveFrontends();
    this.rpc('$setConfig', {active: this.frontends.active});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      active: this.frontends.active
    }, '$active');
  }
};

Block.prototype.$ratingButtons = function(req, ratingButtons) {
  if (req.channel.type !== 'control') return;
  ratingButtons = !!ratingButtons;
  if (this.frontends.ratingButtons !== ratingButtons) {
    this.frontends.ratingButtons = ratingButtons;
    this.saveFrontends();
    for (var channelId in this.channels) {
      //if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {ratingButtons: this.frontends.ratingButtons});
      //}
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      ratingButtons: this.frontends.ratingButtons
    }, '$ratingButtons');
  }
};

Block.prototype.$likertScale = function(req, likertScale) {
  if (req.channel.type !== 'control') return;
  likertScale = !!likertScale;
  if (this.frontends.likertScale !== likertScale) {
    this.frontends.likertScale = likertScale;
    this.saveFrontends();
    for (var channelId in this.channels) {
      //if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {likertScale: this.frontends.likertScale});
      //}
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      likertScale: this.frontends.likertScale
    }, '$likertScale');
  }
};

Block.prototype.$showStddevOnScreen = function(req, showStddevOnScreen) {
  if (req.channel.type !== 'control') return;
  showStddevOnScreen = !!showStddevOnScreen;
  if (this.frontends.showStddevOnScreen !== showStddevOnScreen) {
    this.frontends.showStddevOnScreen = showStddevOnScreen;
    this.saveFrontends();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {showStddevOnScreen: this.frontends.showStddevOnScreen});
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      showStddevOnScreen: this.frontends.showStddevOnScreen
    }, '$showStddevOnScreen');
  }
};

Block.prototype.$showPercentages = function(req, showPercentages) {
  if (req.channel.type !== 'control') return;
  showPercentages = !!showPercentages;
  if (this.frontends.showPercentages !== showPercentages) {
    this.frontends.showPercentages = showPercentages;
    //this.saveFrontends();
    this.save();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {showPercentages: this.frontends.showPercentages});
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      showPercentages: this.frontends.showPercentages
    }, '$showPercentages');
  }
};

Block.prototype.$hideMsgsOnWeb = function(req, hideMsgsOnWeb) {
  if (req.channel.type !== 'control') return;
  hideMsgsOnWeb = !!hideMsgsOnWeb;
  if (this.frontends.hideMsgsOnWeb !== hideMsgsOnWeb) {
    this.frontends.hideMsgsOnWeb = hideMsgsOnWeb;
    this.saveFrontends();
    this.rpc('$setConfig', {hideMsgsOnWeb: this.frontends.hideMsgsOnWeb});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      hideMsgsOnWeb: this.frontends.hideMsgsOnWeb
    }, '$hideMsgsOnWeb');
  }
};

Block.prototype.$setModerated = function(req, moderated) {
  if (req.channel.type !== 'control') return;
  moderated = !!moderated;
  if (this.frontends.moderated !== moderated) {
    this.frontends.moderated = moderated;
    this.saveFrontends();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {moderated: this.frontends.moderated});
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      moderated: this.frontends.moderated
    }, '$setModerated');
  }
};

Block.prototype.$usernames = function(req, usernames) {
  if (req.channel.type !== 'control') return;
  usernames = !!usernames;
  if (this.frontends.usernames !== usernames) {
    this.frontends.usernames = usernames;
    this.saveFrontends();
    this.rpc('$setConfig', {usernames: this.frontends.usernames});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      usernames: this.frontends.usernames
    }, '$usernames');
  }
};

Block.prototype.$heading = function(req, heading) {
  if (req.channel.type !== 'control') return;
  if (typeof heading !== 'string') return;
  if (this.frontends.heading !== heading) {
    this.frontends.heading = trimWhitespace(heading).substring(0, 500);
    this.saveFrontends();
    this.rpc('$setConfig', {heading: this.frontends.heading});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      heading: this.frontends.heading
    }, '$heading');
  }
};
Block.prototype.$description = function(req, description) {
  if (req.channel.type !== 'control') return;
  if (typeof description !== 'string') return;
  if (this.frontends.description !== description) {
    this.frontends.description = trimWhitespace(description).substring(0, 2000);
    this.saveFrontends();
    this.rpc('$setConfig', {description: this.frontends.description});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      description: this.frontends.description
    }, '$description');
  }
};


/**
 * Message constructor
 */
function Message(options) {
  if (!(this instanceof Message)) return new Message(options);
  options = options || {};
  this.id = options.id || db.getUniqueId();
  //this.type = BLOCKTYPE + '-message';
  this.tc = options.tc || Date.now();
  this.meta = options.meta || {};
  this.text = options.text || '';
  this.username = options.username || '';
  this.q = options.q || '';
  this.admin = options.admin || false;
  this.points = options.points || 0;
  this.stddev = options.stddev || 0;
  this.N = options.N || 0;
  this.votes = options.votes || {};
  //this.tags = [];
  //this.points = 0;
}
Message.prototype.save = function() {
  db.set(this.id, {
    id: this.id,
    tc: this.tc,
    meta: this.meta,
    text: this.text,
    username: this.username,
    q: this.q,
    admin: this.admin,
    points: this.points,
    stddev: this.stddev,
    N: this.N,
    votes: this.votes
  });
  return this;
}
Message.load = function(id) {
  var config = db.get(id);
  if (!config) return;
  return new Message(config);
};
Message.prototype.toWire = function(user, channel) {
  var out = {
    id: this.id,
    time: this.tc,
    text: this.text,
    q: this.q,
    //admin: this.admin ? true : undefined,
    username: this.username ? this.username : undefined,
    //points: this.points // TODO personify and channelize
    //isWire: true
  };
  if (this.meta && user && channel) {
    if (this.meta.userId === user.id && this.meta.channelId === channel.id) {
      out.own = true;
    }
  }
  if (channel && (channel.type === 'control' || channel.type === 'stage')) {
    out.points = this.points;
    out.stddev = this.stddev;
    out.N = this.N;
  }
  return out;
};

Block.prototype.addMessage = function(msg) {
  this.msgs[msg.id] = msg;
  this.msgIds.push(msg.id);
  //this.save();
  this.saveMessages(); // TODO throttled version
};
// TODO removeMessage

function trimWhitespace(str) {
  str = str.replace(/\s/g, ' '); // convert all non-printable chars to a space
  str = str.replace(/^\s+|\s+$/g, ''); // begin end
  str = str.replace(/\s\s+/g, ' '); // middle
  return str;
}

Block.prototype.$msg = function(req, msgIn) {
  // todo validate contents, senderid etc etc
  // send to channels
  if (!msgIn) return;
  if (typeof msgIn.text !== 'string') return;

  if (!this.frontends.active) {
    if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
      return; // Or send info back
    }
  }

  // TODO prevent successive duplicates from same person
  // (keep last message for each contributor and compare)
  // perhaps also throttle flooding from same person

  var username;
  if (this.frontends.usernames && msgIn.withUsername) {
    username = req.user.personas.username || '';
  } else {
    username = '';
  }

  var text = trimWhitespace(msgIn.text).substring(0, 500);

  var attrs = {
    text: text,
    username: username,
    q: this.frontends.moderated ? 'x' : '',
    admin: (req.channel.type === 'control')
  };

  attrs.meta = {
    channelId: req.channel.id,
    userId: req.user.id
  };

  // TODO use some precalculated id perhaps
  // Perhaps move to addMessage
  this.updateParticipantCount(attrs.meta.channelId + ':' + attrs.meta.userId);

  var msg = new Message(attrs);
  //if (!msg.isValid()) {
  //  return;
  //}
  msg.save();

  this.addMessage(msg);

  // Activity logging
  if (req.user.log) {
    // TODO overhaul this, otherwise moderation messes points calculation
    if (!attrs.q) {
      req.user.log('newRatingMsg');
    }
  }

  // confirm ok
  req.reply(null);
  // send to channels
  //this.rpc('$msgIn', msg.toWire());
  // One serialization
  //this.rpc('$msgIn', msg.toWire(req.user, req.channel));

  // Customization for each socket, could be in the hundreds
  for (var channelId in this.channels) {
    //this.rpc(channelId + ':$msgIn', msg.toWire(req));
    var channel = this.channels[channelId];
    for (var socketId in channel.eioSockets) {
      var socket = channel.eioSockets[socketId];
      if (!socket.user || !socket.rpc) continue;
      socket.rpc(this.id + '.$msgIn', msg.toWire(socket.user, socket.channel));
    }
  }

  // Update screen etc even if no votes yet
  if (!this.calcRankingThrottled) {
    this.calcRankingThrottled = throttle(this.calcRanking, 100); // ten times per second max
  }
  this.calcRankingThrottled();

  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: this.id,
    msg_: { // msg is a reserved key in Bunyan logger
      id: msg.id,
      tc: msg.tc,
      text: msg.text,
      username: msg.username,
      q: msg.q,
      admin: msg.admin,
      points: msg.points,
      stddev: msg.stddev,
      N: msg.N
    }
  }, '$msg');

};

Block.prototype.$setQuality = function(req, msgId, q) {
  if (req.channel.type !== 'control') {
    return;
  }

  // TODO validate
  if (!this.msgs.hasOwnProperty(msgId)) return;

  var msg = this.msgs[msgId];

  if (typeof q !== 'string') q = '';
  if (q !== 'x') q = '';

  if (msg.q === q) {
    return;
  }

  msg.q = q; // q = '', '+', '-', 'x'

  msg.save();

  var user = UserStore._users[msg.meta.userId];
  if (user) {
    if (msg.q === 'x') {
      // remove points
      user.log('newRatingMsgInvert');
    } else {
      // add points
      user.log('newRatingMsg');
    }
  }

  // Customization for each socket, could be in the hundreds
  for (var channelId in this.channels) {
    //this.rpc(channelId + ':$msgIn', msg.toWire(req));
    var channel = this.channels[channelId];
    for (var socketId in channel.eioSockets) {
      var socket = channel.eioSockets[socketId];
      if (!socket.user || !socket.rpc) continue;
      socket.rpc(this.id + '.$msgIn', msg.toWire(socket.user, socket.channel));
    }
  }

  // Remove moderated options from screen
  if (!this.calcRankingThrottled) {
    this.calcRankingThrottled = throttle(this.calcRanking, 100); // ten times per second max
  }
  this.calcRankingThrottled();

  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: this.id,
    msgId: msg.id,
    q: msg.q
  }, '$setQuality');

};

Block.prototype.$addPointsToContributor = function(req, msgId) {
  if (req.channel.type !== 'control') {
    return;
  }
  if (!this.msgs.hasOwnProperty(msgId)) {
    return;
  }
  var msg = this.msgs[msgId];
  var user = UserStore._users[msg.meta.userId];
  if (!user) {
    return;
  }
  user.log('bonusPoints');
  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: this.id,
    targetUserId: user.id
  }, 'rating:$addPointsToContributor');
};

Block.prototype.$givePoint = function(req, msgId, points) {
  if (!this.frontends.ratingButtons) return;
  if (!this.msgs.hasOwnProperty(msgId)) return;

  if (typeof points === 'undefined' || !this.frontends.likertScale) {
    points = 1;
  }
  if (typeof points !== 'number' &&
      typeof points !== 'string') {
    return;
  }

  points = points|0;
  if (points < 0 || points > 5) {
    return;
  }

  var msg = this.msgs[msgId];

  var userId = req.channel.id + ':' + req.user.id;

  if (msg.votes[userId]) {
    // Already voted
    // Could toggle vote down

    // if changed from default to likert, things will not register correctly
    return;
  }

  this.updateParticipantCount(userId);

  // Activity logging
  if (req.user.log) {
    // Temporary nonpersistent counter per ID to limit points by user
    if (!this.userVoteCounts) {
      this.userVoteCounts = {};
    }
    if (!this.userVoteCounts[req.user.id]) {
      this.userVoteCounts[req.user.id] = 0;
    }
    if (++this.userVoteCounts[req.user.id] <= 3) {
      req.user.log('newRatingVote');
    }
  }

  // TODO Could add points to original message sender too, but how much?
  //var user = UserStore._users[msg.meta.userId];

  //msg.votes[userId] = true;
  //msg.points = msg.points + 1;

  msg.votes[userId] = points;
  var currentPoints = 0;
  var currentVoterCount = 0;
  // For now, just calculate points again every time
  // TODO calculate cumulatively
  for (var voterId in msg.votes) {
    var vote = msg.votes[voterId];
    currentVoterCount++;
    currentPoints += (vote|0);
  }
  if (this.frontends.likertScale) {
    if (currentVoterCount == 0) {
      currentPoints = 0;
    } else {
      currentPoints = currentPoints/currentVoterCount;
    }
  }
  // Standard deviation calculation
  // TODO benchmark these loops, now on every incoming rating, all other ratings
  // for this message are looped through twice. Both can be calculated and kept
  // cumulatively, but mean (currentPoints) is needed for variance.
  var currentStddev = 0;
  if (this.frontends.likertScale) {
    if (currentVoterCount == 0) {
      currentStddev = 0;
    } else {
      for (var voterId in msg.votes) {
        var voteDiff = (msg.votes[voterId]|0) - currentPoints;
        currentStddev += voteDiff*voteDiff;
      }
      currentStddev = currentStddev/currentVoterCount;
      currentStddev = Math.sqrt(currentStddev);
    }
  }

  // These are rounded to avoid silly long decimals being sent on wire.
  // Note that in frontend templates these numbers are shown with .toFixed(1)
  // TODO where to consolidate formatting to string, here, when receiving
  // rpc on client, when rendering the template, when updating fields?
  msg.points = Math.round(currentPoints*10)/10;
  msg.stddev = Math.round(currentStddev*10)/10;
  msg.N = currentVoterCount;

  // TODO granularize and throttle
  msg.save();

  if (!this.calcRankingThrottled) {
    this.calcRankingThrottled = throttle(this.calcRanking, 100); // ten times per second max
  }
  this.calcRankingThrottled();

  // This is performance sensitive, sending stuff on each participant click.
  // Should be throttled with different amounts to different channels.
  // For now, send a special "statsMsg" to control and stage on each click, so if there are
  // hundreds of clicks, there are also hundreds of messages.
  if (SiteConfig.SHOWRATINGSTATS) {
    // TODO batch these together similarly to calcRanking.
    var statsMsg = {msgId: msg.id, points: msg.points, stddev: msg.stddev, N: msg.N};
    this.rpc('control:$msgStats', statsMsg);
    this.rpc('stage:$msgStats', statsMsg);
  }

  console.info({
    userId: req.user.id,
    channelId: req.channel.id,
    blockId: this.id,
    msgId: msg.id,
    points: points,
    currentPoints: msg.points,
    stddev: msg.stddev,
    N: msg.n
  }, '$givePoint');

  // TODO could give feedback
};

// Hopefully not too slow or memory hog (creates copies)
Block.prototype.calcRanking = function() {

  //for (var id in this.msgs) {
  //}

  var points = _.map(this.msgs, function(msg) {
    //return {id: msg.id, points: msg.points};
    return {id: msg.id, points: msg.q === 'x' ? 0 : msg.points};
  });

  var ranking = _.sortBy(points, function(msg) {
    return -msg.points;
  });

  var top10ids = _.first(ranking, 50); // Changed from 10

  var msgs = this.msgs;
  var top10 = top10ids.map(function(idpoint) {
    var msg = msgs[idpoint.id];
    if (!msg) return {}; // is this some saving problem?
    if (msg.q === 'x') return {}; // for now, let's remove the hidden ones (TODO too little results)
    return {
      id: msg.id,
      time: msg.tc,
      text: msg.text,
      q: msg.q,
      username: msg.username ? msg.username : undefined,
      points: msg.points,
      stddev: msg.stddev,
      N: msg.N
    };
  });
  top10 = top10.filter(function(obj) {
    if (!obj || !obj.id) {
      return false;
    }
    return true;
  });

  this.results = top10;

  // TODO check that throttled and non-throttled save cannot interfere badly
  //this.save(true); // throttled 5s
  this.saveResults();

  //this.rpc('web:$rankingIn', top10); // could be slower here, or commented away
  this.rpc('screen:$setConfig', {results: this.results}); // could be faster here
  this.rpc('stage:$setConfig', {results: this.results});
  this.rpc('control:$setConfig', {results: this.results});
};

Block.prototype.updateParticipantCount = function(userId) {
  if (this.participants[userId]) return;

  this.participants[userId] = true; // TODO later more info
  this.participantCount++;

  console.info({
    blockId: this.id,
    participantCount: this.participantCount
  }, 'ratingParticipantCount');

  if (!this.sendParticipantCountThrottled) {
    this.sendParticipantCountThrottled = throttle(this.sendParticipantCount, 1000);
  }
  this.sendParticipantCountThrottled();
  // TODO throttled save
  this.saveParticipants();
};

Block.prototype.sendParticipantCount = function() {
  // TODO Will send only to control for now
  this.rpc('control:$setConfig', {participantCount: this.participantCount});
}

// TODO this single getter or multiple, for each feature?
// Usually better to have consolidated in config and them
// perhaps separate calls for features.
Block.prototype.$getData = function(req) {
  //var state = {
  //  msgs: this.msgs
  //};

  var msgs = this.msgs;
  var msgIds = this.msgIds;
  var outMsgs = [];

  // todo better buffer
  // Only 100 latest messages
  var i = msgIds.length - 70;
  if (i < 0) i = 0;

  for (; i < msgIds.length; i++) {
    var msg = msgs[msgIds[i]];
    if (msg) {
      // sends also hidden messages
      // marks own messages
      outMsgs.push(msg.toWire(req.user, req.channel));
    }
  }

  if (req.channel.type == 'control' || req.channel.type == 'stage' || req.channel.type == 'screen') {
    req.reply({msgs: outMsgs, results: this.results});
  } else {
    req.reply({msgs: outMsgs});
  }
};

// todo get more messages

if (!module.parent) {
  debug('block standalone');
}
