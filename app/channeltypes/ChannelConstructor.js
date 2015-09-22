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
 * Channel constructor (all types come from single constructor for now)
 */

var debug = require('debug')('io:ChannelConstructor'); debug('module loading');
var console = require('../lib/Logger')('io:ChannelConstructor');

var connDebug = require('debug')('io:connDebug');

/**
 * Dependencies
 */

var SiteConfig = require('../lib/SiteConfig');
var BlockStore = require('../lib/BlockStore');
//var ChannelStore = require('../lib/ChannelStore');
var rpc = require('../lib/rpc');
var DataStore = require('../lib/DataStore');
var db = DataStore.namespace('ChannelConstructor');
var ChannelConstructorHttp = require('./ChannelConstructorHttp');
var ChannelConstructorEio = require('./ChannelConstructorEio');
var DEV = require('../lib/DEV');
var invariant = require('../lib/utils/invariant');
var mixInto = require('../lib/utils/mixInto');

/**
 * Channel Backend constructor
 */
function ChannelConstructor(options) {
  if (!(this instanceof ChannelConstructor)) return new ChannelConstructor(options);
  options = options || {};

  invariant(options.id, 'ChannelConstructor: .id required.');
  this.id = options.id || db.getUniqueId();

  // Type is configurable due to sharing of constructors, remove later
  invariant(options.type, 'ChannelConstructor: .type required.');
  this.type = options.type;

  invariant(options.config, 'ChannelConstructor: .config required.');
  this.config = {};

  invariant(
    options.config.channelRoute,
    'ChannelConstructor: .config.channelRoute required.'
  );
  this.config.channelRoute =
      options.config.channelRoute;

  debug(
    'constructing %s %s channel backend instance at /%s/%s',
    SiteConfig.SITELANG, this.type, SiteConfig.SITEROUTE,
    this.config.channelRoute
  );
  this.debug = require('debug')('io:channel:' + this.config.channelRoute);

  this.config.title =
      options.config.title ||
      SiteConfig.SITEROUTE + '/' + options.config.channelRoute;

  // Create shallow copy of VISIBLE_BLOCKTYPES array but could use a global
  // NOTE: If config changed, db should be cleared in dev to get the new defaults,
  // so we'll not persist this yet for ease of adding blocktypes.
  this.config.loadedBlocktypes =
      //options.config.loadedBlocktypes ||
      SiteConfig.VISIBLE_BLOCKTYPES.slice();

  this.version = options.version || 1;
  // NOTE: if process crashes and it is restarted, the build version
  // is updated which will trigger client refreshes on their reconnection.
  this.increaseVersion();

  this.blockIds = options.blockIds || [];
  // Configure blocks for this channel
  this.blockIds.forEach(function(blockId) {
    var block = BlockStore.getBlock(blockId);
    invariant(block, 'Block id %s not found', blockId);
    block.__injectChannel(this);
  }, this);

  // Add also to core block for now
  BlockStore._blocks.core.__injectChannel(this);

  ChannelConstructorHttp.init(this);

  ChannelConstructorEio(this);
}

/**
 * Instance methods in channel prototype
 */

