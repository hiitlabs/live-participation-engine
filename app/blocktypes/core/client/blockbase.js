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
 * Common helpers for all blocks
 */

var rpc = require('./rpc');

var dict = require('./lang');

var sessionStorage = require('./sessionStorage');

var slice = Array.prototype.slice;

if (__CONTROL__) {
  exports.initToolbar = function($el) {
    var block = this;
    var viewFn = require('./blockbase-toolbar.html');
    var params = _.extend({}, block.config, dict); // Copies many keys.
    var viewStr = viewFn(params); // Could be done on serverside too
    var $toolbar = $(viewStr);
    $toolbar.appendTo($el);
    // Save the reference to block
    block.$toolbar = $el;
    block.$minibar = $el.find('#' + block.id + '-minibar');
  };
}

if (__CONTROL__) {
  exports.newShowButton = function(block) {
    var buttonStr = '<a class="btn" href="#"></a>';
    var $button = $(buttonStr);
    $button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

    function buttonOff() {
      $button.removeClass('btn-info');
      $button.css('border', '1px solid #39b3d7');
      $button.html('<span class="text-info"><span class="glyphicon glyphicon-eye-close"></span> <span>' + dict.SHOW_BTN + '</span></span>');
      $button.attr('title', dict.SHOW_HOVER);
      $button.tooltip('fixTitle');
      $button.tooltip('hide');
    }
    function buttonOn() {
      $button.addClass('btn-info');
      $button.css('border', '');
      $button.html('<span class="glyphicon glyphicon-eye-open"></span> ' + dict.HIDE_BTN);
      $button.attr('title', dict.HIDE_HOVER);
      $button.tooltip('fixTitle');
      $button.tooltip('hide');
    }

    $button.on('click', function(ev) {
      if (block.config.visible) {
        buttonOff();
        rpc('core.$showBlock', block.id, false);
      } else {
        buttonOn();
        rpc('core.$showBlock', block.id, true);
      }
      return false;
    });

    block.on('change:visible', function(shown) {
      if (shown) {
        buttonOn();
      } else {
        buttonOff();
      }
    });

    return $button;
  };
}

if (__CONTROL__) {
  exports.newSelectButton = function(block) {

    var buttonStr = '<a class="btn" href="#"></a>';
    var $button = $(buttonStr);
    $button.tooltip({placement: 'auto top', delay: {show: 700, hide: 0}, container: 'body'});

    function buttonOff() {
      $button.removeClass('btn-warning');
      $button.css('border', '1px solid #8a6d3b');
      $button.html('<span class="text-warning"><span class="glyphicon glyphicon-eye-close"></span> <span>' + dict.SELECT_BTN + '</span></span>');
      $button.attr('title', dict.SELECT_HOVER);
      $button.tooltip('fixTitle');
      $button.tooltip('hide');
    }
    function buttonOn() {
      $button.addClass('btn-warning');
      $button.css('border', '');
      $button.html('<span class="glyphicon glyphicon-eye-open"></span> ' + dict.SELECT_BTN);
      $button.attr('title', dict.UNSELECT_HOVER);
      $button.tooltip('fixTitle');
      $button.tooltip('hide');
    }

    $button.on('click', function(ev) {
      if (block.config.selected) {
        buttonOff();
        rpc('core.$selectBlock', block.id, false);
      } else {
        buttonOn();
        rpc('core.$selectBlock', block.id, true);
      }
      return false;
    });

    block.on('change:selected', function(selected) {
      if (selected) {
        buttonOn();
      } else {
        buttonOff();
      }
    });

    return $button;
  };
}

if (__CONTROL__) {
  exports.newExportButton = function(block) {
    var buttonStr = '<a tabindex="-1" href="#" title="' +
        dict.EXPORT_HOVER +
        '"><span class="glyphicon glyphicon-share"></span> ' +
        dict.EXPORT_BTN +
        '</a>';
    var $button = $(buttonStr);
    $button.on('click', function(ev) {
      rpc(block.id + '.$export', function(err, data) {
        if (!data) return;
        window.open('data:text/plain;charset=utf-8,' +
          encodeURIComponent( // Escape for URL formatting
            data
          )
        );
      });
      return false;
    });

    return $button;
  };
}

