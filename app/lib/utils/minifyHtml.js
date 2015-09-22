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

var debug = require('debug')('io:utils:minifyHtml'); debug('module loading');

/**
 * Minify html templates (remove ordinary comments and most of unneccessary whitespace)
 */
module.exports = function minifyHtml(html) {
  var out = '';
  var charCount = 0;
  // Fails in some pathological cases
  //html = html.replace(/<!--[^\[][^\]]*-->/g, '');
  // Fails in some pathological cases
  html = html.replace(/<!--[^\[](?:[^](?!\]-->))*?-->/g, '');
  html.split('\n').forEach(function(line) {
    // Messes with pre, code, etc, beware
    var trimmed = line.trim();
    if (trimmed === '') return;
    // Leave some whitespace
    var first = trimmed.charAt(0);
    var last = trimmed.charAt(trimmed.length - 1);
    if (first != '<') out += ' ';
    out += trimmed;
    if (last != '>') out += ' ';

    charCount += trimmed.length;
    if (charCount > 1000) { // Or use mod
      out += '\n';
      charCount = 0;
    }
  });
  return out;
};
