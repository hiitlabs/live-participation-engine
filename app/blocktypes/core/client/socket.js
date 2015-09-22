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
 * Engine.io socket starting with long-polling, upgrading to websockets if available
 */

// Array.prototype.indexOf shim for IE8 until fixed in eio emitter.
require('./indexof');

var events = require('./events');

var eio = require('/engine.io');
var clientId = require('./clientid');

// Open socket already on require and export it.
// There are socket.readyStates undefined/opening/open/closing/closed

var pathname = '' + window.location.pathname;
if (pathname.charAt(0) == '/') pathname = pathname.substr(1);
var pathnameParts = pathname.split('/');
var SITEROUTE = pathnameParts[0];
var CHANNELROUTE = pathnameParts[1] || 'web';

var socket = module.exports = eio({
  path: '/' + SITEROUTE + '/' + CHANNELROUTE + '/_io',
  query: {cid: clientId}, // Send also tab id.
  timestampRequests: true // To prevent caching (could be omitted if correct cache headers and nice proxies)
});

var shouldReconnect = true;

var reconnectDelay = 0;
socket.on('open', function() {
 reconnectDelay = 0;
});

function checkReconnect() {
  if (__DEV__) console.log('SOCKET readyState', socket.readyState);
  if (socket.readyState === 'closed') {
    reconnectDelay += 1000;
    if (reconnectDelay > 10000) reconnectDelay = 10000;
    if (shouldReconnect) {
      if (__DEV__) console.log('SOCKET is closed, reconnecting');
      socket.open();
    } else {
      if (__DEV__) console.log('SOCKET is closed, will not reconnect');
    }
  } else {
    if (__DEV__) console.log('SOCKET not closed, deferring until next error');
  }
};

var closingReasonIsError = false;

// Note: in development, server will close and this will attempt first open
// immediately. It will trigger a transport error (as server is not yet listening),
// which will increase the reconnectDelay to 1 second, after which the server is
// usually listening, and will proceed to get the version, after which it will
// notice that version differs and issue a browser reload.
socket.on('close', function(reason, desc) {
  // Common reasons: 'transport error', 'ping timeout', 'forced close'
  if (__DEV__) console.log('SOCKET close', reason, desc);

  if (closingReasonIsError) return;

  if (reason == 'forced close') {
    if (__DEV__) console.log('SOCKET forced close, not reconnecting');
    shouldReconnect = false;
    // TODO Show disconnected msg here or in index.js where socket.close() is called.
    events.emit('closed', reason);
    return;
  }
  if (__DEV__) console.log('SOCKET will check reconnect after %s ms', reconnectDelay);
  setTimeout(checkReconnect, reconnectDelay);
});

socket.on('error', function(error) {
  if (__DEV__) console.error('socket error', error);
  if (__DEV__) console.log('will check reconnect after %s ms', reconnectDelay);

  closingReasonIsError = true;
  socket.close();
  closingReasonIsError = false;
  setTimeout(checkReconnect, reconnectDelay);
});

var firstConnection = true;
socket.on('open', function() {
  if (__DEV__) console.log('SOCKET open');

  // There are several possibilities:
  // a) deem the connection ready already
  // b) ping the connection for session info, announce ready then
  // c) wait until rest of the app is ready, announce ready then
  // Serverside whether to parse the session from cookie and use pubsubs
  // or whether to wait for pubsub requests from the client
  events.emit('open');

  if (firstConnection) {
    firstConnection = false;
  } else {
    // Reconnection, refresh blocks
    events.emit('refresh');
  }
});

socket.on('handshake', function(data) {
  // Set pingTimeout to small value to detect disconnects on ping after wakeup
  data.pingTimeout = 10000;
  // Simplify (save bytes) on req urls
  delete socket.transport.query.uid;
  delete socket.transport.query.cid;
  delete socket.transport.query.EIO;
});

if (__DEV__) {
  socket.on('upgrading', function(transport) {
    if (__DEV__) console.log('SOCKET upgrading transport');
  });
  socket.on('upgrade', function(transport) {
    if (__DEV__) console.log('SOCKET upgraded to', transport.name);
  });
}

// Testing for latency (note that socket.ping is taken)

socket.latency = function(callback) {
  var start = new Date().getTime();
  socket.on('packet', function isPong(packet) {
    if (packet.type === 'pong') {
      var end = new Date().getTime();
      if (__DEV__) console.log('SOCKET latency', end - start, 'ms');
      socket.removeListener('packet', isPong);
      if (callback) callback(null, end - start);
    }
  });
  socket.sendPacket('ping');
  socket.onHeartbeat(socket.pingTimeout);
};

// TODO properly
events.on('wakeup', function() {
  if (__DEV__) console.log('wakeup detected, sending ping');
  var start = new Date().getTime();
  var end;
  var pingTimeout = setTimeout(function() {
    if (!end) {
      if (__DEV__) console.error('socket ping not received, should reconnect')
      // Let error/closing handlers to reconnect.
      socket.transport.close('wakeup timeout');
    }
  }, 3000);
  require('./rpc')('core.$ping', function(err) {
    var end = new Date().getTime();
    var time = end - start;
    clearTimeout(pingTimeout);
    if (__DEV__) console.log('ping rountrip', time);
  });
});
