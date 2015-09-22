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

// Url hash part checker adapted from Backbone

var events = require('./events');

var isExplorer = /msie [\w.]+/;
var docMode = document.documentMode;
var oldIE = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

var routeStripper = /^[#\/]|\s+$/g;

function getHash() {
  var match = location.href.match(/#(.*)$/);
  var hash = match ? match[1] : '';
  return hash.replace(routeStripper, '');
}

var loadedHash = getHash();

function checkUrl(e) {
  var currentHash = getHash();
  if (currentHash === loadedHash) return false;
  loadUrl();
}

function loadUrl() {
  loadedHash = getHash();
  console.log(loadedHash);
  events.emit('hashChange', loadedHash);
}

if (('onhashchange' in window) && !oldIE) {
  $(window).on('hashchange', checkUrl);
} else {
  events.on('tick', checkUrl);
}

var pathStripper = /[?#].*$/;

function navigate(hash) {
  hash = hash.replace(pathStripper, '');
  updateHash(hash);
}

function updateHash(hash) {
  var href = location.href.replace(/(javascript:|#).*$/, '');
  location.replace(href + '#' + hash);
}

module.exports = {
  getHash: function() {
    return loadedHash;
  },
  navigate: navigate
};
