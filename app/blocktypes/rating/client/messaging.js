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

var moment = require('/core/moment');

var msgView = require('./msg.html');
// TODO move highlights translations locally here
var dict = require('./lang');

var siteConfig = require('/core').config;

//var sessionStorage = require('/core/sessionStorage');

exports = module.exports = messaging;

// TODO think whether to extend prototype properly.
// There are usually max 10-20 instances of single blocktype, so perhaps it is
// ok to use memory by just adding methods to instance manually like this.

function messaging(block) {
  initMessagingBasics(block);
  initDisable(block);
  initHideMsgsOnWeb(block);
  initModeration(block);
  //initUsernames(block);
}

function initMessagingBasics(block) {
  // Same on screen and on other channels
  // TODO naming, it is not a div on screen but an ol (as it should be on web also?)
  block.$msgsDiv = block.$el.find('#' + block.id + '-msgs');

  // Create internal data structures
  // TODO (hash + array) for quick lookup
  // Traversed in highlights, for example
  if (!block.msgs) block.msgs = [];

  // TODO get first batch of messages already from block config
  // for fast rendering, just update more via data or specific rpc requests
  block.on('data', function(data) {
    // TODO compare here or somewhere
    if (data.msgs) {
      block.$msgsIn(data.msgs);
    }
  });

  // TODO save to internal this.msgs structure
  block.$msgsIn = function(msgs) {
    for (var i = 0; i < msgs.length; i++) {
      this.$msgIn(msgs[i], true);
    }
  };

  block.$msgIn = $msgIn;

  // Reset block is here for now
  block.$clear = function() {
    block.msgs = [];
    // Could this break when animating?
    block.$msgsDiv.empty();
  }


  if (__SCREEN__) return; // We don't need interaction yet

  //var previousMessage = '';
  //var previousSent;

  var $inputField = block.$el.find('#' + block.id + '-input');
  $inputField.on('keydown', function(ev) {
    if (ev.which == 13) {
      // Enter, don't send
      //$sendBtn.click();
      return false;
    }
  });
  var $sendBtn = block.$el.find('#' + block.id + '-send');
  $sendBtn.on('click', function(ev) {
    var text = $inputField.val();
    text = trimWhitespace(text);
    if (!text) {
      $inputField.val('');
      return false;
    }
    if (text.length > 500) {
      alert('Max 500 characters, thank you');
      return false;
    }

    var msg = {text: text};
    // For now, clear text field right away (could lose msg on failed send)
    // to prevent duplicate sends on slow sends
    $inputField.val('');
    block.rpc('$msg', msg, function(err) {
      if (err) return; //something
    });
    return false;
  });
}

