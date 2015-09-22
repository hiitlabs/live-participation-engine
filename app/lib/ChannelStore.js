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
 * ChannelStore (web, control, screen, stage)
 */

var debug = require('debug')('io:ChannelStore'); debug('module loading');
var console = require('./Logger')('io:ChannelStore');
var invariant = require('./utils/invariant');

// Dependencies
var SiteConfig = require('./SiteConfig');
var DataStore = require('./DataStore');

/**
 * Channels and channel constructors are stored in these run time objects
 */

var ChannelConstructors = {};

var ChannelInstances = {};

/**
 * All channels are persisted in a single object by id-type pairs
 */

var db = DataStore.namespace('ChannelStore');

var persistedChannelRefs = [];

function saveChannelRefs() {
  db.set('refs', persistedChannelRefs);
}

function loadChannelRefs() {
  persistedChannelRefs = db.get('refs') || [];
}

/**
 * Helpers
 */

function loadChannelConstructors() {
  if (Object.keys(ChannelConstructors).length) {
    console.warn('ChannelConstructors already loaded')
    return;
  }
  SiteConfig.BUILT_CHANNELTYPES.forEach(function(channeltype) {
    ChannelConstructors[channeltype] = loadChannelConstructor(channeltype);
  });
}

function loadChannelConstructor(channeltype) {
  debug('loading ChannelConstructor: %s', channeltype);
  invariant(
    !ChannelConstructors.hasOwnProperty(channeltype),
    'Already loaded: %s.',
    channeltype
  );

  var ChannelConstructor = require('../channeltypes/ChannelConstructor');

  return ChannelConstructor;
}


function loadChannels() {
  debug('loadChannels called');
  if (persistedChannelRefs.length) {
    console.warn('channels already loaded');
    return;
  }
  loadChannelRefs();

  persistedChannelRefs.forEach(function(channelRef) {
    debug('loading channel: %j', channelRef);
    var ChannelConstructor = ChannelConstructors[channelRef.type];
    invariant(
      ChannelConstructor, 'Channeltype %s unavailable.', channelRef.type
    );
    var channel = ChannelConstructor.loadChannel(channelRef.id);
    invariant(
      channel,
      'Not found: channel id %s, type %s. Clear db?',
      channelRef.id,
      channelRef.type
    );
    // Could validate channel interface here
    invariant(
      !ChannelInstances[channel.id],
      'Channel %s, type %s already instantiated.',
      channel.id,
      channel.type
    );
    ChannelInstances[channel.id] = channel;
  });

  if (!persistedChannelRefs.length) {
    debug('first run');
    firstRun();
  } else {
    debug('channels existing, ignoring default config');
  }
}

function firstRun() {
  // Note: if config changed in dev, new default channels will be added
  // only if db cleared.

  // First run: instantiate default channels
  SiteConfig.DEFAULT_CHANNELINSTANCES.forEach(function(channelConfig) {
    debug('uninitialized default channel: %j, initializing', channelConfig);
    var ChannelConstructor = ChannelConstructors[channelConfig.type];
    invariant(
      ChannelConstructor,
      'Default channeltype %s unavailable.',
      channelConfig.type
    );
    var channel = ChannelConstructor.createChannel(channelConfig);
    invariant(
      channel,
      'Default channel could not be created: channel id %s, type %s. Clear db?',
      channelConfig.id,
      channelConfig.type
    );
    addChannel(channel);
  });
}

function addChannel(channel) {
  debug('adding channel %s %s', channel.id, channel.type);
  invariant(channel.id, 'Channel id missing.');
  invariant(channel.type, 'Channel type missing.');
  if (ChannelInstances[channel.id]) {
    console.warn('tried to add channel twice');
    return;
  }
  ChannelInstances[channel.id] = channel;
  persistedChannelRefs.push({id: channel.id, type: channel.type});
  saveChannelRefs();
}

/**
 * Exports
 */

var ChannelStore = {

  _channelConstructors: ChannelConstructors, // Expose for now

  _channels: ChannelInstances, // Expose for now

  loadChannelConstructors: loadChannelConstructors,

  loadChannels: loadChannels,

  attachBlockToChannels: function(block) {
    for (var channelId in ChannelInstances) {
      var channel = ChannelInstances[channelId];
      channel.attachBlock(block);
    }
  },

  detachBlockFromChannels: function(block) {
    for (var channelId in ChannelInstances) {
      var channel = ChannelInstances[channelId];
      channel.detachBlock(block);
    }
  },

};

module.exports = ChannelStore;
