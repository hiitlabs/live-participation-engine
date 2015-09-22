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
 * Channel init
 */

// Stub console.log etc functions if missing
//if (typeof window.console === 'undefined') {
//  window.console = {};
//}

function noop(){}
if(!window.console) { window.console = {log:noop,warn:noop,error:noop}; }
if(!window.console.time) { window.console.time = window.console.timeEnd = noop; }
if(!window.console.profile) { window.console.profile = noop; }
if(!window.console.group) { window.console.group = window.console.groupEnd = window.console.groupCollapsed = noop; }
//if(!window.performance) { window.perfomance = {}; }
//if(!window.performance.now) { window.perfomance.now = noop; }

// Simple framekiller if needed
//if (top != self) top.location.replace(location);

/*
  console.log = function() {
    if (__DEV__) {
      var args = JSON.stringify(Array.prototype.slice.call(arguments));
      $(function() {
        $('<div>').html('LOG: ' + args).prependTo('body');
      });
    }
  };
*/

// TODO affects localstorage
require('/visionmedia-debug').enable('');

// Possibility of custom error reporting
require('./errors');

// Inject custom CSS styles
require('./styles.js');

// TODO get only needed parts from modernizr
require('./modernizr.js');

// MediaQuery polyfill for IE8 and others, might need respond.update if
// stylesheets added later (but works only on links, not inline yet)
require('./respond.js')

// Inject bootstrap.js to global scope
require('./bootstrap');

var Emitter = require('./emitter');

// Url hash checker
require('./hash');

// There is a single core block for now, that keeps track of channelConfig
var core = exports = module.exports = {id: 'core', type: 'core'};
core.config = {};

// There is a single events bus for now
require('./events');
// Perhaps better to just emit via core block?
Emitter(core);

// Channel update, called from socket on any blockConfigs update and also on (re)connect
core.$setConfig = function(configUpdate) {
  for (var key in configUpdate) {
    core.emit('update:' + key, configUpdate[key]);
    core.config[key] = configUpdate[key];
  }
  core.emit('configUpdated', configUpdate);
};
// Server sends info about active sockets to control channel, not used yet really.
core.$setSocket = function(updatedSocket) {
  var sockets = core.config.sockets || (core.config.sockets = {});
  var id = updatedSocket.id;
  if (!id) return;
  var socket = sockets[id];
  if (socket) {
    if (updatedSocket.removed) {
      // remove socket?
    }
    for (var key in updatedSocket) {
      socket[key] = updatedSocket[key];
    }
    core.emit('socketUpdated', socket);
  } else {
    // new socket
    sockets[id] = updatedSocket;
    // Validate in case partial update?
    core.emit('socketAdded', updatedSocket);
  }
  core.emit('update:sockets', sockets);
}

core.on('update:version', function(newVersion) {
  if (newVersion !== core.config.version) {
    if (__DEV__) console.log('version update %s -> %s', core.config.version, newVersion);
    var delay = 0;
    if (__DEV__) console.log('reloading after %s s', delay);
    setTimeout(function() {
      location.reload();
    }, delay*1000 || 0);
    return;
  }
});
// TODO other change listeners such as title etc

core.on('update:blockConfigs', function(blockConfigs) {
  // Will create new blocks if missing from blocks.instances
  var focusState = getFocusState();
  blocks.setBlockConfigs(blockConfigs);
  restoreFocusState(focusState);
});
core.on('update:blockOrder', function(blockOrder) {
  // Will delete blocks and handle newly created and moved blocks
  // TODO insert placeholder element if this comes before config
  var focusState = getFocusState();
  blocks.setBlockOrder(blockOrder);
  restoreFocusState(focusState);
});

