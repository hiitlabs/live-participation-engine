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

if (typeof window.sessionStorage === 'undefined') {
  exports.setItem = function() {};
  exports.getItem = function() {};
} else {
  exports.setItem = function(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch(e) {
      // Limit reached or other problem
    }
  };
  exports.getItem = function(key) {
    var value;
    try {
      value = JSON.parse(sessionStorage.getItem(key));
    } catch(e) {}
    return value;
  };
}
