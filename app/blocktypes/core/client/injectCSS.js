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
 * CSS injector
 */

var head = document.getElementsByTagName('head')[0];

module.exports = injectCSS;

// IE 9 and less has a limit of 32 stylesheets, so could keep count
var styleCount = injectCSS.styleCount = 0;
// If limits are reached, could try/catch creation and just
// document.styleSheets[document.styleSheets.length - 1].cssText = css;

function injectCSS(css) {
  if (!css) return;

  styleCount++;
  var styleEl = document.createElement('style');
  styleEl.type = 'text/css';

  if (styleEl.styleSheet) {  // Old IE, perhaps even IE9? IE11 uses styleEl.sheet but hopefully the appendChild method works there.
    head.appendChild(styleEl); // Insert before setting content, otherwise IE will crash if css contains @import
    styleEl.styleSheet.cssText = css; // or += css
  } else {
    styleEl.appendChild(document.createTextNode(css));
    head.appendChild(styleEl);
  }
}
