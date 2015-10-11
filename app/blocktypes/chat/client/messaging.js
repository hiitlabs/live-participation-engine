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

var rpc = require('/core/rpc');

exports = module.exports = initMessaging;

// TODO think whether to extend prototype properly.
// There are usually max 10-20 instances of single blocktype, so perhaps it is
// ok to use memory by just adding methods to instance manually like this.

function initMessaging(block) {
  initMessagingBasics(block);
  initReplying(block);
  initDisable(block);
  initHideMsgsOnWeb(block);
  initModeration(block);
  if (siteConfig.USERNAMES) {
    initUsernames(block);
  }
  if (siteConfig.EDITING) {
    initEditing(block);
  }
  if (siteConfig.ONE_MSG) {
    initOnlyOneSend(block);
  }
  if (siteConfig.NOTIFYWRITING) {
    initNotifyWriting(block);
  }
  initHideMsgsOnScreen(block);
  initMsgsSizeOnScreen(block);
  //initMoreMsgs(block);
};

function initMessagingBasics(block) {
  // Same on screen and on other channels
  // TODO naming, it is not a div on screen but an ol (as it should be on web also?)
  block.$msgsDiv = block.$el.find('#' + block.id + '-msgs');

  // Create internal data structures
  // TODO move all this to ChatStore
  // TODO (hash + array) for quick lookup
  // Traversed in highlights, for example
  if (!block.msgs) block.msgs = [];
  if (!block.msgsById) block.msgsById = {};

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
    block.msgsById = {};
    // Could this break when animating?
    block.$msgsDiv.empty();
  }

  if (__SCREEN__) return; // We don't need interaction yet

  var $inputField = block.$el.find('#' + block.id + '-input');
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
    $inputField.blur();
    block.rpc('$msg', msg, function(err) {
      if (err) return; //something

      if (siteConfig.ONE_MSG) {
        if (block.config.onlyOneSend) {
          // TODO properly, now let's just fake a disabled event (without affecting
          // block.config.active to prevent reversals)
          block.emit('change:active', false);
        }
      }
    });

    return false;
  });
  var $sendWithUsernameBtn = block.$el.find('#' + block.id + '-sendWithUsername');
  // TODO consolidate with above! Only change is withUsername
  $sendWithUsernameBtn.on('click', function(ev) {
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
    var msg = {
      text: text,
      withUsername: true
    };
    $inputField.val('');
    $inputField.blur();
    block.rpc('$msg', msg, function(err) {
      if (err) return; //something

      if (siteConfig.ONE_MSG) {
        if (block.config.onlyOneSend) {
          // TODO properly, now let's just fake a disabled event (without affecting
          // block.config.active to prevent reversals)
          block.emit('change:active', false);
        }
      }
    });
    return false;
  });

  if (siteConfig.NOTIFYWRITING) {
    var throttledNotify = _.throttle(function() {
      block.rpc('$writing');
    }, 3000, {trailing: false});

    $inputField.on('keydown', function(ev) {
      throttledNotify();
    });
  }

}


