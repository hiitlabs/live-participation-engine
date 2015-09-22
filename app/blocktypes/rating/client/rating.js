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

var dict = require('./lang');

var siteConfig = require('/core').config;

exports = module.exports = initRating;

function initRating(block) {
  initToggleRatingButtons(block);
  initRatingBasics(block);
  initToggleLikertScale(block);
  if (siteConfig.SHOWRATINGSTATS) {
    initToggleStdDevOnScreen(block);
  }
  initMsgStats(block);
  //initShowPercentages(block);
}

function initRatingBasics(block) {

  block.$el.on('click', 'a.__BLOCKTYPE__-rate', function(ev) {
    // TODO properly, state, tagging etc
    var $btn = $(this);

    if ($btn.prop('disabled')) return false;
    if ($btn.hasClass('disabled')) return false;

    var msgId = $btn.attr('data-id');
    // TODO toggle tag instead
    block.rpc('$givePoint', msgId);

    $btn.prop('disabled', true).addClass('disabled text-success').attr('title', '').text(dict.GIVE_VOTE_ON);
    $btn.parent().css('font-weight', '800');

    return false;
  });

  block.$el.on('click', 'a.__BLOCKTYPE__-likert', function(ev) {
    // TODO properly, state, tagging etc
    var $btn = $(this);

    if ($btn.prop('disabled')) return false;
    if ($btn.hasClass('disabled')) return false;

    var msgId = $btn.attr('data-id');
    var points = $btn.attr('data-points');
    // TODO toggle tag instead
    block.rpc('$givePoint', msgId, points);

    $btn.parent().find('a.__BLOCKTYPE__-likert').prop('disabled', true).addClass('disabled text-muted');
    $btn.addClass('text-success').attr('title', '').css('font-weight', '800');

    return false;
  });

  if (__SCREEN__) {
    // Not a div, but still
    //var $rankingDiv = this.$el.find('#' + this.id + '-polling');

    var blockId = block.id;
    var table = block.$el.find('#' + block.id + '-__BLOCKTYPE__');

    var render = function() {
        var TOP_N = 50; // Changed from 10
        table.empty();

        for (var i = 0; i < TOP_N; i++) {
          var tr = $('<tr class="__BLOCKTYPE__-option-row">');

          var html = "";
          html += '<td class="__BLOCKTYPE__-option">';
          html += '<div class="bar-outer">';
          //html += '<div class="bar-inner">' + options[i] + '</div>';
          html += '<div id="' + blockId + '-msg-' + i + '" class="bar-inner"></div>';
          html += '<div id="' + blockId + '-result-' + i + '" class="__BLOCKTYPE__-result-bar"></div>';
          html += '</div>';
          html += '</td>';
          html += '<td id="' + blockId + '-result-' + i + '-count" class="__BLOCKTYPE__-result-count"></td>';

          tr.append($(html));
          table.append(tr);
        }

        //var totalRow = $('<tr>');
        //totalRow.append($('<td id="' + blockId + '-result-' + i + '-totaltext" style="text-align:right;" class="__BLOCKTYPE__-option"></td>'));
        //totalRow.append($('<td id="' + blockId + '-result-' + i + '-total" class="__BLOCKTYPE__-result-total"></td>'));
        //table.append(totalRow);
    };
    render();
  }

  block.on('change:results', function(results) {
    if (!results) results = [];

    if (__SCREEN__) {

      var blockId = this.id;

      var update = function(toplist) {
        if (!toplist) return;

        var TOP_N = 50; // Changed from 10

        var total = 0;
        var max = 1; // avoid division by zero
        var barWidth;
        for (var i = 0; i < toplist.length; i++) {
          total += toplist[i].points || 0;
          if (toplist[i].points > max) max = toplist[i].points;
        }
        for (var j = 0; j < TOP_N; j++) {
          var currentText = toplist[j] && toplist[j].text || '';
          var currentPoints = toplist[j] && toplist[j].points || 0;
          // TODO speed up these selectors
          block.$el.find('#' + blockId + '-msg-' + j).text(currentText);
          barWidth = Math.round(currentPoints / max * (100 - 50 / max));
          block.$el.find('#' + blockId + '-result-' + j).css('width', barWidth + '%');
          if (siteConfig.SHOWRATINGSTATS && block.config.showStddevOnScreen && block.config.likertScale && toplist[j]) {
            block.$el.find('#' + blockId + '-result-' + j + '-count').html(
              toplist[j].points.toFixed(1) + '<small class="text-muted">±' + toplist[j].stddev.toFixed(1) + '&nbsp;(' + toplist[j].N + ')</small>' || ''
            );
          } else {
            block.$el.find('#' + blockId + '-result-' + j + '-count').text(currentPoints || '');
          }
          //block.$el.find('#' + blockId + '-result-' + j + '-totaltext').text('Total');
          //block.$el.find('#' + blockId + '-result-' + j + '-total').text(total);
        }
      };

      update(results);
    }

    if (__CONTROL__ || __STAGE__) {

      // TODO graphical bars

      var $el = this.$el.find('#' + this.id + '-results');

      $el.html('<h5>' + dict.RATING_RESULTS + '</h5> <ul class="list-unstyled"> ' + results.map(function(result) {
        //if (!result.points) return '';
        if (siteConfig.SHOWRATINGSTATS && block.config.likertScale) {
          return '<li><strong>' + result.points.toFixed(1) + '±' + result.stddev.toFixed(1) + ' (N=' + result.N + ')</strong> ' + _.escape('' + result.text) + '</li>'
        } else {
          return '<li><strong>(' + result.points + ')</strong> ' + _.escape('' + result.text) + '</li>'
        }
      }).join('') + '</ul>');

    }
    if (__WEB__) {
      // What results to show on web?
    }

  });

  block.emit('change:results', block.config.results);
}

