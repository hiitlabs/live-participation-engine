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
 * Block collection
 */

var Emitter = require('./emitter');

var events = require('./events');

var blocks = module.exports = {
  instances: {},
  constructors: {},
  setBlockConfigs: setBlockConfigs,
  setBlockOrder: setBlockOrder
};

// Enable events on blocks
Emitter(blocks);

var blockOrder = []; // init

function arrayToObj(array) {
  var obj = {};
  for (var i = 0; i < array.length; i++) {
    obj[array[i]] = array[i];
  }
  return obj;
}

// Allows partial updates, will create a new block if missing from blocks.instances
function setBlockConfigs(blockConfigs) {
  if (__DEV__) console.log('setBlockConfigs called');

  // Append blocks in reverse order
  for (var i = blockConfigs.length-1; i >= 0; i--) {
    var configUpdate = blockConfigs[i];
    if (!configUpdate) {
      if (__DEV__) console.warn('blockConfig not found');
      continue;
    }
    var block = blocks.instances[configUpdate.id];
    if (__DEV__) console.log(configUpdate.id)
    if (!block) {
      if (__DEV__) console.log('blockInstance not found, creating');

      if (!configUpdate.type) {
        if (__DEV__) console.error('blockConfig partial update, no type found!');
        continue;
      }
      var blockConstructor = require('/' + configUpdate.type);

      // This will prepend the block already.
      // TODO FIXME on screen the container is blockcontainer-maxi, but works apparently
      // due to the element being appended there in block render.
      blocks.instances[configUpdate.id] = new blockConstructor(configUpdate);
    } else {
      block.$setConfig(configUpdate);
    }
  }
}

function setBlockOrder(updatedBlockOrder) {
  if (__DEV__) console.log('setBlockOrder called');
  if (isChanged(updatedBlockOrder)) {
    if (__DEV__) console.log('changed!');
    var updatedBlockIds = arrayToObj(updatedBlockOrder);

    // Handle deleted blocks
    for (var blockId in blocks.instances) {
      if (blockId === 'core') continue;
      if (!updatedBlockIds[blockId]) {
        if (__DEV__) console.log('will delete ', blockId);
        deleteBlock(blockId);
      }
    }

    // Infer moved blocks
    var movedBlocks = [];
    for (var i = 0; i < updatedBlockOrder.length; i++) {
      if (updatedBlockOrder[i] != blockOrder[i]) {
        movedBlocks[movedBlocks.length] = {
          id: updatedBlockOrder[i],
          order: i
        };
      }
    }
    if (movedBlocks.length == 0) {
      // nop
    } else if (movedBlocks.length == 2 && blockOrder.length > 0) {
      // If there is previous blockOrder, then this is not a first load,
      // so can animate. (Otherwise would animate on first load if there would
      // be only two blocks total, as there are first no blocks, then two)

      // Two swapped blocks (other blocks already created and deleted).
      // Single moved block should not be possible, but there may be such a case
      // when the first block is created in control, and thus animates strangely.

      // Animations depend on block visibility: if one is invisible,
      // no animation, just swap (and control channel has always visibility).

      // var focusState = getFocusState();

      if (__CONTROL__ && movedBlocks.length == 2) {
        swapElements($('#' + movedBlocks[1].id), $('#' + movedBlocks[0].id));
      } else {
        // For now, just quick reflowing of everything without animating
        for (var i = updatedBlockOrder.length-1; i >= 0; i--) {
          if (__DEV__) console.log(updatedBlockOrder[i]);
          $('#' + updatedBlockOrder[i]).prependTo('#main-content');
        }
      }

      // restoreFocusState(focusState);

    } else {

      // var focusState = getFocusState();

      // Either movedBlocks.length > 2 || movedBlocks.length == 1
      // TODO Most usually first load, so will reorder every time even if no need
      // so could check if blockOrder.length === 0 to omit reflow on first load
      // Otherwise most likely a reconnect, just reflow everything without animating
      for (var i = updatedBlockOrder.length-1; i >= 0; i--) {
        if (__DEV__) console.log(updatedBlockOrder[i]);
        // TODO without jquery and perhaps using block.el directly
        // TODO benchmark detaching main-content first to prevent reflows
        var block = blocks.instances[updatedBlockOrder[i]];
        if (block && block.$el) {
          // TODO FIXME these work in screen due to #main-content not found?
          // !!!
          block.$el.prependTo('#main-content');
        } else {
          $('#' + updatedBlockOrder[i]).prependTo('#main-content');
        }
      }

      // restoreFocusState(focusState);
    }

    // Persist
    blockOrder = updatedBlockOrder;
  }
}

