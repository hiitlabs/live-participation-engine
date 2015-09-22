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
 * DataStore
 */

var debug = require('debug')('io:DataStore'); debug('module loading');

/**
 * Dependencies
 */

var GlobalLock = require('./GlobalLock');

var join = require('path').join;
var dirtydb = require('dirty');
var invariant = require('./utils/invariant');

var base64id = require('base64id');

function uid() {
  return 'u' + base64id.generateId().slice(0, 10);
}
function uniqueId() {
  var newUid = uid();
  // Recursion if key exists already
  // Note: does not really ensure unique key, as candidate key is not saved to objectdb
  return !objectdb.get(newUid) ? newUid : uniqueId();
}

/**
 * Export a couple of DBs
 */

var DB_DIR = join(__dirname, '..', '..', 'db');

// TODO Consider blockConstructor or even blockInstance specific databases
var objectdb = dirtydb(join(DB_DIR, 'objects.dirty'));
objectdb.getUniqueId = uniqueId;

var sessiondb = dirtydb(join(DB_DIR, 'sessions.dirty'));

// Stall requests until db loaded
GlobalLock.add('objectdb');
objectdb.once('load', function(length) {
  objectdb.loaded = true;
  debug('objectdb loaded: %s keys', length);
  GlobalLock.release('objectdb');
});
GlobalLock.add('sessiondb');
sessiondb.once('load', function(length) {
  sessiondb.loaded = true;
  debug('sessiondb loaded: %s keys', length);
  GlobalLock.release('sessiondb');
});

// Emit an event when both DBs are ready
var otherDbReady = false;
objectdb.once('load', function(length) {
  if (!otherDbReady) otherDbReady = true;
  else objectdb.emit('bothLoaded');
});
sessiondb.once('load', function(length) {
  if (!otherDbReady) otherDbReady = true;
  else objectdb.emit('bothLoaded');
});

// Export a namespaced objectdb.get and objectdb.set for general usage.
// It is possible to expose a throttled setter too based on keys.
var ReservedNamespaces = {};

var DataStore = {

  db: objectdb,

  sessiondb: sessiondb,

  // TODO convert to class with prototypes to save memory (there may be thousands of props)
  namespace: function(namespace) {
    if (typeof namespace !== 'string') throw new Error('must supply namespace string');
    if (ReservedNamespaces[namespace]) throw new Error('namespace already in use:' + namespace);
    // TODO should perhaps persist between different runtimes
    ReservedNamespaces[namespace] = true;

    return {
      get: function(key) {
        return objectdb.get(namespace + ':' + key);
      },
      set: function(key, val, cb) {
        return objectdb.set(namespace + ':' + key, val, cb);
      },
      getUniqueId: uniqueId
    }
  }
};

module.exports = DataStore;
