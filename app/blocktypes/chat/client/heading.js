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

var rpc = require('/core/rpc');

var dict = require('./lang');

exports = module.exports = initHeading;

function initHeading(block) {

  var $heading = block.$el.find('#' + block.id + '-heading');

  if (__CONTROL__) {
    initHeadingEdit(block, $heading);
  }

  block.on('change:heading', function(heading) {
    if (__CONTROL__) {
      //block.$toolbar.find('#' + block.id + '-heading-');
      var $toolbarHeading = block.$el.find('#' + block.id + '-toolbar-heading');
      $toolbarHeading.text(heading);
      $heading.text(heading || '-'); // or el.textContent =
    } else {
      $heading.text(heading); // or el.textContent =
    }
  });
  block.emit('change:heading', block.config.heading);
}

if (__CONTROL__) {
  var initHeadingEdit = function(block, $heading) {

    var common = require('./commonClient.js');
    common.controlTextField( block, 'heading', dict.HEADING_HOVER, $heading );

  };
}
