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
 * Chat block
 */

var BLOCKTYPE = require('path').basename(__dirname);

var debug = require('debug')('io:' + BLOCKTYPE); debug('module loading');
var console = require('../../lib/Logger')('io:' + BLOCKTYPE);

// TODO inject common framework thingies via e.g. common require('..')
var SiteConfig = require('../../lib/SiteConfig');
var BlockBuilderSync = require('../../lib/BlockBuilderSync');
var DataStore = require('../../lib/DataStore');
var db = DataStore.namespace(BLOCKTYPE);
var throttle = require('../../lib/utils/throttle');
var rpc = require('../../lib/rpc');
var UserStore = require('../../lib/UserStore');
var invariant = require('../../lib/utils/invariant');
var mergeInto = require('../../lib/utils/mergeInto');

if (SiteConfig.CONNECT_TWITTER) {
  // Experimental Twitter integration
  var twit = require('twit');
  // Application specific keys -- do not use these in many processes simultaneously!
  var twitter = new twit({
    consumer_key: SiteConfig.TWITTER_CONSUMER_KEY,
    consumer_secret: SiteConfig.TWITTER_CONSUMER_SECRET,
    access_token: SiteConfig.TWITTER_ACCESS_TOKEN,
    access_token_secret: SiteConfig.TWITTER_ACCESS_TOKEN_SECRET
  });
}

// TODO get this from block package.json or somewhere
var SUPPORTED_CHANNELTYPES = ['web', 'control', 'stage', 'screen'];
function supports(channeltype) {
  return SUPPORTED_CHANNELTYPES.indexOf(channeltype) !== -1
}

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

var TWITTER_ACTIVE = false;

function BlockConstructor(options) {
  if (!(this instanceof BlockConstructor)) return new BlockConstructor(options);
  options = options || {};
  invariant(options.id, 'BlockConstructor: .id required.');
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
    smallMsgsOnScreen: true,
    hideMsgsOnScreen: false,
    hideMsgsOnWeb: false,
    hideHighlightsOnScreen: false,
    moderated: false,
    usernames: false,
    editingButtons: false,
    onlyOneSend: false,
    blockGroup: ''
  });

  this.participants = options.participants || {};
  this.participantCount = options.participantCount || 0;

  this.rpc = rpc.block;

  // Each block has live references to its channels
  this.channels = {};

  this.msgIds = options.msgIds || [];
  this.msgs = {};

  // Move to __loadBlock if db get becomes async
  this.msgIds.forEach(function(msgId) {
    var msg = Message.load(msgId);
    if (!msg) {
      console.error('msg not found!');
      return;
    }
    this.msgs[msg.id] = msg;
  }, this);

  // Not persisted to DB
  this.highlights = [];
  // Not persisted to DB, but should
  this.picks = [];

  // Experimental twitter integration
  // TODO connect stream on first sight, stop/start for heading changes,
  // multiple keywords to multiple blocks (still only one stream)
  if (SiteConfig.CONNECT_TWITTER) {
    if (/#\w+/.test(this.frontends.heading)) {
      initTwitter(this);
    }
  }
}


var BlockConstructorStatics = {

  __buildFrontendAssets: function(done) {
    // Think whether to use
    // SiteConfig.AVAILABLE_CHANNELTYPES or
    // block's SUPPORTED_CHANNELTYPES here
    // TODO refactor api
    BlockBuilderSync(BLOCKTYPE, done);
  },

  __getFrontendAssetUrlsForChannel: function(channel) {
    debug('getFrontendAssetUrlsForChannel called');
    return {
      js: [{
        url: '/' + SiteConfig.SITEROUTE + '/assets/' + BLOCKTYPE + '/' + BLOCKTYPE + '-' + SiteConfig.SITELANG + '-' + channel.type + '.min.js.gz_'
      }]
    };
  },

  // TODO
  __getPackageInfo: function() {
    // Size info etc
    return {};
  },

  // If block can be created from config.json, adapt to schema here
  __createBlock: function(configIn) {
    var blockConfig = {};
    blockConfig.id = configIn.id; // id is required in config
    // Add other configurable properties here
    var block = new BlockConstructor(blockConfig);
    block.save();
    return block;
  },

  // Validate input thoroughly, dangerous!
  __dangerouslyCreateBlock: function(dangerousFormObject) {
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

    var block = new BlockConstructor(blockConfig);
    block.save();

    console.info({
      blockId: blockConfig.id,
      heading: blockConfig.frontends.heading,
      description: blockConfig.frontends.description
    }, 'createChatBlock');

    return block;
  },

  __loadBlock: function(id) {
    var config = db.get(id);
    if (!config) return;

    return new BlockConstructor({
      id: id,
      config: config,
      msgIds: db.get(id + 'msgIds'),
      frontends: db.get(id + 'frontends'),
      participants: db.get(id + 'participants'),
      participantCount: db.get(id + 'participantCount')
    });
  }
};

