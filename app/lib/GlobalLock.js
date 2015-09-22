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
 * GlobalLock is used for e.g. incoming request stalling until build is ready
 */

var debug = require('debug')('io:GlobalLock'); debug('module loading');

var console = require('./Logger')('io:GlobalLock');

var invariant = require('./utils/invariant');

/**
 * Dependencies
 */

var EventEmitter = require('events').EventEmitter;

/**
 * Exports a GlobalLock
 */

function GlobalLockConstructor(options) {
  if (!(this instanceof GlobalLockConstructor)) {
    return new GlobalLockConstructor(options);
  }
  // Options currently unused
  EventEmitter.call(this);
  this.setMaxListeners(0);
  // System global flag, mainly for request responders to check quickly
  this.ready = true;
  this.waitingFor = {};
  var startedAt = Date.now(); // TODO initialize again after ready
  this.on('ready', function() {
    var now = Date.now();
    debug('all locks cleared after %s secs', (now - startedAt) / 1000);
    console.info('all locks cleared after %s secs', (now - startedAt) / 1000);
    if (process.env.BUILDCLEAN) {
      process.exit();
    }
  });
}
require('util').inherits(GlobalLockConstructor, EventEmitter);

GlobalLockConstructor.prototype.add = function(lockName) {
  debug('adding %s', lockName);
  // Signal that lock has already been added.
  if (this.waitingFor[lockName]) {
    return false;
  }
  this.waitingFor[lockName] = true;
  this.ready = false;
  return true;
};

GlobalLockConstructor.prototype.release = function(lockName) {
  invariant(
    this.waitingFor[lockName], 'Lock %s already released!', lockName
  );
  delete this.waitingFor[lockName];
  var remaining = Object.keys(this.waitingFor);
  if (remaining.length) {
    debug('%s ready, still waiting for %j', lockName, remaining);
  } else {
    debug('%s ready', lockName);
    this.ready = true;
    this.emit('ready');
  }
  return true;
};

// Let's just export a ready GlobalLock, could export a constructor too.
var GlobalLock = new GlobalLockConstructor('main');

module.exports = GlobalLock;