function initToggleRatingButtons(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.RATINGBUTTONS_BTN_OFF + '</span>');
        $button.attr('title', dict.RATINGBUTTONS_BTN_OFF_HOVER);
      }

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.RATINGBUTTONS_BTN_ON + '</span>');
        $button.attr('title', dict.RATINGBUTTONS_BTN_ON_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.ratingButtons) {
          buttonOff();
          block.rpc('$ratingButtons', false);
        } else {
          buttonOn();
          block.rpc('$ratingButtons', true);
        }
        return false;
      });
      block.on('change:ratingButtons', function(shown) {
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
    block.on('change:ratingButtons', function(shown) {
      // TODO properly
      if (shown) {
        //$('#' + this.id).find('.textblock').hide();
        // TODO properly
        if (block.config.likertScale) {
          this.$el.find('.__BLOCKTYPE__-rate').hide();
          this.$el.find('.__BLOCKTYPE__-likert').show();
        } else {
          this.$el.find('.__BLOCKTYPE__-likert').hide();
          this.$el.find('.__BLOCKTYPE__-rate').show();
        }
      } else {
        this.$el.find('.__BLOCKTYPE__-likert').hide();
        this.$el.find('.__BLOCKTYPE__-rate').hide();
      }
    });

    block.emit('change:ratingButtons', block.config.ratingButtons);
  }
}

