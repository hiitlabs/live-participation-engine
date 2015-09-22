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
 * Global error handler
 */

 "use strict";

// There could be a global error handler that logs and saves errors
// to localstorage, ready to be sent on next successful connect

// Preventing error dialogs:
//if (window.onerror) window.onerror = null;
//if (window.onerror) window.onerror = function() {};

// Custom error handling:

if (__DEV__) console.log('ERRORS.JS: module loading');

var events = require('./events');

var origErrorhandler = window.onerror;

window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
  // Could log error to server via xhr or socket?

  var errorLog = {
    errorMsg: errorMsg,
    url: url,
    lineNumber: lineNumber
  };

  document.createElement('img').src = 'errorlog?json=' + encodeURIComponent(JSON.stringify(errorLog));

  if (__DEV__) alert(errorMsg + ' @ ' + url + ':' + lineNumber);

  if (__DEV__) events.emit('error', JSON.stringify(arguments));

  // Could log error here.
  if (origErrorhandler) {
    return origErrorhandler(errorMsg, url, lineNumber);
  }

  return false;
};
