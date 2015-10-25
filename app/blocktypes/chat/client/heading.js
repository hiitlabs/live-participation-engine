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

function initHeading(block, modes ) {

  modes = typeof modes !== 'undefined' ? modes : ['heading', 'description']; // by default assume there are two heading type of things

  modes.forEach( function( mode ) {

    alert("Set up " + mode );

    var $dom = block.$el.find('#' + block.id + '-' + mode);

    block.on('change:' + mode, function(newValue) {
      if (__CONTROL__) {
        var $toolbarHeading = block.$el.find('#' + block.id + '-toolbar-' + mode);
        $toolbarHeading.text( newValue );
        $dom.text( newValue || '-'); // or el.textContent =
      } else {
        $dom.text( newValue ); // or el.textContent =
      }
    });

    block.emit('change:' + mode, block.config[mode] );

    if (__CONTROL__) {

      var common = require('./commonClient.js');
      common.controlTextField( block, mode, dict[ mode + '_HOVER'], $dom );

    };

  } )
}
