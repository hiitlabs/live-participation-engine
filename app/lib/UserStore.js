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
 * UserStore
 */

var debug = require('debug')('io:UserStore'); debug('module loading');
var console = require('./Logger')('io:UserStore');
var invariant = require('./utils/invariant');

var SiteConfig = require('./SiteConfig');
var DataStore = require('./DataStore');
var db = DataStore.namespace('UserStore');

/**
 * Users and user constructor are stored in these run time objects
 */

var UserInstances = {};

var UserConstructor = null;

/**
 * All users are persisted in a single object by ids
 */

var persistedUserIds = [];

/**
 * Helpers
 */

function saveUserIds() {
  // May need better data structure in the future, as the array will
  // become quite large even if it only contains the user ids
  db.set('ids', persistedUserIds);
}

function loadUserIds() {
  persistedUserIds = db.get('ids') || [];
}

function loadUserConstructor() {
  if (UserConstructor) {
    console.warn('UserConstructor already loaded')
    return;
  }

  UserConstructor = require('./UserConstructor');
}

function loadUsers() {
  debug('loadUsers called')
  if (Object.keys(UserInstances).length) {
    console.warn('UserInstances already loaded');
    return;
  }
  loadUserIds();

  persistedUserIds.forEach(function(id) {
    debug('loading user: %j', id);
    // There is only one user constructor for now
    var user = UserConstructor.loadUser(id);
    invariant(user, 'User %s not found.', id); // Or warn?
    // Could validate user interface here
    invariant(!UserInstances[user.id], 'User %s already instantiated.', id);
    UserInstances[user.id] = user;
  });

  if (!persistedUserIds.length) {
    // First run: nothing to instantiate?
    // TODO perhaps loop through default users in any case
    ensureDefaultUsers();
  }
  return this;
}

// For e.g. networking game for now
function ensureDefaultUsers() {
  if (!SiteConfig.NETWORKING) {
    return; // Disabled
  }

  DEFAULT_USERS.forEach(function(userConfig) {
    debug('uninitialized default user: %j, initializing',
          userConfig);
    var user = UserConstructor.createUserFromDefaultConfig({
      networkingCode: userConfig.networkingCode,
      username: userConfig.username,
      networkingType: 'company'
    });
    invariant(user, 'Could not create default user %s', JSON.stringify(userConfig));
    UserStore.addUser(user);
  });
}

// TODO move to own module

var companyUsers = [
  {networkingCode: "1111", username: "Exhibitor A (E1)"},
  {networkingCode: "2222", username: "Place B"}
];

var DEFAULT_USERS = companyUsers;


/**
 * Exports a UserStore collection
 */

// There will be a few hundred users at most

var UserStore = {

  _users: UserInstances, // Expose for now

  getUser: function(id) {
    if (UserInstances.hasOwnProperty(id)) {
      return UserInstances[id];
    }
  },

  loadUserConstructor: loadUserConstructor,

  loadUsers: loadUsers,

  addUser: function(user) {
    // TODO If needed, could ensure the interface again
    invariant(user.id, 'User id key missing.');
    if (UserInstances[user.id]) {
      // TODO could check if same user or just same id
      console.warn('user already in collection');
      return this;
    }
    UserInstances[user.id] = user;
    persistedUserIds.push(user.id);
    saveUserIds();
  },

  removeUser: function(user) {
    invariant(user.id, 'User id key missing.');
    if (!UserInstances[user.id]) {
      console.warn('user not found in collection');
      return this;
    }
    // TODO Mark user as deleted and move to separate collection
    // TODO user cleanup
    delete UserInstances[user.id];
    for (var i = 0; i < persistedUserIds.length; i++) {
      if (persistedUserIds[i] === user.id) {
        persistedUserIds.splice(i, 1);
        break;
      }
    }
    saveUserIds();
  },

  newUserFromHttpRequest: function(httpRequest) {
    // Users come from single constructor for now
    var user = UserConstructor.createUserFromHttpRequest(httpRequest);
    UserStore.addUser(user);
    return user;
  },

  // TODO consider whether to do this here or from user block or somewhere
  getByUserpin: function(userpin) {
    for (var userId in UserInstances) {
      if (UserInstances[userId].personas.userpin === userpin) {
        return UserInstances[userId];
        // TODO could be many users
        // Found duplicate
        // Could merge users
        // httpSession.userId = otherUser.id;
        // otherUser.httpSessions[httpSession.id] = httpSession;
        // otherUser.httpSessions.push(httpSession.id)
        // remove from this user
        // otherUser.save()
        // But there are still eioSocket(s), for example, that are not
        // transferred under otherUser. Would need reload perhaps.
      }
    }
  },

  getByUsername: function(username) {
    for (var userId in UserInstances) {
      if (UserInstances[userId].personas.username === username) {
        return UserInstances[userId];
      }
    }
  },

  getByNetworkingCode: function(networkingCode) {
    for (var userId in UserInstances) {
      if (UserInstances[userId].personas.networkingCode === networkingCode) {
        return UserInstances[userId];
      }
    }
  }

  // getByGroupId: function(groupId) {
  //   for (var userId in UserInstances) {
  //     if (UserInstances[userId].personas.groupId === groupId) {
  //       return UserInstances[userId];
  //     }
  //   }
  // },

  //getByEioSocketId = function(eioSocketId) { };
  //getByClientWindowId = function(clientWindowId) { };
};

module.exports = UserStore;
