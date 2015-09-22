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

exports = module.exports = initPoll;

function initPoll(block) {
  initPollBasics(block);
  initDisable(block);
  if (siteConfig.MEANVAR) {
    if (block.config && block.config.firstOptionValue != null) {
      initMeanVar(block);
    }
  }
  initAllowMultiple(block);
  initShowPercentages(block);
}

function initPollBasics(block) {

  block.on('data', function(data) {
  });

  // Reset block is here for now
  block.$clear = function() {
    block.emit('change:options', block.config.options);
  };

  block.$el.on('click', 'a.__BLOCKTYPE__-optionHighlight', function(ev) {
    var $btn = $(this);
    var optionId = $btn.attr('data-id');
    if (__CONTROL__ || __STAGE__) {
      block.rpc('$highlightOption', optionId, function(err) {
        // rerender
        block.emit('change:options', block.config.options);
      });
    }
    return false;
  });

  block.$el.on('click', 'button.__BLOCKTYPE__-vote', function(ev) {
    // TODO properly, state, tagging etc
    var $btn = $(this);

    var optionId = $btn.attr('data-id');

    block.rpc('$vote', optionId, function(err, voteData) {
      if (!voteData) {
        return;
      }
      if (!voteData.ownVotes) {
        return;
      }
      // Set and rerender
      block.config.ownVotes = voteData.ownVotes;
      block.emit('change:options', block.config.options);

    });

    //$btn.addClass('btn-primary');
    $btn.toggleClass('btn-primary');
    $btn.toggleClass('btn-default');

    return false;
  });

  if (__SCREEN__) {
    // Not a div, but still
    //var $rankingDiv = this.$el.find('#' + this.id + '-polling');

    var blockId = block.id;
    var table = block.$el.find('#' + block.id + '-__BLOCKTYPE__');

    var render = function(options) {

        table.empty();

        for (var i = 0; i < options.length; i++) {
          var tr = $('<tr class="__BLOCKTYPE__-option-row"' + (block.config.highlightedOption === i ? ' style="background-color:rgba(0,255,127,0.2);"' : '') + '>');
          var html = "";
          html += '<td class="__BLOCKTYPE__-option">';
          html += '<div class="bar-outer">';
          html += '<div class="bar-inner" ' +
            (block.config.highlightedOption === i ? 'style="color:#000"' : '') + //#007a7c
            '>' + options[i] + '</div>';
          html += '<div id="' + blockId + '-result-' + i + '" class="__BLOCKTYPE__-result-bar" ' +
            (block.config.highlightedOption === i ? 'style="background-color:#00c57a"' : '') +
            '></div>';
          html += '</div>';
          html += '</td>';
          html += '<td id="' + blockId + '-result-' + i + '-count" class="__BLOCKTYPE__-result-count"></td>';

          tr.append($(html));
          table.append(tr);
        }

        var totalRow = $('<tr id="' + blockId + '-meanvar">');
        totalRow.append($('<td id="' + blockId + '-totaltext" style="text-align:right;" class="__BLOCKTYPE__-option"></td>'));
        totalRow.append($('<td id="' + blockId + '-total" class="__BLOCKTYPE__-result-total"></td>'));

        // totalRow.append($('<td id="' + blockId + '-meantext" style="text-align:right;" class="__BLOCKTYPE__-option"></td>'));
        // totalRow.append($('<td id="' + blockId + '-mean" class="__BLOCKTYPE__-result-total"></td>'));
        table.append(totalRow);

        //showBlockInContainer(blockEl, getMaxiBlockContainer());
    };

  }

  block.on('change:options', function(options) {
    if (!options) options = [];
    // Redraw controls
    if (__WEB__ || __CONTROL__ || __STAGE__) {
      var $el = this.$el.find('#' + this.id + '-form');

      var ownVote = block.config.ownVotes ? block.config.ownVotes.vote : null;
      var ownVotes = block.config.ownVotes && block.config.ownVotes.votes ? block.config.ownVotes.votes : [];
      if (block.config.allowMultiple) {
        ownVote = null;
      } else {
        ownVotes = [];
      }

      var buttons = '' +
        options.map(function(option, i) {
          return '<button type="button" style="white-space:normal;" class="btn ' +
            ((ownVote === i || ownVotes.indexOf(i) !== -1) ? 'btn-primary ' : 'btn-default ') +
            //(block.config.highlightedOption === i ? 'btn-warning ' : ' ') +
            ' btn-lg btn-block __BLOCKTYPE__-vote" data-id="' + i + '">' + _.escape(option) + '</button>'
        }).join('') +
        '';

      $el.html(buttons);

    }
    if (__SCREEN__) {

      render(options);

    }
  });
  block.emit('change:options', block.config.options);

  block.on('change:highlightedOption', function(optionId) {
    // rerender
    block.config.highlightedOption = optionId;
    block.emit('change:options', block.config.options);
    block.emit('change:results', block.config.results);
  });

  block.on('change:showPercentages', function(showPercentages) {
    // rerender
    block.config.showPercentages = showPercentages;
    block.emit('change:options', block.config.options);
    block.emit('change:results', block.config.results);
  });

  block.on('change:results', function(results) {
    if (!results) results = [];

    if (__SCREEN__) {

      var blockId = this.id;

      // TODO move this function out
      var update = function(votes) {
        if (!votes) return;
        //this.data = votes;
        //var blockId = this.id;
        var total = 0;
        var max = 1; // avoid division by zero
        var barWidth;
        for (var i = 0; i < votes.length; i++) {
          total += votes[i];
          if (votes[i] > max) max = votes[i];
        }
        for (var j = 0; j < votes.length; j++) {
          barWidth = Math.round(votes[j] / max * (100 - 50 / max));
          // TODO cache elements when creating them, instead of querying every time
          block.$el.find('#' + blockId + '-result-' + j).css('width', barWidth + '%');
          if (block.config.showPercentages) {
            block.$el.find('#' + blockId + '-result-' + j + '-count').html(
              Math.round(100 * votes[j] / total) + '%'
            );
          } else {
            block.$el.find('#' + blockId + '-result-' + j + '-count').text(votes[j]);
          }
        }
        //block.$el.find('#' + blockId + '-totaltext').text('Total');
        block.$el.find('#' + blockId + '-total').text(total);

        var pollMean = block.config.resultMeta && block.config.resultMeta.pollMean;
        var pollStdDev = block.config.resultMeta && block.config.resultMeta.pollStdDev;

        if (siteConfig.MEANVAR) {
          if (pollMean != null) {
            if (pollStdDev) {
              block.$el.find('#' + blockId + '-meantext').text(pollMean + ' ± ' + pollStdDev);
            } else {
              block.$el.find('#' + blockId + '-meantext').text(pollMean);
            }
          }
          //block.$el.find('#' + blockId + '-meantext').text('Mean');
          //block.$el.find('#' + blockId + '-mean').text(pollMean + ' ± ' + pollStdDev);
        }

        return true;
      };

      update(results.map(function(result) {
        return result.points;
      }));
    }

    if (__CONTROL__ || __STAGE__) {

      // TODO show graphics on web too
      var pollOptions = block.config.options || [];

      var pollMean = block.config.resultMeta && block.config.resultMeta.pollMean;
      var pollStdDev = block.config.resultMeta && block.config.resultMeta.pollStdDev;

      var $el = this.$el.find('#' + this.id + '-results');

      var pollStr = '<h5>' + dict.POLL_RESULTS + '</h5> <ul class="list-unstyled"> ' + results.map(function(result, i) {
        //return '<li><strong>(' + result.points + ')</strong> ' + _.escape('' + pollOptions[result.id]) + '</li>'
        return '<li>' +
          '<a href="#" class="__BLOCKTYPE__-optionHighlight btn btn-sm text-warning ' +
          (block.config.highlightedOption === i ? 'btn-warning ' : ' ') +
          '" data-id=' + i + '><span class="glyphicon glyphicon-star"> Nosto</span></a>' +
          ' <strong>(' + result.points + ')</strong> ' + _.escape('' + pollOptions[result.id]) + '</li>'
        //result.points;
      }).join('') + '</ul>';

      if (siteConfig.MEANVAR) {
        if (pollMean != null && pollStdDev != null) {
          pollStr += '<p id="' + this.id + '-meanvar_control">Mean ' + pollMean + ' ± ' + pollStdDev + '</p>';
        }
      }

      $el.html(pollStr);

    }
    if (__WEB__) {
      // What to show on web?

    }

  });

  block.emit('change:results', block.config.results);
};