if (__CONTROL__) {
  exports.newDuplicateButton = function(block) {
    var buttonStr = '<a tabindex="-1" href="#" title="' +
        dict.DUPLICATE_HOVER +
        '"><span class="glyphicon glyphicon-circle-arrow-up"></span> ' +
        dict.DUPLICATE_BTN +
        '</a>';
    var $button = $(buttonStr);
    $button.on('click', function(ev) {
      rpc('core.$duplicateBlock', block.id, function(err) {
      });
      return false;
    });
    return $button;
  };
}

if (__CONTROL__) {
  exports.newClearButton = function(block) {
    var buttonStr = '<a tabindex="-1" href="#" title="' +
        dict.CLEAR_HOVER +
        '"><span class="glyphicon glyphicon-remove-circle"></span> ' +
        dict.CLEAR_BTN +
        '</a>';
    var $button = $(buttonStr);

    $button.popover({
        html: true,
        placement: 'bottom',
        selector: true,
        content: dict.CLEAR_NOTE + ' <a href="#" class="btn btn-xs btn-danger">' + dict.CLEAR_BTN + '</a>',
        trigger: 'click'
    }).popover('hide'); // Create hidden tip already

    $button.on('click', function(ev) {
      return false;
    });

    var timeout;
    var $tip = $button.data('bs.popover').$tip;
    $tip.hide(); // Bootstrap bug workaround.
    $tip.on('click', function(event) {
      // Prevent menu from closing
      event.stopPropagation();
    });
    $tip.on('mouseenter focusin', function() {
      clearTimeout(timeout);
    });
    $tip.on('mouseleave focusout', function() {
      $button.popover('hide');
    });
    $button.on('show.bs.popover', function() {
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        $button.popover('hide');
      }, 3000);
    });
    $button.on('hide.bs.popover', function() {
      clearTimeout(timeout);
    });
    $button.on('hidden.bs.popover', function() {
      $tip.hide(); // Bootstrap bug workaroud.
    });
    $tip.on('click', 'a', function() {
      rpc(block.id + '.$clear');
      $button.popover('hide');
      return false;
    });

    return $button;
  };
}

if (__CONTROL__) {
  exports.newDeleteButton = function(block) {
    var buttonStr = '<a tabindex="-1" href="#" title="' +
        dict.DELETE_HOVER +
        '"><span class="glyphicon glyphicon-trash"></span> ' +
        dict.DELETE_BTN +
        '</a>';
    var $button = $(buttonStr);

    $button.popover({
        html: true,
        placement: 'bottom',
        selector: true,
        content: dict.DELETE_NOTE + ' <a href="#" class="btn btn-xs btn-danger">' + dict.DELETE_BTN + '</a>',
        trigger: 'click',
    }).popover('hide'); // Create hidden tip already

    $button.on('click', function(ev) {
      return false;
    });

    var timeout;
    var $tip = $button.data('bs.popover').$tip;
    $tip.hide(); // Bootstrap bug workaround.
    $tip.on('click', function(event) {
      // Prevent menu from closing
      event.stopPropagation();
    });
    $tip.on('mouseenter focusin', function() {
      clearTimeout(timeout);
    });
    $tip.on('mouseleave focusout', function() {
      $button.popover('hide');
    });
    $button.on('show.bs.popover', function() {
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        $button.popover('hide');
      }, 3000);
    });
    $button.on('hide.bs.popover', function() {
      clearTimeout(timeout);
    });
    $button.on('hidden.bs.popover', function() {
      $tip.hide(); // Bootstrap bug workaround.
    });
    $tip.on('click', 'a', function() {
      rpc('core.$deleteBlock', block.id);
      $button.popover('hide');
      return false;
    });

    return $button;
  };
}

