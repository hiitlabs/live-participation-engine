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

// All tabs (clients) have an id, which is saved in window.name to be sent
// along with the socket creation as a cid query parameter.

// For now use existing window.name (still preventing potentially a multi-kilobyte
// window.name coming from previous site) or initialize on first load.

// The server-generated page can add a script changing window.name if an existing
// id needs to be used.

var uid = require('./uid');

var clientId;

// TODO better validation to prevent existing window.name interfering
if (window.name && typeof window.name == 'string' && window.name.length == 9) {
  clientId = window.name;
} else {
  clientId = window.name = 'c' + uid(8);
}

module.exports = clientId;