function initDisable(block) {
  if (__CONTROL__) {

    function $newButton() {
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
    }

    $newButton().appendTo(block.$minibar);
  }

  // Listen for disable events
  block.on('change:active', function(enabled, immediate) {
    var $input = this.$el.find('#' + this.id + '-form');
    // TODO properly
    if (!enabled) {
      if (immediate) {
        $input.hide();
      } else {
        $input.finish().animate({opacity: 0}, 200, function() {
          $input.animate({height: 'hide'}, 200);
        });
      }
    } else {
      if (immediate) {
        $input.show();
      } else {
        $input.hide().css({opacity: 0});
        $input.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
          $input.css('opacity', '');
        });
      }
    }
  });

  block.emit('change:active', block.config.active, true);
}

function initMeanVar(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOn() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-check"></span> ' + dict.MEANVAR_BTN_ON + '</span>');
        $button.attr('title', dict.MEANVAR_BTN_ON_HOVER);
      }

      function buttonOff() {
        $button.html('<span class="text-warning"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.MEANVAR_BTN_OFF + '</span>');
        $button.attr('title', dict.MEANVAR_BTN_OFF_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.showMeanVar) {
          buttonOff();
          block.rpc('$showMeanVar', false);
        } else {
          buttonOn();
          block.rpc('$showMeanVar', true);
        }
        return false;
      });

      block.on('change:showMeanVar', function(enabled) {
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
  block.on('change:showMeanVar', function(enabled, immediate) {
    //var $input = this.$el.find('#' + this.id + '-form');
    var $input = this.$el.find('#' + this.id + '-meanvar');
    // TODO properly
    if (!enabled) {
      if (immediate) {
        $input.hide();
      } else {
        $input.finish().animate({opacity: 0}, 200, function() {
          $input.animate({height: 'hide'}, 200);
        });
      }
    } else {
      if (immediate) {
        $input.show();
      } else {
        $input.hide().css({opacity: 0});
        $input.finish().animate({height: 'show'}, 200).animate({opacity: 1}, 200, function() {
          $input.css('opacity', '');
        });
      }
    }
  });

  block.emit('change:showMeanVar', block.config.showMeanVar, true);
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

function initAllowMultiple(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.MULTIPLE_BTN_ON + '</span>');
        $button.attr('title', dict.MULTIPLE_BTN_ON_HOVER);
      }

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.MULTIPLE_BTN_OFF + '</span>');
        $button.attr('title', dict.MULTIPLE_BTN_OFF_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.allowMultiple) {
          buttonOff();
          block.rpc('$allowMultiple', false);
        } else {
          buttonOn();
          block.rpc('$allowMultiple', true);
        }
        return false;
      });

      block.on('change:allowMultiple', function(allowMultiple) {
        if (allowMultiple) {
          buttonOn();
        } else {
          buttonOff();
        }
      });

      return $button;
    }

    $newButton().appendTo(block.$minibar);
  }

  block.emit('change:allowMultiple', block.config.allowMultiple, true);
}

