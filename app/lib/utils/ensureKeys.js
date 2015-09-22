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

var debug = require('debug')('io:utils:ensureKeys'); debug('module loading');

/**
 * Ensuring that an object (or a constructor) implements required properties or
 * functions
 */
module.exports = function ensureKeys(obj, fnNames) {
  if (!obj) return fnNames;
  var missingKeys = fnNames.filter(function(fnName) {
    if (!(fnName in obj)) return true;
  });
  if (missingKeys.length) {
    return missingKeys;
  } else {
    return;
  }
};

// exports.ensureInterface = function(obj, interfaceObj) {
//   if (Array.isArray(interfaceObj)) {
//     interFaceObj.forEach(function(fnName) {
//       if (fnName in obj) return;
//       if (obj.prototype && fnName in obj.prototype) return;
//       throw new Error('obj does not implement ' + fnName);
//     });
//   } else {
//     for (var fnName in interfaceObj) {
//       if (fnName in obj) continue;
//       if (obj.prototype && fnName in obj.prototype) continue;
//       throw new Error('obj does not implement ' + key);
//     }
//   }
// };