mergeInto(BlockConstructor, BlockConstructorStatics);



var BlockConstructorMixin = {

  save: function() {
    db.set(this.id, this.config);
    db.set(this.id + 'msgIds', this.msgIds);
    db.set(this.id + 'frontends', this.frontends);
    db.set(this.id + 'participants', this.participants);
    db.set(this.id + 'participantCount', this.participantCount);
    return this;
  },
  saveFrontends: function() {
    db.set(this.id + 'frontends', this.frontends);
    return this;
  },
  saveParticipants: function() {
    db.set(this.id + 'participants', this.participants);
    db.set(this.id + 'participantCount', this.participantCount);
    return this;
  },
  saveMessages: function() {
    db.set(this.id + 'msgIds', this.msgIds);
    return this;
  },

  // Channels will inject themselves when they are instantiated
  __injectChannel: function(channel) {
    invariant(
      supports(channel.type), 'Unsupported channeltype %s', channel.type
    );
    // TODO ensure that getBlockFrontendConfig can give right kind of properties
    this.channels[channel.id] = channel;
  },

  __getBlockFrontendConfigForChannelUser: function(channel, user) {
    var staticConfig = {
      id: this.id,
      type: this.type,
      visible: !!this.frontends.visible,
      selected: !!this.frontends.selected,
      active: !!this.frontends.active,
      heading: this.frontends.heading || '',
      description: this.frontends.description || '',
      usernames: !!this.frontends.usernames,
      editingButtons: !!this.frontends.editingButtons,
      onlyOneSend: !!this.frontends.onlyOneSend,
      hideMsgsOnWeb: !!this.frontends.hideMsgsOnWeb,
      blockGroup: this.frontends.blockGroup || ''
    };

    if (channel.type !== 'web') {
      staticConfig.smallMsgsOnScreen = this.frontends.smallMsgsOnScreen;
      staticConfig.hideMsgsOnScreen = this.frontends.hideMsgsOnScreen;
      staticConfig.hideHighlightsOnScreen = this.frontends.hideHighlightsOnScreen;
      staticConfig.moderated = this.frontends.moderated;
    }
    if (channel.type === 'control') {
      staticConfig.participantCount = this.participantCount;
    }

    return staticConfig;
  },

  // Possibility to add some frontendData to generated markup
  __getFrontendDataForChannel: function(channel, httpRequest) {
    return '';
  },

  __setVisible: function(visible) {
    visible = !!visible;
    if (this.frontends.visible !== visible) {
      this.frontends.visible = visible;
      this.saveFrontends();
      this.rpc('$setConfig', {visible: this.frontends.visible});
    }
    return this;
  },

  __setSelected: function(selected) {
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
  },

  // Or routed via core?
  // TODO disciplined way of resetting the block contents
  $clear: function(req) {
    if (req.channel.type !== 'control') return;
    // If there are throttled functions firing later, they should be
    // ok as they operate on then current data.

    this.msgIds = [];
    // Note: msg objects will stay in db, but unreferenced
    this.msgs = {};
    this.highlights = [];
    this.picks = [];
    this.participants = {};
    this.participantCount = 0;
    this.save();
    this.rpc('$clear');
    // Or use this.sendParticipantCount();
    this.rpc('control:$setConfig', {participantCount: this.participantCount});

    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$highlightsIn', this.highlights);
        this.rpc(channelId + ':$picksIn', this.picks);
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id
    }, '$clear');

  },

  // Or routed via core?
  $blockGroup: function(req, blockGroup) {
    if (req.channel.type !== 'control') return;
    if (typeof blockGroup !== 'string') return;
    if (this.frontends.blockGroup !== blockGroup) {
      this.frontends.blockGroup = trimWhitespace(blockGroup).substring(0, 100);
      this.saveFrontends();
      this.rpc('$setConfig', {blockGroup: this.frontends.blockGroup});
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        blockGroup: this.frontends.blockGroup
      }, '$blockGroup');
    }
  },

  $active: function(req, active) {
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
  },

  $smallMsgsOnScreen: function(req, smallMsgsOnScreen) {
    if (req.channel.type !== 'control') return;
    smallMsgsOnScreen = !!smallMsgsOnScreen;
    if (this.frontends.smallMsgsOnScreen !== smallMsgsOnScreen) {
      this.frontends.smallMsgsOnScreen = smallMsgsOnScreen;
      this.saveFrontends();
      for (var channelId in this.channels) {
        if (this.channels[channelId].type !== 'web') {
          this.rpc(channelId + ':$setConfig', {smallMsgsOnScreen: this.frontends.smallMsgsOnScreen});
        }
      }
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        smallMsgsOnScreen: this.frontends.smallMsgsOnScreen
      }, '$smallMsgsOnScreen');
    }
  },

  $hideMsgsOnScreen: function(req, hideMsgsOnScreen) {
    if (req.channel.type !== 'control') return;
    hideMsgsOnScreen = !!hideMsgsOnScreen;
    if (this.frontends.hideMsgsOnScreen !== hideMsgsOnScreen) {
      this.frontends.hideMsgsOnScreen = hideMsgsOnScreen;
      this.saveFrontends();
      for (var channelId in this.channels) {
        if (this.channels[channelId].type !== 'web') {
          this.rpc(channelId + ':$setConfig', {hideMsgsOnScreen: this.frontends.hideMsgsOnScreen});
        }
      }
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        hideMsgsOnScreen: this.frontends.hideMsgsOnScreen
      }, '$hideMsgsOnScreen');
    }
  },

  $hideMsgsOnWeb: function(req, hideMsgsOnWeb) {
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
  },

  $hideHighlightsOnScreen: function(req, hideHighlightsOnScreen) {
    if (req.channel.type !== 'control') return;
    hideHighlightsOnScreen = !!hideHighlightsOnScreen;
    if (this.frontends.hideHighlightsOnScreen !== hideHighlightsOnScreen) {
      this.frontends.hideHighlightsOnScreen = hideHighlightsOnScreen;
      this.saveFrontends();
      for (var channelId in this.channels) {
        if (this.channels[channelId].type !== 'web') {
          this.rpc(channelId + ':$setConfig', {hideHighlightsOnScreen: this.frontends.hideHighlightsOnScreen});
        }
      }
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        hideHighlightsOnScreen: this.frontends.hideHighlightsOnScreen
      }, '$hideHighlightsOnScreen');
    }
  },

  $setModerated: function(req, moderated) {
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
  },

  $usernames: function(req, usernames) {
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
  },

  $editingButtons: function(req, editingButtons) {
    if (req.channel.type !== 'control') return;
    editingButtons = !!editingButtons;
    if (this.frontends.editingButtons !== editingButtons) {
      this.frontends.editingButtons = editingButtons;
      this.saveFrontends();
      this.rpc('$setConfig', {editingButtons: this.frontends.editingButtons});
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        editingButtons: this.frontends.editingButtons
      }, '$editingButtons');
    }
  },

  $onlyOneSend: function(req, onlyOneSend) {
    if (req.channel.type !== 'control') return;
    onlyOneSend = !!onlyOneSend;
    if (this.frontends.onlyOneSend !== onlyOneSend) {
      this.frontends.onlyOneSend = onlyOneSend;
      this.saveFrontends();
      this.rpc('$setConfig', {onlyOneSend: this.frontends.onlyOneSend});
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        onlyOneSend: this.frontends.onlyOneSend
      }, '$onlyOneSend');
    }
  },

  $heading: function(req, heading) {
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
  },
  $description: function(req, description) {
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
  },
  // TODO Image

  addMessage: function(msg) {
    this.msgs[msg.id] = msg;
    this.msgIds.push(msg.id);
    //this.save();
    this.saveMessages(); // TODO throttled version
  },

  $writing: function(req) {

    if (!this.frontends.active) {
      if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
        return; // Or send info back
      }
    }

    if (req.channel.type === 'web') {
      // Send to other channels than web for now
      if (!this.notifyWritingOmitWebThrottled) {
        this.notifyWritingOmitWebThrottled = throttle(this.notifyWritingOmitWeb, 3000);
      }
      this.notifyWritingOmitWebThrottled();
    } else if (req.channel.type === 'control') {
      // Omitted.
    } else {
      // Other channels ignored for now (could inform control etc)
    }

  },

  notifyWritingOmitWeb: function() {
    // Send to all other than web
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$notifyWriting');
      }
    }
  },

  $msg: function(req, msgIn) {
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

    // TODO respect onlyOneSend block property (made live configurable via ONE_MSG flag)

    var username;
    if (this.frontends.usernames && msgIn.withUsername) {
      username = req.user.personas.username || '';
    } else {
      username = '';
    }

    var text = trimWhitespace(msgIn.text).substring(0, 500);

    // var mentions = twitterText.extractMentions(text);
    // if (mentions && mentions.length) {
    //   mentions.forEach(function(mention) {
    //     twitter.get('users/show', { screen_name: mention }, function(err, data, response) {
    //       console.log(data);
    //       //data.name
    //       //'@' + data.screen_name
    //       if (!data.default_profile_image) profile_image_url
    //     });
    //   });
    // }

    var parent;
    if (msgIn.parent) {
      // Only control and stage can reply for now
      if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
        return; // Or send info back
      }
      if (!this.msgs.hasOwnProperty(msgIn.parent)) {
        return;
      }
      parent = msgIn.parent;
    }

    var attrs = {
      text: text,
      username: username,
      q: this.frontends.moderated ? 'x' : '',
      admin: (req.channel.type === 'control'),
      parent: msgIn.parent
    };

    attrs.meta = {
      channelId: req.channel.id,
      userId: req.user.id
    };

    // TODO use some precalculated id perhaps
    // Perhaps move to addMessage
    this.updateParticipantCount(attrs.meta.channelId + ':' + attrs.meta.userId);

    var msg = new Message(attrs);
    // msg must always be valid
    msg.save();

    this.addMessage(msg);

    // Activity logging
    if (req.user.log) {
      // TODO overhaul this, otherwise moderation messes points calculation
      if (!attrs.q) {
        req.user.log('newMessage');
      }
    }

    // confirm ok
    req.reply(null);
    // send to channels

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
        parent: msg.parent
      }
    }, '$msg');

  },

  $editMsg: function(req, msgIn) {
    if (!msgIn) return;
    if (typeof msgIn.text !== 'string') return;

    // // Allow editing even if send form is hidden
    // if (!this.frontends.active) {
    //   if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
    //     return; // Or send info back
    //   }
    // }

    if (!this.frontends.editingButtons) {
       if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
         return; // Or send info back
       }
    }

    // TODO prevent successive duplicates from same person
    // (keep last message for each contributor and compare)
    // perhaps also throttle flooding from same person

    var text = trimWhitespace(msgIn.text).substring(0, 500);

    if (!this.msgs.hasOwnProperty(msgIn.id)) {
      return;
    }

    var msg = this.msgs[msgIn.id];

    // Don't allow editing of other's msgs, even from control
    if (msg.meta.userId !== req.user.id) {
      return;
    }

    msg.text = text;
    msg.save();

    // Activity logging
    if (req.user.log) {
      // TODO overhaul this, otherwise moderation messes points calculation
      //if (!attrs.q) {
      //  req.user.log('editMessage');
      //}
    }

    // confirm ok
    req.reply(null);
    // send to channels

    // One serialization
    //this.rpc('$msgIn', msg.toWire(req.user, req.channel));

    // Customization for each socket, could be in the hundreds
    for (var channelId in this.channels) {
      //this.rpc(channelId + ':$msgIn', msg.toWire(req));
      var channel = this.channels[channelId];
      for (var socketId in channel.eioSockets) {
        var socket = channel.eioSockets[socketId];
        if (!socket.user || !socket.rpc) continue;
        // TODO could send version number to allow easier updates
        socket.rpc(this.id + '.$msgIn', msg.toWire(socket.user, socket.channel));
      }
    }

    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      msgId: msg.id,
      text: msg.text
    }, '$editMsg');

  },

  $setQuality: function(req, msgId, q) {
    if (req.channel.type !== 'control') {
      return;
    }

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
        user.log('newMessageInvert');
      } else {
        // add points
        user.log('newMessage');
      }
    }

    // Will send an update to all channels
    //this.rpc('$msgIn', msg.toWire());

    for (var channelId in this.channels) {
      //this.rpc(channelId + ':$msgIn', msg.toWire(req));
      var channel = this.channels[channelId];
      for (var socketId in channel.eioSockets) {
        var socket = channel.eioSockets[socketId];
        if (!socket.user || !socket.rpc) continue;
        socket.rpc(this.id + '.$msgIn', msg.toWire(socket.user, socket.channel));
      }
    }

    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      msgId: msg.id,
      q: msg.q
    }, '$setQuality');

    // confirm ok
    //req.reply(null);
  },

  $addPointsToContributor: function(req, msgId) {
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
    }, '$addPointsToContributor');
  },

  // Almost the same as toggleTag below, which is used for highlights only
  // TODO move tags, picks and highlights to block config, not separate data
  $togglePick: function(req, msgId) {
    if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
      return;
    }

    if (!this.msgs.hasOwnProperty(msgId)) return;

    var msg = this.msgs[msgId];

    if (!this.picks) this.picks = [];

    var picks = this.picks;
    function findPosById(id) {
      for (var i = 0; i < picks.length; i++) {
        if (picks[i].id == msg.id) {
          return i;
        }
      }
      return null;
    }

    var position = findPosById(msg.id);
    if (position !== null) {
      // already picked, unpick
      this.picks.splice(position, 1);
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        msgId: msg.id,
        pick: false
      }, 'pick');

    } else {
      // Let's add a pick, use object to allow tags later perhaps
      this.picks.push({id: msg.id});
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        msgId: msg.id,
        pick: true
      }, 'pick');
    }

    // Update clients
    // Update block config or data?
    // Perhaps let's use data for now, still

    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$picksIn', this.picks);
      }
    }

    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      picks: this.picks
    }, '$togglePick');
  },

  // Mostly same as togglePick above.
  // TODO move tags and highlights to block config, not separate data
  $toggleTag: function(req, msgId, tag) {
    if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
      return;
    }

    if (!this.msgs.hasOwnProperty(msgId)) return;

    var msg = this.msgs[msgId];

    // TODO proper tagging
    // Not persisted yet
    if (tag !== 'screen') return;

    if (!this.highlights) this.highlights = [];

    var highlights = this.highlights;
    function findPosById(id) {
      for (var i = 0; i < highlights.length; i++) {
        if (highlights[i].id == msg.id) {
          return i;
        }
      }
      return null;
    }

    var position = findPosById(msg.id);
    if (position !== null) {
      // already highlighted, delighlight
      this.highlights.splice(position, 1);
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        msgId: msg.id,
        highlight: false
      }, 'highlight');

    } else {
      // Let's add a highlight, use object to allow tags later perhaps
      this.highlights.push({id: msg.id});
      console.info({
        userId: req.user.id,
        channelId: req.channel.id,
        blockId: this.id,
        msgId: msg.id,
        highlight: true
      }, 'highlight');
    }

    // Update clients
    // Update block config or data?
    // Perhaps let's use data for now, still

    // TODO will send also to web.
    //this.rpc('$highlightsIn', this.highlights);

    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$highlightsIn', this.highlights);
      }
    }

    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      highlights: this.highlights
    }, '$toggleTag');
  },

  // Almost the same as clearTags below, used for highlights
  $clearPicks: function(req) {
    if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
      return;
    }

    //if (!this.highlights) this.highlights = [];

    // Clear all!
    this.picks = [];

    // TODO will send also to web
    //this.rpc('$highlightsIn', this.highlights);
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$picksIn', this.picks);
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      picks: this.picks
    }, '$clearPicks');
  },

  $clearTags: function(req, tag) {
    if (req.channel.type !== 'control' && req.channel.type !== 'stage') {
      return;
    }
    // TODO proper tagging
    // Not persisted yet
    if (tag !== 'screen') return;

    //if (!this.highlights) this.highlights = [];

    // Clear all!
    this.highlights = [];

    // TODO will send also to web
    //this.rpc('$highlightsIn', this.highlights);
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$highlightsIn', this.highlights);
      }
    }
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      highlights: this.highlights
    }, '$clearTags');
  },

  updateParticipantCount: function(userId) {
    if (this.participants[userId]) return;

    this.participants[userId] = true; // TODO later more info
    this.participantCount++;

    console.info({
      blockId: this.id,
      participantCount: this.participantCount
    }, 'chatParticipantCount');

    if (!this.sendParticipantCountThrottled) {
      this.sendParticipantCountThrottled = throttle(this.sendParticipantCount, 1000);
    }
    this.sendParticipantCountThrottled();
    // TODO throttled save
    this.saveParticipants();
  },

  sendParticipantCount: function() {
    // TODO Will send only to control for now
    this.rpc('control:$setConfig', {participantCount: this.participantCount});
  },

  // TODO this single getter or multiple, for each feature?
  // Usually better to have consolidated in config and them
  // perhaps separate calls for features.
  $getData: function(req) {
    var maxCount = 500;
    if (req.channel.type === 'web') {
      maxCount = 50;
    }

    var msgs = this.msgs;
    var msgIds = this.msgIds;
    var outMsgs = [];

    // todo better buffer
    // Only 100 latest messages
    var i = msgIds.length - maxCount;
    if (i < 0) i = 0;

    for (; i < msgIds.length; i++) {
      var msg = msgs[msgIds[i]];
      if (msg) {
        // sends also hidden messages
        // TODO mark own messages
        outMsgs.push(msg.toWire(req.user, req.channel));
      }
    }

    // TODO properly
    var highlights = this.highlights || [];
    var picks = this.picks || [];
    if (req.channel.type === 'WEB') {
      // Don't push highlights and picks to participants yet.
      highlights = [];
      picks = [];
    }

    // TODO add total messages count or something to enable 'more' button
    req.reply({msgs: outMsgs, highlights: highlights, picks: picks});
  },

  // TODO getMoreData, where the parameters contain the last seen message id
  $getAllData: function(req) {
    return; // Disabled.

    var maxCount = 700;
    if (req.channel.type === 'web') {
      maxCount = 700;
    }

    //var state = {
    //  msgs: this.msgs
    //};

    var msgs = this.msgs;
    var msgIds = this.msgIds;
    var outMsgs = [];

    // todo better buffer
    // Only 100 latest messages
    var i = msgIds.length - maxCount;
    if (i < 0) i = 0;

    for (; i < msgIds.length; i++) {
      var msg = msgs[msgIds[i]];
      if (msg) {
        // sends also hidden messages
        // TODO mark own messages
        outMsgs.push(msg.toWire(req.user, req.channel));
      }
    }

    // TODO properly
    //var highlights = this.highlights || [];

    // TODO add total messages count or something to enable 'more' button
    //req.reply({msgs: outMsgs, highlights: highlights});
    req.reply({msgs: outMsgs});
  }

};

