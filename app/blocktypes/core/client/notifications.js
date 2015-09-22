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

// Notification system experiments.

var events = require('./events');

// Notifications and dialogs.

var dict = require('./lang');

var reconnecting = false;

events.on('open', function() {
  // Connection ready.
  if (reconnecting) {
    reconnecting = false;
  } else {
    // Don't display ordinary connection messages for now.
  }
});

events.on('reopening', function(delay) {
  reconnecting = true;
  // Connection problem, trying to reconnect (again).
});

events.on('reloading', function(delay) {
});

events.on('closing', function(reason) {
  // Connection forced closing.
  showDisconnected(reason);
});

events.on('closed', function(reason) {
  // Connection forced closing done.
});

function showDisconnected(reason) {
  $('#disconnected').remove();
  var dict = require('./lang');
  var modalFn = require('./modal.html');
  var params = _.extend({reason: reason}, dict);
  var $modal = $(modalFn(params));
  $modal.prependTo('body');

  $modal.on('show', function() {
    // Wire up the OK button to dismiss the modal when shown.
    $('#disconnected a.btn').on('click', function(e) {
      location.reload();
      // NOTE Could have also a reconnect button to reconnect immediately without reloading?
    });
  });
  // Wire up the actual modal functionality and show the dialog.
  $modal.modal({
    backdrop: 'static',
    keyboard: false,
    show: true // Ensure the modal is shown immediately.
  });
}
