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

var blockbase = require('/core/blockbase');

var dict = require('./lang');
var rpc = require('/core/rpc');
var events = require('/core/events');

module.exports = exports = initControls;

// TODO think whether to extend prototype properly.
// There are usually max 10-20 instances of single blocktype, so perhaps it is
// ok to use memory by just adding methods to instance manually like this.

function initControls(block) {
  // Temporary solution?
  block.config.typeName = require('./info').longName;
  if (__CONTROL__) {
    blockbase.initToolbar.call(block, block.$el.find('#' + block.id + '-toolbar'));
  }

  initShow(block);
  initSelect(block);
  initDuplicate(block);
  initClear(block);
  initDelete(block);
  initLift(block);
  initCollapse(block);
}

/**
 * Show/Hide this block (in web, mostly)
 */

function initShow(block) {

  if (__CONTROL__) {
    var $showButton = blockbase.newShowButton(block);
    // TODO just append
    block.$toolbar.find('#' + block.id + '-show').replaceWith($showButton);
  }

  // Listen show events
  block.on('change:visible', function(shown, firstLoad) {

    if (__CONTROL__ && shown) {
      if (firstLoad) {
        block.$el.css({opacity: ''});
      } else {
        block.$el.finish().animate({opacity: 1}, 200, function() {
          block.$el.css('opacity', '');
        });
      }
    }
    if (__CONTROL__ && !shown) {
      if (firstLoad) {
        block.$el.css({opacity: 0.5});
      } else {
        block.$el.finish().animate({opacity: 0.5}, 200);
      }
    }

    if (__SCREEN__ && shown) {
      // Not reacted to at this point
    }
    if (__SCREEN__ && !shown)  {
      // Not reacted to at this point
    }

    if ((__WEB__ || __STAGE__) && shown)  {
      if (firstLoad) {
        block.$el.css({opacity: ''});
      } else {
        // TODO if there are no other blocks visible (to be pushed), just fade in
        block.$el.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
          block.$el.css('opacity', '');
        });
        $('html, body').stop(true).animate({
          scrollTop: block.$el.offset().top
        }, 800);
      }
    }
    if ((__WEB__ || __STAGE__) && !shown)  {
      if (firstLoad) {
        block.$el.css({opacity: 0});
        block.$el.hide();
      } else {
        // fade out first, then animate height and scroll simultaneously
        block.$el.finish().animate({opacity: 0}, 200, function() {
          block.$el.animate({height: 'hide'}, 200);
          // TODO just copied from mixer-pre
          if ($(window).scrollTop() > block.$el.offset().top) {
            var targetTop = $(window).scrollTop() - block.$el.outerHeight(true);
            if (targetTop < 0) targetTop = 0;
            $('html, body').stop(true).animate({scrollTop: targetTop}, 200);
          }
        });
      }
    }
  });

  // Hide quickly for first load
  //if (__WEB__ && !this.config.visible) {
  //  this.$el.hide();
  //}

  block.emit('change:visible', block.config.visible, true);
};

/**
 * Highlight/Unhighlight this block (in screen, mostly)
 */

function initSelect(block) {

  if (__CONTROL__) {
    var $selectButton = blockbase.newSelectButton(block);
    // TODO just append
    block.$toolbar.find('#' + block.id + '-select').replaceWith($selectButton);
  }

  // Listen for highlight events
  block.on('change:selected', function(selected) {
    if (__SCREEN__ && selected) {
      //$('.blockview').hide();
      block.$el.show();
    }
    if (__SCREEN__ && !selected)  {
      block.$el.hide();
    }

    if ((__CONTROL__ || __WEB__ || __STAGE__) && selected)  {
      //$('#' + this.id).css('background-color', '#FFE');
    }
    if ((__CONTROL__ || __WEB__ || __STAGE__) && !selected)  {
      //$('#' + this.id).css('background-color', '');
    }
  });
  block.emit('change:selected', block.config.selected);
};

function initDuplicate(block) {
  if (__CONTROL__) {
    var $duplicateButton = blockbase.newDuplicateButton(block);
    //block.$toolbar.find('#' + block.id + '-duplicate').replaceWith('<span>hoplahopla</span>');
    block.$toolbar.find('#' + block.id + '-duplicate').replaceWith($duplicateButton);
  }
};

function initClear(block) {
  if (__CONTROL__) {
    var $clearButton = blockbase.newClearButton(block);
    block.$toolbar.find('#' + block.id + '-clear').replaceWith($clearButton);
  }
};

function initDelete(block) {
  if (__CONTROL__) {
    var $deleteButton = blockbase.newDeleteButton(block);
    block.$toolbar.find('#' + block.id + '-delete').replaceWith($deleteButton);
  }
  // Otherwise nop for now, handled on block collection level
  // TODO later: Clear timers and intervals, etc. via .dispose()
};

function initLift(block) {
  if (__CONTROL__) {
    var $liftButton = blockbase.newLiftButton(block);
    block.$toolbar.find('#' + block.id + '-lift').replaceWith($liftButton);

    var $lowerButton = blockbase.newLowerButton(block);
    //$lowerButton.appendTo($liftButtons);
    block.$toolbar.find('#' + block.id + '-lower').replaceWith($lowerButton);
  }
};

function initCollapse(block) {
  if (__CONTROL__) {
    //blockbase.setCollapseButtons.call(this, this.$toolbar);
    var $collapseButton = blockbase.newCollapseButton(block);
    block.$toolbar.find('#' + block.id + '-collapse').replaceWith($collapseButton);
  }
};


// TODO where to update the participantCount and lastActive timestamp?
// - One could call a custom block method from the server
// - One could update state or generic config from server (would update all)
// - One could keep count of these on the client? For anonymous not possible.

// Last activity is nice to keep in the client, by emitting activity timestamps
// Participant count is nice to keep on the server, by calling custom method when changed

if (__CONTROL__ || __STAGE__) {
  exports.participantCount = function(block) {
    // Will be nop object on many channels
    var $participantCount = block.$el.find('#' + block.id + '-count');
    block.on('change:participantCount', function(participantCount) {
      $participantCount.text(participantCount);
    });
    block.emit('change:participantCount', block.config.participantCount);
  };
}

// TODO refactor to use config
exports.initLastActivity = function(block) {
  if (__WEB__) return;
  var $lastActivity = block.$el.find('#' + block.id + '-activity');
  block.on('activity', function(lastActivity) {
    this.lastActivity = lastActivity;
    this.emit('change:data:lastActivity', this.lastActivity);
  });
  block.on('change:data:lastActivity', function(lastActivity) {
    if (!lastActivity) return;
    $lastActivity.text(lastActivity.short() + ' ' + dict.ACTIVITY_AGO);
  });
  // Experiment: emit 'change' every 10 seconds
  // Keeping setIntervals limited
  if (__CONTROL__) {
    events.on('tick10s', function() {
      block.emit('change:data:lastActivity', block.lastActivity);
    });
  }
};