mergeInto(BlockConstructor.prototype, BlockConstructorMixin);

var BlockConstructorExportMixin = {
  __getBlockReport: function(timeDiff) {
    var out = '';
    out += this.frontends.heading + '\n\n';
    if (this.frontends.description) {
      out += this.frontends.description + '\n\n';
    }
    // TODO server side i18n
    if (SiteConfig.SITELANG === 'fi') {
      out += this.msgIds.length + ' viestiä, ' + this.participantCount + ' osallistujaa\n\n';
    } else {
      out += this.msgIds.length + ' messages, ' + this.participantCount + ' participants\n\n';
    }

    var msgs = this.msgs;
    var msgIds = this.msgIds;

    if (!msgIds.length) {
      return out;
    }

    for (var i = 0; i < msgIds.length; i++) {
      var msg = msgs[msgIds[i]];
      if (msg) {
        out += msg.toReport(timeDiff);
      }
    }

    return out;
  },

  __getBlockReportCSV: function(timeDiff) {
    var out = '';

    if (SiteConfig.SITELANG === 'fi') {
      out += 'KESKUSTELU\n';
    } else {
      out += 'DISCUSSION\n';
    }

    out += this.frontends.heading + '\n';
    if (this.frontends.description) {
      out += this.frontends.description + '\n';
    // } else {
    //   out += '\n';
    }
    // TODO server side i18n
    if (SiteConfig.SITELANG === 'fi') {
      out += this.msgIds.length + ' viestiä, ' + this.participantCount + ' osallistujaa\n';
    } else {
      out += this.msgIds.length + ' messages, ' + this.participantCount + ' participants\n';
    }

    var msgs = this.msgs;
    var msgIds = this.msgIds;

    if (!msgIds.length) {
      return out;
    }

    for (var i = 0; i < msgIds.length; i++) {
      var msg = msgs[msgIds[i]];
      if (msg) {
        out += msg.toCSV(timeDiff);
      }
    }

    return out;
  },

  // CSV prototype
  // TODO remove
  $export: function(req) {
    if (req.channel.type !== 'control') return;
  }
};