function trimWhitespace(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

// TODO save to internal this.msgs structure
function $msgIn(msg, immediate) {
  // TODO validate msg

  // TODO check existing from dom or from .msgs (to not get duplicates after reconnects)
  // TODO clean up, emit msg to allow quality feature from other module

  var existingMsg = this.msgsById[msg.id];
  if (existingMsg) {
    if (existingMsg.q !== msg.q || existingMsg.text !== msg.text) {

      //var $oldMsg = $('#' + msg.id);
      // TODO proper stash structure to prevent querying dom every time
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
          if (__CONTROL__ || msg.own) {
            $oldMsg.finish().animate({opacity: 0.5}, 200);
            //$(oldMsg).animate({opacity: 0.5}).find('.btn-group').css({visibility: 'hidden'});
          } else {
            $oldMsg.finish().animate({opacity: 0}, 200, function() {
              $oldMsg.animate({height: 'hide'}, 200);
            });
          }
        } else {
          if (__CONTROL__ || msg.own) {
            $oldMsg.finish().animate({opacity: 1}, 200, function() {
              $oldMsg.css('opacity', '');
            });
          } else {
            $oldMsg.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
              $oldMsg.css('opacity', '');
            });
          }
        }

        if (existingMsg.text !== msg.text) {
          $oldMsg.find('span.__BLOCKTYPE__-msg-text').text(msg.text);
        }
      }

      // Update internal store
      existingMsg.q = msg.q;
      existingMsg.text = msg.text;
    }

    return;
  }


  var time = moment(msg.time);
  // TODO localization
  // TODO perhaps only latest as (1 min ago), update them every 15 secs or so,
  // then after some time as static timestamps?
  msg.timeStr = time.format('HH:mm');
  //msg.timeStr = time.fromNow();
  msg.timeTitle = time.format();

  msg.blockId = this.id;

  this.emit('activity', time);

  // TODO linkify links with a regexp like
  // /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/

  // TODO proper stash structure (quick refs vs ordering)
  //if (!this.msgsById) this.msgsById = {};
  this.msgs.push(msg);
  this.msgsById[msg.id] = msg;

  // remove messages from DOM to save memory
  var MSG_LIMIT = 500;
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
    // TODO check that no problem with old messages coming in again later
    var removedMsg = this.msgs.shift();
    var $removedMsg = $('#' + removedMsg.id); // From document, not scoped to $el this time
    $removedMsg.remove(); // .detach would keep the events intact
  }

  // TODO load more button

  // TODO get flag by extending config instead, perhaps
  var $msg = $(msgView(_.extend({}, msg, dict, {
    POINTS: siteConfig.POINTS, editingButtons: this.config.editingButtons, REPLYING: siteConfig.REPLYING,
    SHOW_PICK_BUTTONS: siteConfig.SHOW_PICK_BUTTONS
  })));

  var $msgsDiv = this.$msgsDiv;

  if (msg.parent) {
    if (__SCREEN__) {
      return;
    }
    var parentEl = document.getElementById(msg.parent);
    if (!parentEl) {
      return;
    }
    var $parent = $(parentEl);
    var $replies = $parent.find('.repliesDiv');
    if (!$replies.length) {
      $replies = $('<div class="repliesDiv clearfix"></div>');
      $replies.appendTo($parent);
    }
    $msgsDiv = $replies;
    $('<span> &mdash; </span>').prependTo($msg);
  }

  if (msg.q == 'x') {
    // deleted
    if (__CONTROL__ || msg.own) {
      if (immediate) {
        $msg.css({opacity: 0.5});
        $msg.prependTo($msgsDiv);
      } else {
        this.emit('newMessage'); // for NotifyWriting
        $msg.hide().css({opacity: 0});
        $msg.prependTo($msgsDiv);
        $msg.finish().animate({height: 'show'}, 200).animate({opacity: 0.5}, 200);
      }
    } else {
      $msg.hide().css({opacity: 0});
      $msg.prependTo($msgsDiv);
    }
  } else {
    // shown
    if (immediate) {
      $msg.prependTo($msgsDiv);
    } else {
      this.emit('newMessage'); // for NotifyWriting
      $msg.hide().css({opacity: 0});
      $msg.prependTo($msgsDiv);
      $msg.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
        $msg.css('opacity', '');
      });
    }
  }

};

function initReplying(block) {
  if (__CONTROL__ || __STAGE__) {
    block.$el.on('click', 'a.__BLOCKTYPE__-reply', function(ev) {
      var $el = $(this);
      var msgId = $el.attr('data-id');
      // TODO get a good parent element
      //var $msg = $('#' + msgId).children('span:first-child');
      var $msg = $('#' + msgId).find('span.__BLOCKTYPE__-msg-text');
      if (!$msg.length) return false;

      $msg.popover({
          html: true,
          placement: 'bottom',
          selector: true,
          //title: dict.CLEAR_HOVER,
          content: '<input class="form-control input-sm" type="text">' + ' <a href="#" class="btn btn-xs btn-primary">' + dict.SEND_BTN + '</a>',
          //trigger: 'click'
          trigger: 'manual',
          container: 'body'
      }).popover('toggle'); //.popover('hide'); // Create hidden tip already

      var timeout;
      var $tip = $msg.data('bs.popover').$tip;
      $tip.find('input').click().focus();

      $tip.on('click', function(event) {
        // Prevent menu from closing
        //event.stopPropagation();
      });
      $tip.on('mouseleave focusout', function() {
        $msg.popover('destroy');
      });

      $tip.on('blur', 'input', function() {
        return false;
      });
      $tip.on('keydown', 'input', function(ev) {
        if (ev.which == 27) {
          // Esc, cancel edit
          //return false;
        }
        if (ev.which == 13) {
          // Return, save
          $tip.find('a').click();
          return false;
        }
      });
      $tip.on('click', 'a', function() {

        var $inputField = $tip.find('input');

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

        var msg = {
          text: text,
          parent: msgId,
          withUsername: true
        };

        // For now, clear text field right away (could lose msg on failed send)
        // to prevent duplicate sends on slow sends
        $inputField.val('');
        block.rpc('$msg', msg, function(err) {
          if (err) return; //something
        });

        $msg.popover('destroy');
        return false;
      });

      return false;
    });
  }
}


