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

var injectCSS = require('./injectCSS');

var styles = '';

// Minified Lumia fix
var ie10fix = '' +
  '@-webkit-viewport{width:device-width}' +
  '@-moz-viewport{width:device-width}' +
  '@-ms-viewport{width:device-width}' +
  '@-o-viewport{width:device-width}' +
  '@viewport{width:device-width}';
if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
  ie10fix += '@-ms-viewport{width:auto!important}' +
    'a,input,button{-ms-touch-action:none!important}'; // disable click delay
}

styles += ie10fix;

try {
  styles += require('./styles.css');
} catch (e) {
  if (__DEV__) console.warn('empty styles.css')
}

injectCSS(styles);
