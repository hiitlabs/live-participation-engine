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

/*!
 * Connect - Dirty
 * Based on "Connect - Redis" (TJ Holowaychuk) and "Connect - Dirty" (Mario Michelli)
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Dirty = require('dirty');
var debug = require('debug')('connect:dirty'); debug('module loading');
var _ = require('underscore');

var path = require('path');

/**
 * One day in seconds.
 */

var oneDay = 86400;

/**
 * Return the `DirtyStore` extending `connect`'s session Store.
 *
 * @param {object} connect
 * @return {Function}
 * @api public
 */

module.exports = function(connect) {

  /**
   * Connect's Store.
   */

  var Store = connect.session.Store;

  /**
   * Initialize DirtyStore with the given `options`.
   */

  function DirtyStore(options) {
    var self = this;

    options = options || {};
    Store.call(this, options);
    this.prefix = null == options.prefix
      ? 'sess:'
      : options.prefix;

    this.db = options.db || Dirty(path.join(options.dbPath || 'dbs', options.dbFileName || 'session.dirty'));

    // NOTE: Make sure DB is loaded before use.
  }

  /**
   * Inherit from `Store`.
   */

  DirtyStore.prototype.__proto__ = Store.prototype;

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */

  // NOTE: This is sync for now, no process.nextTick on callback.
  DirtyStore.prototype.get = function(sid, fn) {
    //if (typeof fn != 'function') fn = function() {};
    debug('GET "%s"', sid);
    var self = this;

    var sess = this.db.get(sid);
    if (!sess) {
      fn && fn();
      return;
    }
    debug('GOT %j', sess);
    var expires = 'string' == typeof sess.cookie.expires
      ? new Date(sess.cookie.expires)
      : sess.cookie.expires;
    if (!expires || new Date() < expires) {
      fn && fn(null, sess); // Beware! Actual object reference given, not clone.
      return sess; // shortcut
    } else {
      debug('DESTROY expires:%s maxAge:%s', expires, sess.cookie.maxAge);
      self.destroy(sid, fn);
      return;
    }
  };

  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */

  // NOTE: this is sync for now
  DirtyStore.prototype.set = function(sid, sess, fn) {
    // Compare and avoid some unneccessary saves (otherwise appends file)
    // TODO mostly unneccessary, as expires or maxAge is changed usually on each request
    if (!_.isEqual(sess, this.db.get(sid))) {
      debug('SET %j', sess);
      this.db.set(sid, sess); // The same actual object ref saved, not a clone.
    } else {
      debug('IGNORED SET due to equality %j', sess);
    }
    fn && fn();
  };

  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid
   * @api public
   */

  DirtyStore.prototype.destroy = function(sid, fn) {
    debug('DESTROY %j', sid);
    this.db.rm(sid);
    fn && fn();
  };

  return DirtyStore;
};