function isChanged(updatedBlockOrder) {
  if (updatedBlockOrder.length != blockOrder.length) {
    if (__DEV__) {
      console.log(
        'blockOrder length changed',
        updatedBlockOrder.length,
        blockOrder.length
      );
    }
    return true;
  }
  for (var i = 0; i < updatedBlockOrder.length; i++) {
    if (updatedBlockOrder[i] != blockOrder[i]) {
      if (__DEV__) {
        console.log(
          'blockOrder content changed',
          updatedBlockOrder.length,
          blockOrder.length
        );
      }
      return true;
    }
  }
  return false;
}

function deleteBlock(id) {
  var block = blocks.instances[id];
  if (block && block.dispose) block.dispose();

  // Remove from dom
  $('#' + id).remove();

  // Remove from config list (mirrors dom)
  for (var i = 0; i < blockOrder.length; i++) {
    if (blockOrder[i] == id) {
      blockOrder.splice(i, 1);
      break;
    }
  }

  delete blocks[id];
}

// Note: accessing outerHeight etc triggers reflow
function swapElements($set1, $set2) {
  var mb_prev = cssprop($set1.first().prev(), "margin-bottom");
  if (isNaN(mb_prev)) mb_prev = 0;
  var mt_next = cssprop($set2.last().next(), "margin-top");
  if (isNaN(mt_next)) mt_next = 0;

  var mt_1 = cssprop($set1.first(), "margin-top");
  var mb_1 = cssprop($set1.last(), "margin-bottom");
  var mt_2 = cssprop($set2.first(), "margin-top");
  var mb_2 = cssprop($set2.last(), "margin-bottom");

  var h1 = $set1.last().offset().top + $set1.last().outerHeight() - $set1.first().offset().top;
  var h2 = $set2.last().offset().top + $set2.last().outerHeight() - $set2.first().offset().top;

  var move1 = h2 + Math.max(mb_2, mt_1) + Math.max(mb_prev, mt_2) - Math.max(mb_prev, mt_1) + 0; // TODO FIX 10
  var move2 = -h1 - Math.max(mb_1, mt_2) - Math.max(mb_prev, mt_1) + Math.max(mb_prev, mt_2) - 0; // TODO FIX 10

  // var focusState = getFocusState();

  $set1.css('position', 'relative');
  $set2.css('position', 'relative');

  $set1.finish().animate({'top': move1}, 400);
  $set2.finish().animate({'top': move2}, 400, function() {
    // rearrange the DOM and restore positioning when we're done moving
    $set1.insertAfter($set2.last());
    $set1.css({'position': '', 'top': ''});
    $set2.css({'position': '', 'top': ''});

    // restoreFocusState(focusState);
  });

  // Don't follow with scroll here, in case other controller made the lift.
}

function cssprop($e, id) {
  return parseInt($e.css(id), 10);
}

function getFocusState() {
  var activeElement;
  try {
    activeElement = document.activeElement;
  } catch(e) {}
  var nodeName =
    activeElement &&
    activeElement.nodeName &&
    activeElement.nodeName.toLowerCase();

  // Handles only text input and textarea, not contenteditable
  if (nodeName && (
    (nodeName === 'input' && activeElement.type === 'text') ||
    nodeName === 'textarea'
  )) {
    if ('selectionStart' in activeElement) {
      // Modern browser with input or textarea.
      return {
        activeElement: activeElement,
        selection: {
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd
        }
      };
    }
  }
  return null;
}

function restoreFocusState(focusState) {
  if (!focusState) {
    return;
  }

  var currentActiveElement;
  try {
    currentActiveElement = document.activeElement;
  } catch(e) {}

  if (currentActiveElement === focusState.activeElement) {
    return;
  }

  var start = focusState.selection.start;
  var end = focusState.selection.end;
  if (typeof end === 'undefined') {
    end = start;
  }

  if ('selectionStart' in focusState.activeElement) {
    focusState.activeElement.selectionStart = start;
    focusState.activeElement.selectionEnd =
      Math.min(end, focusState.activeElement.value.length);
  }

  try {
    focusState.activeElement.focus();
  } catch (e) {}
}
