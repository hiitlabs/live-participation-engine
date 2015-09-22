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

// Check for global leaks in development

if (__DEV__) {
  var msDelay = 2000;
  var globals = _.keys(window);
  setTimeout(function() {
    var allowedGlobals = [];
    var globalLeaks = _.difference(_.keys(window), globals, allowedGlobals);
    if (globalLeaks.length) console.error('Global leaks detected: %j', globalLeaks);
  }, msDelay);
}
