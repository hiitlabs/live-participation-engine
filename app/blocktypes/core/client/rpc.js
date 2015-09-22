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
 * RPC system coupled with sockets and blocks
 */

if (__DEV__) console.log('RPC system init');

/**
 * Exports a rpc constructor / caller
 *
 * In block constructor: `this.rpc = rpc();`
 * In block method: `this.rpc('$serverMethod', param1, cb);`
 */

module.exports = rpc;

// Shortcuts

var slice = Array.prototype.slice;
var toString = Object.prototype.toString;
var isArray = Array.isArray || function(obj) {
  return toString.call(obj) == '[object Array]';
};

// Create a socket

var socket = require('./socket');

// TODO bind to fresh socket ever again to prevent late transport errors.

// Proceed with RPC essentials

var rpcBuffer = [];

// Allow calling RPC methods before socket is ready
socket.on('open', function() {
  // Or bind to some global ready event in case session initialization needed?
  var outgoingCall;
  while (rpcBuffer.length) {
    outgoingCall = rpcBuffer.shift(); // fifo
    rpc.apply(outgoingCall.context, outgoingCall.args);
  }
});

// Increasing outgoing callback ids
var rpcLastIdN = 0;
// Keep callbacks in an object by id for now, also an array is possible.
var rpcCallbacks = {};

// Clear callbacks on close, they cannot come via different socket session id
socket.on('close', function() {
  for (var id in rpcCallbacks) {
    delete rpcCallbacks[id];
  }
  // Perhaps empty rpcBuffer too, in case early/late calls?
});


/**
 * Outgoing RPC call
 * Example output: {"m": "blockId.$methodName", "p": ["param1"], "id": "1"}
 */

function rpc() {
  var argLength = arguments.length;
  // Example:
  //rpc('blockId.$test', 'param1', 'param2', function(err, msg) {
  //    console.log('msg');
  //});

  // Allow calling before ready (but also after closed, TODO fix if necessary)
  if (socket.readyState !== 'open') {
    if (__DEV__) console.log('RPC early/late rpc call, buffering, socket.readyState:', socket.readyState);
    // Store context (blockInstance) with the arguments
    rpcBuffer.push({args: slice.call(arguments), context: this});
    return false;
  }
  var cmd = {
    m: arguments[0]
  };
  var cb = arguments[argLength - 1];
  // If callback given, response expected: otherwise omit id so server knows not to generate response.
  if (typeof cb === 'function') {
    if (argLength > 2) {
      cmd.p = new Array(argLength - 2);
      for (var i = 1; i < argLength-1; i++) {
        cmd.p[i-1] = arguments[i];
      }
    }
    cmd.id = ++rpcLastIdN + ''; // Ids are strings for now
    rpcCallbacks[cmd.id] = {cb: cb, context: this};
  } else {
    if (argLength > 1) {
      cmd.p = new Array(argLength - 1);
      for (var i = 1; i < argLength; i++) {
        cmd.p[i-1] = arguments[i];
      }
    }
  }

  if (__DEV__) console.log('RPC out: ', arguments, cmd);

  socket.send(JSON.stringify(cmd));
  return true;
}


/**
 * Incoming RPC parsing
 * Example incoming RPC response: {"p": ["param1"], "id": "1"}
 * Example incoming event/call: {"m": "blockId.methodName", "p": ["param1"]}
 */

// A single global block collection for now
var blocks = require('./blocks').instances;

// Two kinds of incoming messages: method calls (without id) and rpc responses (with id)
// All messages are parsed as JSON strings, no multiplexing as of yet (if several formats
// are needed later, could check the first char to decide the parser).
socket.onmessage = function(event) {
  if (__DEV__) console.log('RPC in:', event.data);
  rpcParse(socket, event.data, blocks);
};

// Separate try-catch to allow optimization
function JSONparse(message) {
  var msg;
  try {
    msg = JSON.parse(message);
  } catch (e) {}
  return msg;
}

function rpcParse(socket, message, blocks) {
  var msg = JSONparse(message);
  if (!msg) {
    if (__DEV__) console.error('RPC JSON parse error:', message);
    return;
  }

  var params = msg.p;
  if (!isArray(params)) {
    params = [];
  }

  var id = msg.id;
  if (typeof id === 'string') {
    // rpc response
    if (!rpcCallbacks.hasOwnProperty(id)) {
      if (__DEV__) console.warn('RPC ERROR callback not found anymore:', message);
      return;
    }
    var callbackObj = rpcCallbacks[id];
    delete rpcCallbacks[id];
    callbackObj.cb.apply(callbackObj.context, params);
    return;
  }

  var method = msg.m;
  if (typeof method !== 'string') {
    if (__DEV__) console.log('RPC ERROR method string missing:', message);
    return;
  }

  // Allow calling any method on any block.
  // Alternatively emit a global event, but for now prefer such method calls on core block.
  var targets = method.split('.');
  var targetBlockId = targets[0];
  if (!blocks.hasOwnProperty(targetBlockId)) {
    // Does not buffer too early incoming calls/events for uninitialized blocks,
    // the blocks are responsible for getting their state when initialized.
    if (__DEV__) console.log('RPC ERROR block not found:', message);
    return;
  }
  var targetBlock = blocks[targetBlockId];
  var targetMethodName = targets[1];
  var targetMethod = targetBlock[targetMethodName];
  if (typeof targetMethod !== 'function') {
    if (__DEV__) console.log('RPC ERROR method not found:', message);
    return;
  }

  targetMethod.apply(targetBlock, params);
}
