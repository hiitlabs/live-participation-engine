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
      $heading.text(heading || '–'); // or el.textContent =
    } else {
      $heading.text(heading); // or el.textContent =
    }
  });
  block.emit('change:heading', block.config.heading);
}

if (__CONTROL__) {
  var initHeadingEdit = function(block, $heading) {
    $heading.attr('title', dict.HEADING_HOVER);
    $heading.on('click', function() {
      $heading.attr('contenteditable', true); // or el.setAttribute('contenteditable', 'true');
      $heading.focus();
      return false;
    });

    $heading.on('keydown', function(ev) {
      if (ev.which == 27) {
        // Esc, cancel edit
        $heading.text(block.config.heading);
        $heading.blur();
        return false;
      }
      if (ev.which == 13) {
        // Return, save
        $heading.blur();
        return false;
      }
    });
    $heading.on('blur', function() { // or el.onblur =
      checkAndSend();
      return false;
    });

    function checkAndSend() {
      $heading.attr('contenteditable', null);
      var headingText = $heading.text();
      if (headingText == block.config.heading) return;
      if (headingText === '–') return;
      block.$setConfig({heading: headingText});
      block.rpc('$heading', headingText);
    }

  };
}