function initDisable(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.DISABLE_BTN + '</span>');
        $button.attr('title', dict.DISABLE_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.ENABLE_BTN + '</span>');
        $button.attr('title', dict.ENABLE_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
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
    }

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


function initMsgsSizeOnScreen(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function buttonOff() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.LARGEMSGS_BTN_OFF + '</span>');
        $button.attr('title', dict.LARGEMSGS_BTN_OFF_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      function buttonOn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-check"></span> ' + dict.LARGEMSGS_BTN_ON + '</span>');
        $button.attr('title', dict.LARGEMSGS_BTN_ON_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      $button.on('click', function(ev) {
        if (block.config.smallMsgsOnScreen) {
          buttonOn();
          block.rpc('$updateFrontends', 'smallMsgsOnScreen', false);
        } else {
          buttonOff();
          block.rpc('$updateFrontends', 'smallMsgsOnScreen', true);
        }
        return false;
      });

      block.on('change:smallMsgsOnScreen', function(small) {
        if (small) {
          buttonOff();
        } else {
          buttonOn();
        }
      });

      return $button;
    };

    $newButton().appendTo(block.$minibar);
  }

  if (__SCREEN__) {
    block.on('change:smallMsgsOnScreen', function(small) {
      // TODO properly via classes not inline styles
      if (small) {
        //$('#' + this.id).find('.textblock').hide();
        this.$el.find('#' + this.id + '-msgs').addClass('blockcontainer-mini');
        //this.$el.find('#' + this.id + '-heading').hide();
        this.$el.find('#' + this.id + '-heading').addClass('blockcontainer-mini');
        this.$el.find('#' + this.id + '-msgs').css({'font-size':'80%', 'line-height':'100%', 'margin-top':'0.2em', width:'40em'});
      } else {
        this.$el.find('#' + this.id + '-msgs').removeClass('blockcontainer-mini');
        //this.$el.find('#' + this.id + '-heading').show();
        this.$el.find('#' + this.id + '-heading').removeClass('blockcontainer-mini');
        this.$el.find('#' + this.id + '-msgs').css({'font-size':'', 'line-height':'', 'margin-top':'', width:''});
      }
    });
  }

  if (__CONTROL__ || __SCREEN__) {
    block.emit('change:smallMsgsOnScreen', block.config.smallMsgsOnScreen);
  }
}

