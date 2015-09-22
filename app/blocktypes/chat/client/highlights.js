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
 * Highlights functionality, part of messaging
 */

var siteConfig = require('/core').config;

if (__SCREEN__) {
  var highlightView = require('./highlight.html');
}

if (__CONTROL__ || __STAGE__) {
  var pickView = require('./pick.html');
}


// TODO move highlights translations locally here
var dict = require('./lang');

exports = module.exports = initHighlights;

// TODO think whether to extend prototype properly.
// There are usually max 10-20 instances of single blocktype, so perhaps it is
// ok to use memory by just adding methods to instance manually like this.

function initHighlights(block) {
  initHighlightsBasics(block);
  initHighlightButtons(block);
  if (siteConfig.SHOW_PICK_BUTTONS) {
    initPickButtons(block);
  }
  initToggleHighlightsOnScreen(block);
  initClearHighlights(block);
  if (siteConfig.SHOW_PICK_BUTTONS) {
    initClearPicks(block);
  }
}

function initHighlightsBasics(block) {

  // TODO get highlights and picks via setConfig instead
  block.on('data', function(data) {
    if (data.highlights) {
      this.emit('change:data:highlights', data.highlights);
    }
    if (data.picks) {
      this.emit('change:data:picks', data.picks);
    }
  });

  if (__SCREEN__) {
    // Not a div, but still
    var $highlightsDiv = block.$el.find('#' + block.id + '-highlights');
  }

  //var currentHighlights = [];

  // Expose RPC method
  // TODO get via config instead and just bind to change:highlights
  block.$highlightsIn = function(highlights) {
    this.emit('change:data:highlights', highlights);
  };
  block.$picksIn = function(picks) {
    this.emit('change:data:picks', picks);
  };

  // TODO properly
  // require messaging and use there an object hash or such
  function getMessageById(wantedId) {
    for (var i = 0; i < block.msgs.length; i++) {
      if (block.msgs[i].id === wantedId) {
        return block.msgs[i];
      }
    }
    return null;
  }

  block.on('change:data:picks', function(picks) {
    if (!picks) {
      picks = [];
    }

    if (!siteConfig.SHOW_PICK_BUTTONS) {
      return;
    }

    if (__CONTROL__ || __STAGE__) {

      // TODO get by id earlier
      var $picksDiv = block.$el.find('#' + block.id + '-picks');
      var $msgsDiv = block.$el.find('#' + block.id + '-msgs');
      // NOTE: causes reflow!
      var scrollPos = $(window).scrollTop();
      //var oldPos = $msgsDiv.offset().top;
      var oldHeight = $picksDiv.height();
      //var oldPickCount = $picksDiv.children().length;

      $picksDiv.empty();

      // Todo template
      var html = "";
      for (var i = 0; i < picks.length; i++) {
        var msg = getMessageById(picks[i].id);
        if (msg) {
          html += pickView(_.extend({}, msg, dict));
        }
      }
      $(html).appendTo($picksDiv);

      //var newPos = $msgsDiv.offset().top;
      var newHeight = $picksDiv.height();

      // // Slide latest in:
      // var newPickCount = $picksDiv.children().length;
      // if (newPickCount > oldPickCount) {
      //   $picksDiv.children().last().hide().slideDown(200);
      // }

      // Animate container height:
      $picksDiv.height(oldHeight);
      $picksDiv.stop().animate({height: newHeight}, 400, function() {
        $picksDiv.height('');
      });

      // Fix highlight buttons after each render
      var highlights = block.highlights || [];
      _.each(highlights, function(highlight) {
        var $onButton = block.$el.find('#pick-' + highlight.id + '-highlightBtn');
        $onButton.addClass('btn-warning');
        $onButton.attr('title', dict.UNHIGHLIGHTMSG_HOVER);
      });
    }
  });

  block.on('change:data:highlights', function(highlights) {
    // Save latest highlights to block to be able to rehighlight when
    // picks rerender..
    if (highlights) {
      block.highlights = highlights;
    }

    if (!highlights) {
      highlights = [];
    }

    if (__SCREEN__) {

      // 'highlights' argument must be an array of format:
      //
      //   [ {msgId: 1234, highlight: true}, ... ]

      var blockId = this.id;

      // clear out previous highlights
      //this.$el.find('#' + blockId + '-highlights').empty();
      $highlightsDiv.empty();

      // Todo template
      var html = "";
      // Reversed
      for (var i = highlights.length - 1; i >= 0; i--) {
        var msg = getMessageById(highlights[i].id);
        // Same template is used for messages and highlights, any good?
        if (msg) {
          html += highlightView(_.extend({}, msg));
        }
      }
      $(html).appendTo($highlightsDiv);
    }

    if (__WEB__) {
      // How much to show in web?

    }

  });
}

