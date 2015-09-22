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
 * Event bus
 */

var debug = require('debug')('io:Events'); debug('module loading');

// Dependencies

var events = require('events');

// Exports an event emitter

var Events = new events.EventEmitter();
Events.setMaxListeners(0); // Unlimited listeners for each event

module.exports = Events;

// TODO deprecate this in favor of more direct calls