mergeInto(BlockConstructor.prototype, BlockConstructorExportMixin);


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
  this.parent = options.parent;
  // if (options.promoted) {
  //   options.promoted = true;
  // }
  // Twitter integration
  if (options.tweetId) {
    this.tweetId = options.tweetId;
    this.html = options.html;
  }
  //this.tags = [];
  //this.points = 0;
}

var MessageStatics = {
  load: function(id) {
    var config = db.get(id);
    if (!config) return;
    return new Message(config);
  }
};

mergeInto(Message, MessageStatics);

var MessageMixin = {
  save: function() {
    db.set(this.id, {
      id: this.id,
      tc: this.tc,
      meta: this.meta,
      text: this.text,
      username: this.username,
      q: this.q,
      admin: this.admin,
      parent: this.parent,
      //promoted: this.promoted, // mostly undefined
      tweetId: this.tweetId, // only for tweets, otherwise undefined
      html: this.html // only for tweets, otherwise undefined
    });
    return this;
  },
  // toWire could also pack and provide fromWire for clients
  toWire: function(user, channel) {
    var out = {
      id: this.id,
      time: this.tc,
      text: this.text,
      q: this.q,
      admin: this.admin ? true : undefined,
      username: this.username ? this.username : '',
      parent: this.parent ? this.parent : undefined
      //promoted: this.promoted ? true : undefined
      //isWire: true
    };
    if (this.tweetId) {
      out.html = this.html || '';
    }
    if (this.meta && user && channel) {
      if (this.meta.userId === user.id && this.meta.channelId === channel.id) {
        out.own = true;
      }
    }
    return out;
  },
  toReport: function(timeDiff) {
    var out = '';
    if (this.q) {
      return out;
    }

    //out += new Date(this.tc).toISOString() + ' ';
    var date = new Date(this.tc + timeDiff);
    var hours = date.getUTCHours();
    if (hours < 10) hours = '0' + hours;
    var minutes = date.getUTCMinutes();
    if (minutes < 10) minutes = '0' + minutes;
    out += hours + ':' + minutes + ' » '
    out += this.text + ' ';
    if (this.username) {
      out += ' – ' + this.username + ' ';
    }
    if (this.admin) {
      //out += ' (admin) ';
      out += ' (*) ';
    }
    out += '\n';
    return out;
  },
  toCSV: function(timeDiff) {
    var out = '';
    if (this.q) {
      return out;
    }
    var date = new Date(this.tc + timeDiff);
    // if (hours < 10) hours = '0' + hours;
    // var hours = date.getUTCHours();
    // if (hours < 10) hours = '0' + hours;
    // var minutes = date.getUTCMinutes();
    // if (minutes < 10) minutes = '0' + minutes;
    // out += hours + ':' + minutes + '\t'

    out += this.text + '\t';

    if (this.username) {
      out += this.username + '\t';
    } else {
      out += '\t';
    }

    out += date.toISOString().substring(0, 19) + '\t';

    if (this.admin) {
      //out += ' (admin) ';
      out += '(control)\t';
    } else {
      out += '\t';
    }
    out += '\n';
    return out;
  }
};