function trimWhitespace(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

// TODO save to internal this.msgs structure
function $msgIn(msg, immediate) {
  // TODO validate msg

  // TODO check existing from dom or from .msgs (to not get duplicates after reconnects)
  // TODO clean up, emit msg to allow quality feature from other module

  //var $oldMsg = $('#' + msg.id);
  var oldMsg = document.getElementById(msg.id);
  //if ($oldMsg.length) {
  if (oldMsg) {
    // Existing message. Check possibly changed parameters.
    // TODO use switch statement
    // TODO convert to classes!
    //setQuality($oldMsg, msg.q);
    var $oldMsg = $(oldMsg);

    if (msg.q == 'x') {
      // deleted
      if (__CONTROL__) {
        $oldMsg.finish().animate({opacity: 0.5});
      } else {
        $oldMsg.finish().animate({opacity: 0}, 200, function() {
          $oldMsg.animate({height: 'hide'}, 200);
        });
      }
    } else {
      if (__CONTROL__) {
        $oldMsg.finish().animate({opacity: 1}, 200, function() {
          $oldMsg.css('opacity', '');
        });
      } else {
        $oldMsg.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
          $oldMsg.css('opacity', '');
        });
      }
    }

    return;
  }

  var time = moment(msg.time);
  // TODO localization
  // TODO remove time from rating messages, not needed
  msg.timeStr = time.format('HH:mm');
  //msg.timeStr = time.fromNow();
  msg.timeTitle = time.format();

  msg.blockId = this.id;

  this.emit('activity', time);

  // TODO linkify links with a regexp like
  // /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/

  this.msgs.push(msg);

  // remove messages from DOM to save memory
  var MSG_LIMIT = 1000;
  if (__SCREEN__) {
    MSG_LIMIT = 1000;
  }
  if (__CONTROL__) {
    MSG_LIMIT = 1000;
  }
  if (__STAGE__) {
    MSG_LIMIT = 1000;
  }
  if (this.msgs.length > MSG_LIMIT) {
    var removedMsg = this.msgs.shift();
    var $removedMsg = $('#' + removedMsg.id); // From document, not scoped to $el this time
    $removedMsg.remove(); // .detach would keep the events intact
  }

  // TODO load more button

  //var $msg = $(msgView(msg));
  // TODO add ratingbuttons externally after template
  var $msg = $(msgView(_.extend({}, msg, dict, {
    SHOWRATINGSTATS: siteConfig.SHOWRATINGSTATS,
    POINTS: siteConfig.POINTS,
    ratingButtons: this.config.ratingButtons,
    likertScale: this.config.likertScale
  })));

  if (msg.q == 'x') {
    // deleted
    if (__CONTROL__ ) {
      if (immediate) {
        $msg.css({opacity: 0.5});
        $msg.prependTo(this.$msgsDiv);
      } else {
        $msg.hide().css({opacity: 0});
        $msg.prependTo(this.$msgsDiv);
        $msg.finish().animate({height: 'show'}, 200).animate({opacity: 0.5}, 200);
      }
    } else {
      $msg.hide().css({opacity: 0});
      $msg.prependTo(this.$msgsDiv);
    }
    //return;
  } else {
    // shown
    if (immediate) {
      //this.$msgsDiv.prepend(msgView(msg));
      $msg.prependTo(this.$msgsDiv);
    } else {
      $msg.hide().css({opacity: 0});
      $msg.prependTo(this.$msgsDiv);
      $msg.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
        $msg.css('opacity', '');
      });
    }
  }
};

function initDisable(block) {
  if (__CONTROL__) {

    var $newButton = function() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.DISABLE_BTN + '</span>');
        $button.attr('title', dict.DISABLE_HOVER);
      }

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.ENABLE_BTN + '</span>');
        $button.attr('title', dict.ENABLE_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.active) {
          buttonOff();
          block.rpc('$active', false);
        } else {
          buttonOn();
          block.rpc('$active', true);
        }
        return false;
      });

      block.on('change:active', function(enabled) {
        if (enabled) {
          buttonOn();
        } else {
          buttonOff();
        }
      });

      return $button;
    };

    $newButton().appendTo(block.$minibar);
  }

  // Listen for disable events
  block.on('change:active', function(enabled, immediate) {
    var $input = this.$el.find('#' + this.id + '-form');
    // TODO properly
    if (!enabled) {
      if (immediate) {
          //$('#' + this.id).find('.textblock').hide();
          //this.$el.find('#' + this.id + '-form').hide();
          if (__CONTROL__ || __STAGE__) {
            $input.css({opacity: 0.25});
          } else {
            $input.hide();
          }
      } else {
        if (__CONTROL__ || __STAGE__) {
          $input.finish().animate({opacity: 0.25}, 200);
        } else {
          $input.finish().animate({opacity: 0}, 200, function() {
            $input.animate({height: 'hide'}, 200);
          });
        }
      }
    } else {
      if (immediate) {
        //this.$el.find('#' + this.id + '-form').show();
        if (__CONTROL__ || __STAGE__) {
          $input.css('opacity', '');
        } else {
          $input.show();
        }
      } else {
        if (__CONTROL__ || __STAGE__) {
          $input.finish().animate({opacity: 1}, 200, function() {
            $input.css('opacity', '');
          });
        } else {
          $input.hide().css({opacity: 0});
          $input.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
            $input.css('opacity', '');
          });
        }
      }
    }
  });

  // TODO some other way to signal first load, perhaps via flag
  block.emit('change:active', block.config.active, true);
}