var ChannelConstructorMixin = {

  /**
   * Persistence
   */
  save: function() {
    debug('saving instance %s', this.id);
    db.set(this.id + 'type', this.type);
    db.set(this.id, this.config);
    db.set(this.id + 'version', this.version);
    db.set(this.id + 'blockIds', this.blockIds);
    return this;
  },

  increaseVersion: function() {
    this.version = this.version || 1;
    this.version++;
    db.set(this.id + 'version', this.version);
    return this;
  },

  /**
   * Block actions
   */
  attachBlock: function(block) {
    this.blockIds.unshift(block.id);
    this.save();
    block.__injectChannel(this);
    for (var id in this.eioSockets) {
      var socket = this.eioSockets[id];
      if (!socket.user || !socket.rpc) continue;
      socket.rpc('core.$setConfig', {
        // If block creation can affect other blocks, should perhaps reload all blocks
        // Otherwise partial update is sufficient
        blockConfigs: [block.__getBlockFrontendConfigForChannelUser(this, socket.user)],
        blockOrder: this.blockIds // TODO FIXME currently blockOrder has to be after blockConfigs, in hash!
      });
    }
  },

  detachBlock: function(block) {
    for (var i = 0; i < this.blockIds.length; i++) {
      if (this.blockIds[i] === block.id) {
        this.blockIds.splice(i, 1);
        this.save();
        var configUpdate = {
          blockOrder: this.blockIds
        };
        rpc.send(this.eioSockets, ['core.$setConfig', configUpdate]);
        break;
      }
    }
  },

  liftBlock: function(block) {
    for (var i = 0; i < this.blockIds.length; i++) {
      if (this.blockIds[i] === block.id) {
        if (i === 0) break; // already top
        var from = i;
        var to = i - 1;
        this.blockIds.splice(to, 0, this.blockIds.splice(from, 1)[0]);
        this.save();
        var configUpdate = {
          blockOrder: this.blockIds
        };
        rpc.send(this.eioSockets, ['core.$setConfig', configUpdate]);
        break;
      }
    }
  },

  // Or parametrize liftBlock/moveBlock
  lowerBlock: function(block) {
    for (var i = 0; i < this.blockIds.length; i++) {
      if (this.blockIds[i] === block.id) {
        if (i === this.blockIds.length - 1) break; // already bottom
        var from = i;
        var to = i + 1;
        this.blockIds.splice(to, 0, this.blockIds.splice(from, 1)[0]);
        this.save();
        var configUpdate = {
          blockOrder: this.blockIds
        };
        rpc.send(this.eioSockets, ['core.$setConfig', configUpdate]);
        break;
      }
    }
  },

  /**
   * A getter for channel config object (set on clientWindow initial page load
   * and reconnects)
   */
  getChannelFrontendConfigForUser: function(user) {

    var channelFrontendConfig = {
      displayUrl: SiteConfig.DISPLAY_URL,
      siteRoute: SiteConfig.SITEROUTE,
      channelRoute: this.config.channelRoute,
      version: this.version,
      USERNAMES: SiteConfig.USERNAMES,
      title: this.config.title,
      blocktypes: this.config.loadedBlocktypes,
      blockConfigs: this.getBlockFrontendConfigsForUser(user),
      blockOrder: this.blockIds, // TODO FIXME currently blockOrder has to be after blockConfigs, in hash!
      blockFrontendAssetUrls: this.getBlockFrontendAssetUrls(),
      // TODO add (static) blocktypeConfigs here, and move core config, for example, there
      coreConfig: BlockStore._blocks.core.__getBlockFrontendConfigForChannelUser(this, user)
    };

    // TODO move to core block
    if (user.personas.groupId) {
      channelFrontendConfig.groupId = user.personas.groupId;
    }

    if (SiteConfig.SHOW_CSV_EXPORT) {
      channelFrontendConfig.SHOW_CSV_EXPORT = SiteConfig.SHOW_CSV_EXPORT;
    }

    // TODO move
    if (user.personas.userpin) {
      channelFrontendConfig.userpin = user.personas.userpin;
    }
    if (user.personas.networkingCode) {
      channelFrontendConfig.networkingCode = user.personas.networkingCode;
    }

    if (SiteConfig.SHOWRATINGSTATS) {
      channelFrontendConfig.SHOWRATINGSTATS = SiteConfig.SHOWRATINGSTATS;
    }

    // TODO move
    if (SiteConfig.POINTS) {
      channelFrontendConfig.POINTS = SiteConfig.POINTS;
      if (this.type !== 'web') {
        channelFrontendConfig.scoreboard = BlockStore._blocks.core.scoreboardToWire();
        //channelFrontendConfig.scoreboardTotal = BlockStore._blocks.core.scoreboardTotal;
        channelFrontendConfig.scoreboardOnScreen = BlockStore._blocks.core.scoreboardOnScreen;
      }
    }
    if (user.personas.points) {
      channelFrontendConfig.points = user.personas.points;
    }

    if (user.personas.username) {
      channelFrontendConfig.username = user.personas.username;
    }

    // TODO move to own block
    if (SiteConfig.USERPIN) {
      channelFrontendConfig.USERPIN = SiteConfig.USERPIN;
    }
    // TODO move to own block
    if (SiteConfig.NETWORKING) {
      channelFrontendConfig.NETWORKING = SiteConfig.NETWORKING;
    }
    if (SiteConfig.USERLIST) {
      channelFrontendConfig.networkingList = user.__networkToWire();
    }

    if (this.type === 'control') {
      channelFrontendConfig.userlist = SiteConfig.USERLIST;
      channelFrontendConfig.sockets = BlockStore._blocks.core.socketsToWire();
    }

    if (SiteConfig.EDITING) {
      channelFrontendConfig.EDITING = SiteConfig.EDITING;
    }
    if (SiteConfig.REPLYING) {
      channelFrontendConfig.REPLYING = SiteConfig.REPLYING;
    }
    if (SiteConfig.ONE_MSG) {
      channelFrontendConfig.ONE_MSG = SiteConfig.ONE_MSG;
    }
    if (SiteConfig.NOTIFYWRITING) {
      channelFrontendConfig.NOTIFYWRITING = SiteConfig.NOTIFYWRITING;
    }
    if (SiteConfig.INVERTING) {
      channelFrontendConfig.INVERTING = SiteConfig.INVERTING;
    }

    if (SiteConfig.MEANVAR) {
      channelFrontendConfig.MEANVAR = SiteConfig.MEANVAR;
    }

    if (SiteConfig.SHOW_PICK_BUTTONS) {
      channelFrontendConfig.SHOW_PICK_BUTTONS = SiteConfig.SHOW_PICK_BUTTONS;
    }

    if (SiteConfig.SCREEN_IMAGE) {
      channelFrontendConfig.SCREEN_IMAGE = SiteConfig.SCREEN_IMAGE;
    }

    if (SiteConfig.FOOTER_IMAGE) {
      channelFrontendConfig.FOOTER_IMAGE = SiteConfig.FOOTER_IMAGE;
      // FOOTER_IMAGE_CLASS '', 'center-block' or 'pull-right'
      channelFrontendConfig.FOOTER_IMAGE_CLASS = SiteConfig.FOOTER_IMAGE_CLASS || '';
    }

    // Think where to add core block vs channel props
    // Perhaps a separate getFrontendConfigForChannelUser call for core?
    channelFrontendConfig.invertColors = BlockStore._blocks.core.frontends.invertColors;
    if (this.type !== 'web') {
      channelFrontendConfig.socketCount = BlockStore._blocks.core.socketCount;
      channelFrontendConfig.showSiteUrl = BlockStore._blocks.core.frontends.showSiteUrl;
      channelFrontendConfig.showSocketCount = BlockStore._blocks.core.frontends.showSocketCount;
    }
    if (this.type !== 'screen') {
      channelFrontendConfig.showUsernameInput = BlockStore._blocks.core.frontends.showUsernameInput;
    }

    return channelFrontendConfig;
  },

  getBlockFrontendConfigsForUser: function(user) {
    var frontendConfigs = [];
    for (var i = 0; i < this.blockIds.length; i++) {
      var blockId = this.blockIds[i];
      var block = BlockStore.getBlock(blockId);
      if (!block) {
        console.error('block not found!')
        continue;
      }
      frontendConfigs[i] =
        block.__getBlockFrontendConfigForChannelUser(this, user);
    }
    return frontendConfigs;
  },

  getBlockFrontendAssetUrls: function() {
    var assetUrls = {};

    assetUrls.core =
        BlockStore._constructors.core.__getFrontendAssetUrlsForChannel(this);

    // TODO perhaps include only loaded but not active blocktypes
    for (var i = 0; i < this.config.loadedBlocktypes.length; i++) {
      var blocktype = this.config.loadedBlocktypes[i];

      var blockConstructor = BlockStore._constructors[blocktype];
      if (blockConstructor.__getFrontendAssetUrlsForChannel) {
        assetUrls[blocktype] =
            blockConstructor.__getFrontendAssetUrlsForChannel(this);
      } else {
        // default
        // TODO modify builder
        assetUrls[blocktype] = {
          js: [{
            url:
              '/' + SiteConfig.SITEROUTE + '/assets/' + blocktype + '/' +
              blocktype + '-' + SiteConfig.SITELANG + '-' + this.type +
              '.min.js.gz_'
          }]
        };
      }
    }
    return assetUrls;
  },

  // TODO think whether to include block data among frontendconfig already?
  // Yes, perhaps get rid of this separate data.
  getBlockFrontendData: function(httpRequest) {
    var frontendData = {};
    for (var i = 0; i < this.blockIds.length; i++) {
      var blockId = this.blockIds[i];
      var block = BlockStore.getBlock(blockId);
      if (block.__getFrontendDataForChannel) {
        frontendData[blockId] =
            block.__getFrontendDataForChannel(this, httpRequest);
      }
    }
    return frontendData;
  },

  getBlockReports: function(timeDiff) {
    //timeDiff = timeDiff|0; // Cast to int. Note that 100 days
    if (typeof timeDiff !== 'number') timeDiff = 0;
    //timeDiff = timeDiff|0; // too large timestamp may overflow!

    var out = '';
    out += SiteConfig.DISPLAY_URL + '\n\n\n';
    for (var i = 0; i < this.blockIds.length; i++) {
      var blockId = this.blockIds[i];
      var block = BlockStore.getBlock(blockId);
      if (!block) {
        console.error('block report not found!')
        continue;
      }
      if (typeof block.__getBlockReport !== 'function') {
        console.error('block type ' + block.type + ' does not implement __getBlockReport');
        continue;
      }
      out += block.__getBlockReport(timeDiff) + '\n\n';
    }
    return out;
  },

  getBlockReportsCSV: function(timeDiff) {
    //timeDiff = timeDiff|0; // Cast to int. Note that 100 days
    if (typeof timeDiff !== 'number') timeDiff = 0;
    //timeDiff = timeDiff|0; // too large timestamp may overflow!

    var out = '';
    out += SiteConfig.DISPLAY_URL + '\n';
    var date = new Date(Date.now() + timeDiff);
    out += date.toISOString().substring(0, 10) + '\n\n';

    for (var i = 0; i < this.blockIds.length; i++) {
      var blockId = this.blockIds[i];
      var block = BlockStore.getBlock(blockId);
      if (!block) {
        console.error('block report not found!')
        continue;
      }
      if (typeof block.__getBlockReportCSV !== 'function') {
        console.error('block type ' + block.type + ' does not implement __getBlockReportCSV');
        continue;
      }
      out += block.__getBlockReportCSV(timeDiff) + '\n';
    }
    return out;
  }

};

mixInto(ChannelConstructor, ChannelConstructorMixin);

mixInto(ChannelConstructor, ChannelConstructorHttp.Mixin);

/**/
var util = require('util');
var inspect = function(obj) {
  console.log(util.inspect(obj, false, 2, true));
};

/**/



/**
 * Exports
 */

var ChannelFactory = {

  createChannel: function(configIn) {
    debug('createChannel called: %j', configIn);
    // Convert config.json to channel schema
    // Could check required props already here or in constructor
    var channelConfig = {
      id: configIn.id, // required in config, otherwise would create duplicates
      type: configIn.type,
      config: {
        channelRoute: configIn.route,
        title: configIn.title
      }
    };
    var channel = new ChannelConstructor(channelConfig);
    channel.save();
    return channel;
  },

  loadChannel: function(id) {
    debug('loadChannel called: %s', id);
    var config = db.get(id);
    if (!config) {
      debug('config not found: %s', id);
      return;
    }
    // Do schema migration here if you really need
    return new ChannelConstructor({
      id: id,
      type: db.get(id + 'type'),
      config: config,
      version: db.get(id + 'version'),
      blockIds: db.get(id + 'blockIds')
    });
  },
};

module.exports = ChannelFactory;