mergeInto(Message.prototype, MessageMixin);

// Experimental twitter integration
function initTwitter(block) {
  if (TWITTER_ACTIVE) {
    return;
  }
  TWITTER_ACTIVE = true;

  var SEARCH_QUERY = '';
  var STREAM_QUERY = '';
  var keywords = block.frontends.heading.match(/#\w+/g);
  if (!keywords) {
    return;
  } else {
    SEARCH_QUERY = keywords.join(' OR ');
    STREAM_QUERY = keywords.join(',');
  }
  if (!SEARCH_QUERY) {
    return;
  }

  // Quick hash index to prevent duplicates
  block.tweetIds = {};

  block.msgIds.forEach(function(msgId) {
    var msg = block.msgs[msgId];
    if (msg && msg.tweetId) {
      block.tweetIds[msg.tweetId] = true;
    }
  });

  // TODO should use "since today morning" as othewise displayed timestamps are misleading
  twitter.get('search/tweets', { q: SEARCH_QUERY + ' -RT since:2013-11-01', count: 20 }, function(err, reply) {
    if (reply && reply.statuses) {
      reply.statuses.reverse().forEach(function(tweet) {
        processTweet(tweet, block);
      });
    }
  });

  // Note: In a rare case if a new tweet comes as the block is instantiating,
  // stream updates can arrive before history search, resulting wrong order, but ok for now.
  var stream = twitter.stream('statuses/filter', { track: STREAM_QUERY });
  stream.on('tweet', function(tweet) {
    processTweet(tweet, block);
  });
  stream.on('error', function(err) {
    console.error('Twitter error');
    console.error(err);
  });
  // stream.on('delete', function(deleteMessage) {
  //   // TODO hide
  // });
  // stream.on('limit', function(limitMessage) {
  // });
  // stream.on('disconnect', function(disconnectMessage) {
  // });
  // stream.on('connect', function(httpRequest) {
  // });
  // stream.on('reconnect', function(httpRequest, httpResponse, connectInterval) {
  // });
  // stream.on('warning', function(warning) {
  // });
  // stream.stop();
  // stream.start();
}

function processTweet(tweet, block) {
  if (!tweet) {
    return;
  }
  if (!tweet.text) {
    return;
  }
  // Discard retweets without added commentary
  if (tweet.text.indexOf('RT ') === 0) {
    return;
  }
  if (!tweet.id_str) {
    return;
  }
  var tweetId = 't' + tweet.id_str;
  // Ignore duplicates
  if (block.tweetIds[tweetId]) {
    return;
  }
  block.tweetIds[tweetId] = true;

  var attrs = {};

  attrs.tweetId = tweetId;

  if (!tweet.created_at) {
    return;
  }
  attrs.tc = +new Date(tweet.created_at) || Date.now();
  attrs.text = tweet.text || '';
  //attrs.source = tweet.source;
  //attrs.trucated = tweet.truncated;
  if (!tweet.user) {
    return;
  }
  // Redundant (will be baked into attrs.html) but should be included for report
  // if (this.frontends.usernames) {}
  //attrs.username = tweet.user.name + ' @' + tweet.user.screen_name;
  attrs.username = '';
  attrs.q = block.frontends.moderated ? 'x' : '';

  // Generate html content for tweets to simplify formatting on frontend.
  var htmlText = tweet.text;

  if (tweet.entities && tweet.entities.hashtags) {
    tweet.entities.hashtags.forEach(function(hashtag) {
      htmlText = htmlText.replace('#' + hashtag.text, '<span class="text-primary">#' + hashtag.text + '</span>');
    });
  }
  if (tweet.entities && tweet.entities.user_mentions) {
    tweet.entities.user_mentions.forEach(function(user_mention) {
      htmlText = htmlText.replace('@' + user_mention.screen_name, '<span class="text-info">@' + user_mention.screen_name + '</span>');
    });
  }
  if (tweet.entities && tweet.entities.urls) {
    tweet.entities.urls.forEach(function(url) {
      htmlText = htmlText.replace(url.url, '<span class="text-muted">' + url.display_url + '</span>');
    });
  }

  attrs.html = '' +
    //_.escape(tweet.text) +
    '<span>' + htmlText + '<br>' +
    '<div class="small text-right">&ndash; ' +
    '<strong>' + tweet.user.name + '</strong>' +
    ' <span class="text-muted">@' + tweet.user.screen_name + '</span> ' +
    //moment(tweet.created_at).fromNow() +
    //moment(tweet.created_at).format('hh.mm:ss') +
    '</div></span>';

  // TODO use some precalculated id perhaps
  //this.updateParticipantCount(attrs.meta.channelId + ':' + attrs.meta.userId);

  var msg = Message(attrs);
  msg.save();
  block.addMessage(msg);

  // On first block instantiation when populating the history, will send each message separately to each socket,
  // so a bit of traffic there..

  // Customization for each socket, could be in the hundreds
  for (var channelId in block.channels) {
    //this.rpc(channelId + ':$msgIn', msg.toWire(req));
    var channel = block.channels[channelId];
    for (var socketId in channel.eioSockets) {
      var socket = channel.eioSockets[socketId];
      if (!socket.user || !socket.rpc) continue;
      socket.rpc(block.id + '.$msgIn', msg.toWire(socket.user, socket.channel));
    }
  }

  // TODO logging
}

function trimWhitespace(str) {
  str = str.replace(/\s/g, ' '); // convert all non-printable chars to a space
  str = str.replace(/^\s+|\s+$/g, ''); // begin end
  str = str.replace(/\s\s+/g, ' '); // middle
  return str;
}

// todo get more messages

if (!module.parent) {
  debug('block standalone');
}

/**
 * Exports a block backend instance constructor
 */

module.exports = BlockConstructor;