function initHideMsgsOnWeb(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#" title=""></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.WEBMSGS_BTN_OFF + '</span>');
        $button.attr('title', dict.WEBMSGS_BTN_OFF_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.WEBMSGS_BTN_ON + '</span>');
        $button.attr('title', dict.WEBMSGS_BTN_ON_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      $button.on('click', function(ev) {
        if (block.config.hideMsgsOnWeb) {
          buttonOn();
          block.rpc('$hideMsgsOnWeb', false);
        } else {
          buttonOff();
          block.rpc('$hideMsgsOnWeb', true);
        }
        return false;
      });

      block.on('change:hideMsgsOnWeb', function(hidden) {
        if (hidden) {
          buttonOff();
        } else {
          buttonOn();
        }
      });

      return $button;
    }

    $newButton().appendTo(block.$minibar)
  }

  if (__CONTROL__ || __WEB__) {
    block.on('change:hideMsgsOnWeb', function(hidden, immediate) {

      var $msgs = this.$el.find('#' + this.id + '-msgs');
      // TODO properly
      if (hidden) {
        if (immediate) {
          //$('#' + this.id).find('.textblock').hide();
          //this.$el.find('#' + this.id + '-form').hide();
          if (__CONTROL__) {
            $msgs.css({opacity: 0.5});
          } else {
            $msgs.hide();
          }
        } else {
          if (__CONTROL__) {
            $msgs.finish().animate({opacity: 0.5}, 200);
          } else {
            $msgs.finish().animate({opacity: 0}, 200, function() {
              $msgs.animate({height: 'hide'}, 200);
            });
          }
        }
      } else {
        if (immediate) {
          //this.$el.find('#' + this.id + '-form').show();
          if (__CONTROL__) {
            $msgs.css('opacity', '');
          } else {
            $msgs.show();
          }
        } else {
          if (__CONTROL__) {
            $msgs.finish().animate({opacity: 1}, 200, function() {
              $msgs.css('opacity', '');
            });
          } else {
            $msgs.hide().css({opacity: 0});
            $msgs.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
              $msgs.css('opacity', '');
            });
          }
        }
      }

    });
  }

  if (__CONTROL__ || __WEB__) {
    block.emit('change:hideMsgsOnWeb', block.config.hideMsgsOnWeb, true);
  }
};

// TODO perhaps move to quality.js
function initModeration(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.MODERATION_BTN_OFF + '</span>');
        $button.attr('title', dict.MODERATION_BTN_OFF_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.MODERATION_BTN_ON + '</span>');
        $button.attr('title', dict.MODERATION_BTN_ON_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      $button.on('click', function(ev) {
        if (block.config.moderated) {
          buttonOff();
          block.rpc('$setModerated', false);
        } else {
          buttonOn();
          block.rpc('$setModerated', true);
        }
        return false;
      });

      block.on('change:moderated', function(moderated) {
        if (moderated) {
          buttonOn();
        } else {
          buttonOff();
        }
      });

      return $button;
    };

    $newButton().appendTo(block.$minibar);
  }

  if (__CONTROL__) {
    block.emit('change:moderated', block.config.moderated);
  }
}

function initUsernames(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.USERNAMES_BTN_OFF + '</span>');
        $button.attr('title', dict.USERNAMES_BTN_OFF_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.USERNAMES_BTN_ON + '</span>');
        $button.attr('title', dict.USERNAMES_BTN_ON_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      $button.on('click', function(ev) {
        if (block.config.usernames) {
          buttonOff();
          block.rpc('$usernames', false);
        } else {
          buttonOn();
          block.rpc('$usernames', true);
        }
        return false;
      });

      block.on('change:usernames', function(usernames) {
        if (usernames) {
          buttonOn();
        } else {
          buttonOff();
        }
      });

      return $button;
    };

    $newButton().appendTo(block.$minibar);
  }

  block.on('change:usernames', function(usernames, immediate) {
    var $sendButton = this.$el.find('#' + this.id + '-sendWithUsername');
    // TODO properly
    if (!usernames) {
      if (immediate) {
          //$('#' + this.id).find('.textblock').hide();
          //this.$el.find('#' + this.id + '-form').hide();
          $sendButton.hide();
      } else {
        $sendButton.finish().fadeOut(200);
      }
    } else {
      if (immediate) {
        //this.$el.find('#' + this.id + '-form').show();
        $sendButton.show();
      } else {
        $sendButton.hide();
        $sendButton.finish().fadeIn(200);
      }
    }
  });

  // TODO some other way to signal first load, perhaps via flag
  block.emit('change:usernames', block.config.usernames, true);
}

