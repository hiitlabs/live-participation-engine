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

exports = module.exports = initDescription;

function initDescription(block) {

  var $description = block.$el.find('#' + block.id + '-description');

  if (__CONTROL__) {
    initDescriptionEdit(block, $description);
  }

  block.on('change:description', function(description) {
    if (__CONTROL__) {
      //block.$toolbar.find('#' + block.id + '-description-');
      var $toolbarHeading = block.$el.find('#' + block.id + '-toolbar-heading');
      $toolbarHeading.attr('title', description);
      $description.text(description || '–'); // or el.textContent =
    } else {
      $description.text(description); // or el.textContent =
    }
  });
  block.emit('change:description', block.config.description);
}

if (__CONTROL__) {
  var initDescriptionEdit = function(block, $description) {
    $description.attr('title', dict.DESCRIPTION_HOVER);
    $description.on('click', function() {
      $description.attr('contenteditable', true); // or el.setAttribute('contenteditable', 'true');
      $description.focus();
      return false;
    });

    $description.on('keydown', function(ev) {
      if (ev.which == 27) {
        // Esc, cancel edit
        $description.text(block.config.description);
        $description.blur();
        return false;
      }
      if (ev.which == 13) {
        // Return, save
        $description.blur();
        return false;
      }
    });
    $description.on('blur', function() { // or el.onblur =
      checkAndSend();
      return false;
    });

    function checkAndSend() {
      $description.attr('contenteditable', null);
      var descriptionText = $description.text();
      if (descriptionText == block.config.description) return;
      if (descriptionText === '–') return;
      block.$setConfig({description: descriptionText});
      block.rpc('$description', descriptionText);
    }

  };
}
