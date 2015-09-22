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
 * Instantiates main data stores (users, blocks, channels)
 */

// Waits in index.js until DBs ready, and then requires this module to proceed.

/**
 * Users
 */
var UserStore = require('./UserStore');
UserStore.loadUserConstructor();
UserStore.loadUsers();

/**
 * Blocks
 */
var BlockStore = require('./BlockStore');
BlockStore.loadBlockConstructors();
BlockStore.loadBlocks();

/**
 * Channels
 */
var ChannelStore = require('./ChannelStore');
ChannelStore.loadChannelConstructors();
ChannelStore.loadChannels();
// Could add ChannelStore.ensureDefaults() here too
