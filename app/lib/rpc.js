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
 * Custom RPC system for the blocks to communicate between their frontend and
 * backend instances
 */

var debug = require('debug')('io:rpc'); debug('module loading');

var console = require('./Logger')('io:rpc');

// NOTE: Coupled to BlockStore
var BlockStore = require('./BlockStore');

// Separate try-catch to allow V8-optimization
function JSONparse(message) {
  var msg;
  try {
    msg = JSON.parse(message);
  } catch (e) { }
  return msg;
}

// Example incoming message:
// {"m": "blockId.$methodName", "p": ["param1"], "id": "1"}
// TODO consider having only one parameter object each way, would it simplify?
function rpcParseIn(eioSocket, incomingMessageStr) {
  var DEV = debug.enabled;
  var msg = JSONparse(incomingMessageStr);
  if (!msg) {
    if (DEV) debug('ERROR parse error: %s', incomingMessageStr);
    return;
  }
  var method = msg.m;
  if (typeof method !== 'string') {
    if (DEV) debug('ERROR method string missing: %s', incomingMessageStr);
    return;
  }
  if (method.length > 40) { // Contains blockId still, so can be quite long
    if (DEV) debug('ERROR method string too long: %s', incomingMessageStr);
    return;
  }
  var targets = method.split('.');
  var targetBlockId = targets[0];
  var targetBlock = BlockStore.getBlock(targetBlockId);
  if (!targetBlock) {
    // Note that blocktypes could also allow static methods.
    if (DEV) debug('ERROR block not found: %s', incomingMessageStr);
    return;
  }
  var targetMethodName = targets[1];
  // Public methods are exposed via $-prefix
  // NOTE! If you change the exposing mechanism, make sure that malicious method
  // calls cannot leak up the prototype chain or break the existence check.
  if (!targetMethodName || targetMethodName.charAt(0) !== '$') {
    if (DEV) debug('ERROR [%s] call to nonpublic function: %s', targetBlock.type, incomingMessageStr);
    return;
  }
  var targetMethod = targetBlock[targetMethodName];
  if (!targetMethod || typeof targetMethod !== 'function') {
    if (DEV) debug('ERROR [%s] function not found: %s', targetBlock.type, incomingMessageStr);
    return;
  }
  var params = msg.p;
  if (!Array.isArray(params)) {
    params = [];
  }
  if (params.length > 10) {
    if (DEV) debug('ERROR [%s] too many params: %s', targetBlock.type, incomingMessageStr);
    return;
  }
  // Could check targetMethod.length == params.length + 1 or + 2

  var req = {
    eioSocket: eioSocket,
    channel: eioSocket.channel,
    user: eioSocket.user,
  };

  // log all incoming rpc requests for now
  console.info({
    userId: eioSocket.user && eioSocket.user.id,
    channelId: eioSocket.channel && eioSocket.channel.id,
    rpcStr: incomingMessageStr
  }, 'rpcIn');

  // Request/response object will always be the first argument
  params.unshift(req); // Alternatively move up and use array concat or such

  var id = msg.id;
  if (typeof id !== 'string') {
    // No response needed
    req.reply = function() {};
    targetMethod.apply(targetBlock, params);
    return;
  }
  if (id.length > 20) {
    if (DEV) debug('ERROR [%s] too long id: %s', targetBlock.type, incomingMessageStr);
    return;
  }
  // Prepare response
  req.reply = function() {
    //if (req.error) { // Not used yet
    //  eioSocket.send(JSON.stringify({
    //  id: id, error: req.error, p: Array.prototype.slice.call(arguments)
    //}));
    //  return;
    //}
    // Make array manually, perhaps faster and more explicit
    var argLen = arguments.length;
    var p = new Array(argLen);
    for (var i = 0; i < argLen; i++) {
      p[i] = arguments[i];
    }
    // LOG for now:
    //console.info({
    //  userId: eioSocket.user && eioSocket.user.id,
    //  channelId: eioSocket.channel && eioSocket.channel.id,
    //  rpcParams: p
    //}, 'rpcOut');
    eioSocket.send(JSON.stringify({id: id, p: p}));
  };
  targetMethod.apply(targetBlock, params);
}

// Example args to send: {"m": "blockId.$methodName", "p": []}
// TODO think the chain through, when to use apply arguments directly, when to
// use an object
// TODO Try to prevent all unneccessary args copying along the chain,
// but mostly it does not matter as we are able to send the result then to
// multiple sockets
function sendMany(eioSockets, outgoingArgs) {
  //if (debug.enabled) debug('targets: %j', Object.keys(eioSockets));
  var cmd = {
    m: outgoingArgs[0]
  };
  var paramCount = outgoingArgs.length - 1;
  cmd.p = new Array(paramCount);
  for (var i = 0; i < paramCount; i++) {
    cmd.p[i] = outgoingArgs[i + 1];
  }
  var outgoingStr = JSON.stringify(cmd);
  debug('out: %s', outgoingStr);
  for (var key in eioSockets) {
    eioSockets[key].send(outgoingStr);
  }
}

// Single rpc helper mixed to each eioSocket object
function sendSingle() {
  var paramCount = arguments.length - 1;
  var cmd = {
    m: arguments[0],
    p: new Array(paramCount)
  };
  for (var i = 0; i < paramCount; i++) {
    cmd.p[i] = arguments[i + 1];
  }
  debug('out: %j', cmd);
  this.send(JSON.stringify(cmd));
}

// function rpcStringify() {
//   var cmd = {
//     m: arguments[0]
//   };
//   var paramCount = arguments.length - 1;
//   if (paramCount) {
//     var p = new Array(paramCount);
//     for (var i = 0; i < paramCount; i++) {
//       p[i] = arguments[i + 1];
//     }
//     cmd.p = p;
//   }
//   return JSON.stringify(cmd);
// }

/**
 * Blocks can call this.rpc('channelId:$methodname') to communicate
 * with their browser instances.
 */

// earlier block.rpc -> channel.rpc -> rpc.rpcSend
// now block.rpc -> rpc.rpcSend channel.sockets
// or perhaps block.web.rpc('')
// Now mixed in to block instance
function rpcBlock() {
  // Make array manually
  var argLen = arguments.length;
  var args = new Array(argLen);
  for (var i = 0; i < argLen; i++) {
    args[i] = arguments[i];
  }
  // TODO Could perhaps prevent this copying

  var target = args[0];
  //if (typeof target !== 'string') {
    // could differentiate between sockets object, channel object, etc as first
    // arg
  //}
  var targetParts = target.split(':');
  if (targetParts.length == 1) {
    // No channelid, send to all channels where the block is.
    args[0] = this.id + '.' + targetParts[0];
    // NOTE Will stringify multiple times for each channel, ok
    for (var channelId in this.channels) {
      var channel = this.channels[channelId];
      if (debug.enabled) debug('rpc out: %s to channel %s', args[0], channel.id);
      sendMany(channel.eioSockets, args);
    }
  } else {
    // Channel id present, modify call
    args[0] = this.id + '.' + targetParts[1];
    var channel = this.channels[targetParts[0]];
    if (debug.enabled) {
      debug('rpc out: %s to channel %s', args[0], channel && channel.id);
    }
    if (!channel) {
      console.error('block %s not on channel %s', this.id, targetParts[0]);
      return;
    }
    sendMany(channel.eioSockets, args);
  }
};

/**
 * Exports a couple of methods
 */

var rpc = {

  parse: rpcParseIn,

  send: sendMany,

  sendSingle: sendSingle,

  //out: rpcStringify,

  block: rpcBlock

};

module.exports = rpc;