function initHighlightButtons(block) {
  if (__SCREEN__ || __CONTROL__ || __STAGE__) {
    block.$el.on('click', 'a.__BLOCKTYPE__-highlight', function(ev) {
      //var msgId = $(this).attr('data-id');
      var msgId = this.getAttribute('data-id');
      if (msgId) {
        // TODO speed up by selecting already, server will correct later
        // TODO toggle tag instead
        block.rpc('$toggleTag', msgId, 'screen');
      }
      return false;
    });
  }

  if (__CONTROL__ || __STAGE__) {

    block.on('change:data:highlights', function(highlights) {
      if (!highlights) {
        highlights = [];
      }

      // TODO properly, quite dangerous as so broad and slow
      // TODO check also fastclick glitches on iPad
      var $allButtons = block.$el.find('a.__BLOCKTYPE__-highlight');
      $allButtons.removeClass('btn-warning');
      $allButtons.attr('title', dict.HIGHLIGHTMSG_HOVER);
      // currentHighlights.forEach removeClass

      // TODO properly
      var $allMessages = block.$el.find('#' + block.id + '-msgs').children();
      $allMessages.css('font-weight', '');

      _.each(highlights, function(highlight) {
        // TODO fix, iterates multiple times (but there are only a few highlights so ok)
        //var $onButton = $allButtons.filter('[data-id="' + highlight.id + '"]');
        var $onButton = block.$el.find('#' + highlight.id + '-highlightBtn');
        $onButton.addClass('btn-warning');
        $onButton.attr('title', dict.UNHIGHLIGHTMSG_HOVER);

        // Do it also for picked list
        var $onButton = block.$el.find('#pick-' + highlight.id + '-highlightBtn');
        $onButton.addClass('btn-warning');
        $onButton.attr('title', dict.UNHIGHLIGHTMSG_HOVER);

        var $onMsg = block.$el.find('#' + highlight.id);
        $onMsg.css('font-weight', 800);
      });
    });
  }
}

// Almost the same as initHighlightButtons above
function initPickButtons(block) {
  if (__SCREEN__ || __CONTROL__ || __STAGE__) {
    block.$el.on('click', 'a.__BLOCKTYPE__-pick', function(ev) {
      //var msgId = $(this).attr('data-id');
      var msgId = this.getAttribute('data-id');
      if (msgId) {
        // TODO speed up by selecting already, server will correct later
        // TODO toggle tag instead
        block.rpc('$togglePick', msgId);
      }
      return false;
    });
  }

  if (__CONTROL__ || __STAGE__) {

    block.on('change:data:picks', function(picks) {
      if (!picks) {
        picks = [];
      }

      // TODO properly, quite dangerous as so broad and slow
      // TODO check also fastclick glitches on iPad
      var $allButtons = block.$el.find('a.__BLOCKTYPE__-pick');
      $allButtons.removeClass('btn-info');
      $allButtons.attr('title', dict.PICKMSG_HOVER);
      // currentHighlights.forEach removeClass

      // TODO properly
      var $allMessages = block.$el.find('#' + block.id + '-msgs').children();
      //$allMessages.css('font-weight', '');

      _.each(picks, function(pick) {
        // TODO fix, iterates multiple times (but there are only a few picks so ok)
        //var $onButton = $allButtons.filter('[data-id="' + pick.id + '"]');
        var $onButton = block.$el.find('#' + pick.id + '-pickBtn');
        $onButton.addClass('btn-info');
        $onButton.attr('title', dict.UNPICKMSG_HOVER);

        // Do it also for picked list
        var $onButton = block.$el.find('#pick-' + pick.id + '-pickBtn');
        $onButton.addClass('btn-info');
        $onButton.attr('title', dict.UNPICKMSG_HOVER);

        //var $onMsg = block.$el.find('#' + pick.id);
        //$onMsg.css('font-weight', 800)
      });
    });
  }
}


function initToggleHighlightsOnScreen(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function buttonOff() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.SCREENHIGHLIGHTS_BTN_OFF + '</span>');
        $button.attr('title', dict.SCREENHIGHLIGHTS_BTN_OFF_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      function buttonOn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-check"></span> ' + dict.SCREENHIGHLIGHTS_BTN_ON + '</span>');
        $button.attr('title', dict.SCREENHIGHLIGHTS_BTN_ON_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      $button.on('click', function(ev) {
        if (block.config.hideHighlightsOnScreen) {
          buttonOn();
          block.rpc('$hideHighlightsOnScreen', false);
        } else {
          buttonOff();
          block.rpc('$hideHighlightsOnScreen', true);
        }
        return false;
      });
      block.on('change:hideHighlightsOnScreen', function(hidden) {
        if (hidden) {
          buttonOff();
        } else {
          buttonOn();
        }
      });

      return $button;
    }

    $newButton().appendTo(block.$minibar);
  }

  if (__CONTROL__ || __SCREEN__) {

    // Listen for disable events
    block.on('change:hideHighlightsOnScreen', function(hidden) {
      if (__SCREEN__) {
        // TODO properly
        if (hidden) {
          //$('#' + this.id).find('.textblock').hide();
          this.$el.find('#' + this.id + '-highlights').hide();
        } else {
          this.$el.find('#' + this.id + '-highlights').show();
        }
      }
    });

    block.emit('change:hideHighlightsOnScreen', block.config.hideHighlightsOnScreen);
  }
}


function initClearHighlights(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function setAsClearBtn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-remove"></span> ' + dict.CLEARHIGHLIGHTS_BTN + '</span>');
        $button.attr('title', dict.CLEARHIGHLIGHTS_BTN_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }
      setAsClearBtn();

      $button.on('click', function(ev) {
        block.rpc('$clearTags', 'screen');
        return false;
      });

      return $button;
    };

    $newButton().appendTo(block.$minibar);
  }
}


function initClearPicks(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function setAsClearBtn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-remove"></span> ' + dict.CLEARPICKS_BTN + '</span>');
        $button.attr('title', dict.CLEARPICKS_BTN_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }
      setAsClearBtn();

      $button.on('click', function(ev) {
        block.rpc('$clearPicks');
        return false;
      });

      return $button;
    };

    $newButton().appendTo(block.$minibar);
  }
}