if (__CONTROL__) {
  exports.newBlockGroupButton = function(block) {
    var buttonStr = '<a tabindex="-1" href="#" title="' +
        dict.BLOCKGROUP_HOVER +
        '"><span class="glyphicon glyphicon-link"></span> ' +
        dict.BLOCKGROUP_BTN +
        '</a>';
    var $button = $(buttonStr);

    $button.popover({
        html: true,
        placement: 'bottom',
        selector: true,
        content: dict.BLOCKGROUP_NOTE + ' <input class="form-control input-sm" type="text" placeholder="' + dict.BLOCKGROUP_BTN + '">',
        trigger: 'click'
    }).popover('hide'); // Create hidden tip already

    $button.on('click', function(ev) {
      return false;
    });

    var timeout;
    var $tip = $button.data('bs.popover').$tip;
    $tip.hide(); // Bootstrap bug workaround.
    block.on('update:blockGroup', function(blockGroup) {
      $tip.find('input').val(blockGroup);
    });

    $tip.on('click', function(event) {
      // Prevent menu from closing
      event.stopPropagation();
    });
    $tip.on('mouseenter focusin', function() {
      clearTimeout(timeout);
    });
    $tip.on('mouseleave focusout', function() {
      $button.popover('hide');
    });
    $button.on('show.bs.popover', function() {
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        $button.popover('hide');
      }, 3000);
    });
    $button.on('hide.bs.popover', function() {
      clearTimeout(timeout);
    });
    $button.on('hidden.bs.popover', function() {
      $tip.hide(); // Bootstrap bug workaround.
    });
    $tip.on('keydown', 'input', function(ev) {
      if (ev.which == 13) {
        // Return, save
        rpc(block.id + '.$blockGroup', this.value);
        $button.popover('hide');
        return false;
      }
    });

    return $button;
  };
}


if (__CONTROL__) {
  exports.newCollapseButton = function(block) {
    var buttonStr = '<a class="btn btn-link" href="#"></a>';
    var $button = $(buttonStr);
    var $contents = block.$el.find('#' + block.id + '-contents');

    // Block collapse is per user-agent, not shared among controllers, for example.
    var collapsed = !!sessionStorage.getItem(block.id + '-collapsed');
    if (collapsed) {
      setAsExpandBtn()
      $contents.hide();
    } else {
      setAsCollapseBtn();
    }

    function setAsCollapseBtn() {
      $button.html('<span class="glyphicon glyphicon-minus"></span>');
      $button.attr('title', dict.COLLAPSE_HOVER);
    }

    function setAsExpandBtn() {
      $button.html('<span class="glyphicon glyphicon-plus"></span>');
      $button.attr('title', dict.EXPAND_HOVER);
    }

    $button.on('click', function(ev) {
      if (collapsed) {
        setAsCollapseBtn();
        $contents.finish().slideDown();
        collapsed = false;
      } else {
        setAsExpandBtn();
        $contents.finish().slideUp();
        collapsed = true;
      }
      // Save to local user-agent storage only.
      sessionStorage.setItem(block.id + '-collapsed', collapsed);

      return false;
    });

    return $button;
  };
}

if (__CONTROL__) {
  exports.newLiftButton = function(block) {
    var buttonStr = '<a class="btn btn-link" href="#" title="' + dict.LIFT_HOVER + '">' +
    '<span class="glyphicon glyphicon-arrow-up"></span>' +
    '</a>';
    var $button = $(buttonStr);
    $button.on('click', function(ev) {
      rpc('core.$liftBlock', block.id);
      setTimeout(scrollToView, 500);
      return false;
    });

    function scrollToView() {
      var $window = $(window);
      var scrollTop = $window.scrollTop();
      var blockTop = block.$el.offset().top;
      if (blockTop < scrollTop) {
        var windowHeight = $window.height();
        var targetTop = blockTop - 10;
        if (targetTop < 0) targetTop = 0;
        $('html, body').stop(true).animate({scrollTop: targetTop}, 400);
      }
    }

    return $button;
  };
  exports.newLowerButton = function(block) {
    var buttonStr = '<a class="btn btn-link" href="#" title="' + dict.LOWER_HOVER + '">' +
    '<span class="glyphicon glyphicon-arrow-down"></span>' +
    '</a>';
    var $button = $(buttonStr);
    $button.on('click', function(ev) {
      // Or parametrize liftBlock/moveBlock
      rpc('core.$lowerBlock', block.id);
      setTimeout(scrollToView, 500);
      return false;
    });

    function scrollToView() {
      var $window = $(window);
      var windowHeight = $window.height();
      var scrollTop = $window.scrollTop();
      var blockTop = block.$el.offset().top;
      if (scrollTop + windowHeight < blockTop) {
        var targetTop = blockTop - (windowHeight*0.75)|0;
        if (targetTop < 0) targetTop = 0;
        $('html, body').stop(true).animate({scrollTop: targetTop}, 400);
      }
    }

    return $button;
  };
}