function initToggleLikertScale(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.LIKERTSCALE_BTN_OFF + '</span>');
        $button.attr('title', dict.LIKERTSCALE_BTN_OFF_HOVER);
      }

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.LIKERTSCALE_BTN_ON + '</span>');
        $button.attr('title', dict.LIKERTSCALE_BTN_ON_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.likertScale) {
          buttonOff();
          block.rpc('$likertScale', false);
        } else {
          buttonOn();
          block.rpc('$likertScale', true);
        }
        return false;
      });
      block.on('change:likertScale', function(shown) {
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

  if (__WEB__ || __CONTROL__ || __STAGE__ || __SCREEN__) {

    // Listen for disable events
    block.on('change:likertScale', function(likert) {
      // TODO properly
      // Possible race conditition in init, depending on
      // if likertScale or ratingButtons is available yet
      if (likert) {
        //$('#' + this.id).find('.textblock').hide();
        //this.$el.find('.__BLOCKTYPE__-rate').hide();
        //this.$el.find('.__BLOCKTYPE__-likert').show();
      } else {
        //this.$el.find('.__BLOCKTYPE__-likert').hide();
        //this.$el.find('.__BLOCKTYPE__-rate').show();
      }
      // Render results on screen again
      // Defer to next tick due to race condition on config parsing
      setTimeout(function() {
        block.emit('change:results', block.config.results);
      }, 0);

    });

    block.emit('change:likertScale', block.config.likertScale);
  }
}

function initToggleStdDevOnScreen(block) {
  if (__CONTROL__ || __STAGE__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOff() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.STDDEVONSCREEN_BTN_OFF + '</span>');
        $button.attr('title', dict.STDDEVONSCREEN_BTN_OFF_HOVER);
      }

      function buttonOn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-check"></span> ' + dict.STDDEVONSCREEN_BTN_ON + '</span>');
        $button.attr('title', dict.STDDEVONSCREEN_BTN_ON_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.showStddevOnScreen) {
          buttonOff();
          block.rpc('$showStddevOnScreen', false);
        } else {
          buttonOn();
          block.rpc('$showStddevOnScreen', true);
        }
        return false;
      });
      block.on('change:showStddevOnScreen', function(shown) {
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

  if (__CONTROL__ || __STAGE__ || __SCREEN__) {

    // Listen for disable events
    block.on('change:showStddevOnScreen', function(showStddevOnScreen) {
      // TODO properly
      // Possible race conditition in init
      if (showStddevOnScreen) {
        //$('#' + this.id).find('.textblock').hide();
        //this.$el.find('.__BLOCKTYPE__-rate').hide();
        //this.$el.find('.__BLOCKTYPE__-likert').show();
      } else {
        //this.$el.find('.__BLOCKTYPE__-likert').hide();
        //this.$el.find('.__BLOCKTYPE__-rate').show();
      }
      // Render results on screen again
      // Defer to next tick due to race condition on config parsing
      setTimeout(function() {
        block.emit('change:results', block.config.results);
      }, 0);

    });

    block.emit('change:showStddevOnScreen', block.config.showStddevOnScreen);
  }
}

function initShowPercentages(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-check"></span> ' + dict.PERCENTAGES_BTN_ON + '</span>');
        $button.attr('title', dict.PERCENTAGES_BTN_ON_HOVER);
      }

      function buttonOff() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.PERCENTAGES_BTN_OFF + '</span>');
        $button.attr('title', dict.PERCENTAGES_BTN_OFF_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.showPercentages) {
          buttonOff();
          block.rpc('$showPercentages', false);
        } else {
          buttonOn();
          block.rpc('$showPercentages', true);
        }
        return false;
      });

      block.on('change:showPercentages', function(showPercentages) {
        if (showPercentages) {
          buttonOn();
        } else {
          buttonOff();
        }
      });

      return $button;
    }

    $newButton().appendTo(block.$minibar);
  }

  block.emit('change:showPercentages', block.config.showPercentages, true);
}


function initMsgStats(block) {
  if (__WEB__ || __SCREEN__) return; // Not yet enabled on web

  // Experiment with defining function on the block instance directly (creates closures
  // and consumes more memory, and won't be optimized by the compiler so easily, but ok)

  block.$msgStats = function(msgStats) {
    if (!msgStats) return;

    // TODO change these to build flags
    if (siteConfig.SHOWRATINGSTATS) {
      // Keep in sync with the initial render in msg.html
      // There will be hundreds of calls in total, but not so many per frame.
      // More concerned about socket bandwith and latency spikes (one click per each participant
      // broadcasts to all control and stage views), so TODO batching.
      // Will query DOM each time, but getElementById is quite fast for now
      //$('#' + msgStats.msgId + '-stats').text('' + msgStats.N + ': ' + msgStats.points + '±' + msgStats.stddev);

      // NOTE: writes directly to DOM, so when likertScale setting is changed, wrong
      // format is still shown (just reload)
      if (block.config.likertScale) {
        // Guarding for toFixed for now
        // NOTE that toFixed rounding differs between browsers
        if (typeof msgStats.points !== 'number' ||
            typeof msgStats.stddev !== 'number') {
          return;
        }
        $('#' + msgStats.msgId + '-stats').text('' +
          msgStats.points.toFixed(1) + '±' + msgStats.stddev.toFixed(1) + ' (N=' + msgStats.N + ')'
        );
      } else {
        $('#' + msgStats.msgId + '-stats').text('(' + msgStats.points + ')');
      }
    }
  };

}