function getFocusState() {
  var activeElement;
  try {
    activeElement = document.activeElement;
  } catch(e) {}
  var nodeName =
    activeElement &&
    activeElement.nodeName &&
    activeElement.nodeName.toLowerCase();

  // Handles only text input and textarea, not contenteditable
  if (nodeName && (
    (nodeName === 'input' && activeElement.type === 'text') ||
    nodeName === 'textarea'
  )) {
    if ('selectionStart' in activeElement) {
      // Modern browser with input or textarea.
      return {
        activeElement: activeElement,
        selection: {
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd
        }
      };
    }
  }
  return null;
}

function restoreFocusState(focusState) {
  if (!focusState) {
    return;
  }

  var currentActiveElement;
  try {
    currentActiveElement = document.activeElement;
  } catch(e) {}

  if (currentActiveElement === focusState.activeElement) {
    return;
  }

  var start = focusState.selection.start;
  var end = focusState.selection.end;
  if (typeof end === 'undefined') {
    end = start;
  }

  if ('selectionStart' in focusState.activeElement) {
    focusState.activeElement.selectionStart = start;
    focusState.activeElement.selectionEnd =
      Math.min(end, focusState.activeElement.value.length);
  }

  try {
    focusState.activeElement.focus();
  } catch (e) {}
}

core.$close = function(reason) {
  if (__DEV__) console.log('core.$close called', reason);
  // Close socket without issuing reconnect (too many sockets, for instance);
  if (!__SCREEN__) {
    showDisconnected(reason);
  }
  require('./socket').close();
};
function showDisconnected(reason) {
  $('#disconnected').remove();
  var dict = require('./lang');
  var modalFn = require('./modal.html');
  // TODO translate reason too ("Opened in another tab.")
  var params = _.extend({reason: reason}, dict);
  var $modal = $(modalFn(params));
  $modal.prependTo('body');
  $modal.on('show.bs.modal', function() {
    $('#disconnected a.btn').on('click', function(e) {
      location.reload();
    });
  });
  $modal.modal({
    backdrop: 'static',
    keyboard: false,
    show: true // ensure the modal is shown immediately
  });
}
core.$reload = function(delay) {
  if (__DEV__) console.log('core.$reload called', delay);
  // Reload page (different version, for example)
  if (__DEV__) console.log('reloading after %s s', delay);
  setTimeout(function() {
    location.reload();
  }, delay*1000 || 0);
};
core.$event = function() {
  // Allows receiving global events from the serverside (not used yet)
};
core.$getInfo = function() {
  // Allows server to query client info (not really used yet)
}

// There is a single blocks instance collection for now
// blocks[blockid].$method can be called from the server
var blocks = require('./blocks');
// Publish core block specially for now
blocks.core = blocks.instances.core = core;

// Channel init, called from index.html on load
exports.init = function(initialConfig) {
  if (__DEV__) console.log('CHANNEL INIT', initialConfig);

  // TODO alternatively publish initialConfig as global already
  core.config = initialConfig;

  // Check for global variable leaks
  if (__DEV__) require('./leaks');

  // Due to unresolved connection problems on some devices, let's defer this to next tick
  // or even domready for now
  if (__DEV__) console.time('waiting for dom ready')
  $(function() {
    // Using touch event for clicks on mobile browsers, can introduce bugs sometimes
    // for some things (such as boostrap dropdowns)
    require('./fastclick')(document.body);

    continueInit();
  });
};

function continueInit() {
  if (__DEV__) console.timeEnd('waiting for dom ready');
  if (__DEV__) console.log('CONTINUING INIT');

  // Require rpc to start connecting right away.
  // Note: rpc('blockid.$method', arg1, ..., [cb]) calls server methods
  require('./rpc');
  // Browser wakeup (from sleep) checker, will emit 'wakeup' events
  require('./wakeup');
  // Localized time calculations
  require('./moment-short');
  require('./moment-lang');
  // Notifications and dialogs
  require('./notifications');

  // Index.html is rendered on client for now.
  require('./render');

  // Start instantiating blocks
  core.emit('update:blockConfigs', core.config.blockConfigs);
  core.emit('update:blockOrder', core.config.blockOrder);
}