function initHideMsgsOnScreen(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#" title=""></a>';
      var $button = $(buttonStr);
      //$button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

      function buttonOff() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.SCREENMSGS_BTN_OFF + '</span>');
        $button.attr('title', dict.SCREENMSGS_BTN_OFF_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      function buttonOn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-check"></span> ' + dict.SCREENMSGS_BTN_ON + '</span>');
        $button.attr('title', dict.SCREENMSGS_BTN_ON_HOVER);
        //$button.tooltip('fixTitle');
        //$button.tooltip('hide');
      }

      $button.on('click', function(ev) {
        if (block.config.hideMsgsOnScreen) {
          buttonOn();
          block.rpc('$updateFrontends', 'hideMsgsOnScreen', false);
        } else {
          buttonOff();
          block.rpc('$updateFrontends', 'hideMsgsOnScreen', true);
        }
        return false;
      });

      block.on('change:hideMsgsOnScreen', function(hidden) {
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

  if (__SCREEN__) {
    block.on('change:hideMsgsOnScreen', function(hidden) {
      // TODO properly via classes not inline styles
      if (hidden) {
        //$('#' + this.id).find('.textblock').hide();
        this.$el.find('#' + this.id + '-heading').hide();
        this.$el.find('#' + this.id + '-msgs').hide();
      } else {
        this.$el.find('#' + this.id + '-heading').show();
        this.$el.find('#' + this.id + '-msgs').show();
      }
    });
  }

  if (__CONTROL__ || __SCREEN__) {
    block.emit('change:hideMsgsOnScreen', block.config.hideMsgsOnScreen);
  }
};

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
          block.rpc('$updateFrontends', 'hideMsgsOnWeb', false);
        } else {
          buttonOff();
          block.rpc('$updateFrontends', 'hideMsgsOnWeb', true);
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
          block.rpc( '$updateFrontends', 'moderated', false);
        } else {
          buttonOn();
          block.rpc( '$updateFrontends', 'moderated',  true);
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
          block.rpc('$updateFrontends', 'usernames', false);
        } else {
          buttonOn();
          block.rpc('$updateFrontends', 'usernames', true);
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

function initEditing(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.EDITINGBUTTONS_BTN_OFF + '</span>');
        $button.attr('title', dict.EDITINGBUTTONS_BTN_OFF_HOVER);
      }

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.EDITINGBUTTONS_BTN_ON + '</span>');
        $button.attr('title', dict.EDITINGBUTTONS_BTN_ON_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.editingButtons) {
          buttonOff();
          block.rpc('$updateFrontends', 'editingButtons', false);
        } else {
          buttonOn();
          block.rpc('$updateFrontends', 'editingButtons', true);
        }
        return false;
      });
      block.on('change:editingButtons', function(shown) {
        if (shown) {
          buttonOn();
        } else {
          buttonOff();
        }
      });

      return $button;
    }

    $newButton().appendTo(block.$minibar);
  }

  if (__WEB__ || __CONTROL__ || __STAGE__) {

    // Listen for disable events
    block.on('change:editingButtons', function(shown) {
      // TODO properly
      if (shown) {
        //$('#' + this.id).find('.textblock').hide();
        this.$el.find('.__BLOCKTYPE__-editing').show();
      } else {
        this.$el.find('.__BLOCKTYPE__-editing').hide();
      }
    });

    block.emit('change:editingButtons', block.config.editingButtons);


    block.$el.on('click', 'a.__BLOCKTYPE__-editing', function(ev) {
      // TODO properly, state, tagging etc
      var $btn = $(this);

      var msgId = $btn.attr('data-id');

      var $msg = $('#' + msgId).find('span.__BLOCKTYPE__-msg-text');
      if (!$msg.length) return false;

      var oldText = $msg.text();

      $msg.attr('contenteditable', true); // or el.setAttribute('contenteditable', 'true');
      $msg.focus();

      $msg.on('keydown', function(ev) {
        if (ev.which == 27) {
          // Esc, cancel edit
          $msg.text(oldText);
          $msg.blur();
          return false;
        }
        if (ev.which == 13) {
          // Return, save
          $msg.blur();
          return false;
        }
      });
      $msg.on('blur', function() { // or el.onblur =
        checkAndSend();
        return false;
      });

      function checkAndSend() {
        $msg.attr('contenteditable', null);
        $msg.off('keydown blur');
        var text = $msg.text();
        text = trimWhitespace(text);
        if (!text) {
          $msg.text(oldText);
          return;
        }
        if (text == oldText) return;
        if (text.length > 500) {
          alert('Max 500 characters, thank you');
          return false;
        }

        block.rpc('$editMsg', {
          text: text,
          id: msgId
        }, function(err) {
          if (err) return;
        });
      }

      return false;
    });
  }
}

function initOnlyOneSend(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.ONLYONESEND_BTN_OFF + '</span>');
        $button.attr('title', dict.ONLYONESEND_BTN_OFF_HOVER);
      }

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.ONLYONESEND_BTN_ON + '</span>');
        $button.attr('title', dict.ONLYONESEND_BTN_ON_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.onlyOneSend) {
          buttonOff();
          block.rpc('$updateFrontends', 'onlyOneSend', false);
        } else {
          buttonOn();
          block.rpc('$updateFrontends', 'onlyOneSend', true);
        }
        return false;
      });
      block.on('change:onlyOneSend', function(shown) {
        if (shown) {
          buttonOn();
        } else {
          buttonOff();
        }
      });

      return $button;
    }

    $newButton().appendTo(block.$minibar);
  }

  if (__WEB__ || __CONTROL__ || __STAGE__) {

    block.emit('change:onlyOneSend', block.config.onlyOneSend);
  }
}

function initNotifyWriting(block) {
  var currentlyWriting = false;
  var $notifyWritingEl = block.$el.find('#' + block.id + '-notifyWriting');
  var clearNotify = function() {
    if (!currentlyWriting) {
      return;
    }
    currentlyWriting = false;
    $notifyWritingEl.finish().animate({opacity: 0}, 200, function() {
      $notifyWritingEl.animate({height: 'hide'}, 200);
    });
  }
  var clearNotifyDebounced = _.debounce(clearNotify, 5000);

  // clear also when message comes in
  block.on('newMessage', clearNotify);

  // TODO move to prototype if needed
  block.$notifyWriting = function() {
    clearNotifyDebounced();
    if (currentlyWriting) {
      return;
    }
    currentlyWriting = true;
    $notifyWritingEl.hide().css({opacity: 0});
    $notifyWritingEl.text(dict.NOTIFYWRITING_TEXT);
    $notifyWritingEl.attr('title', dict.NOTIFYWRITING_HOVER);
    $notifyWritingEl.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
      $notifyWritingEl.css('opacity', '');
    });
  }
}
