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

var debug = require('debug')('io:utils:throttle'); debug('module loading');

/**
 * Throttle any function invocation
 * Implementation from underscore / lodash
 */
module.exports = function throttle(func, wait) {
  var context, args, result;
  var timeoutId = null;
  var lastRun = 0;
  var trailingCall = function() {
    lastRun = Date.now();
    timeoutId = null;
    result = func.apply(context, args);
    context = args = null;
  };
  return function() {
    var now = Date.now();
    var waitRemaining = wait - (now - lastRun);
    context = this;
    args = arguments;
    if (waitRemaining <= 0) {
      clearTimeout(timeoutId); // Just in case?
      timeoutId = null;
      lastRun = now;
      result = func.apply(context, args);
      context = args = null;
    } else if (!timeoutId) {
      timeoutId = setTimeout(trailingCall, waitRemaining);
    }
    return result;
  };
};
