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

  initRealtime(block);
  renderScatter(block);
};

function initPollBasics(block) {

  // Reset block is here for now
  block.$clear = function() {
    block.emit('change:options', block.config.options);
  }

  block.$el.on('click', 'button.__BLOCKTYPE__-vote', function(ev) {
    // TODO properly, state, tagging etc
    var $btn = $(this);

    if ($btn.prop('disabled')) return false;

    var optionId = $btn.attr('data-id');
    // TODO toggle tag instead
    //self.rpc('$givePoint', msgId);
    block.rpc('$vote', optionId);

    //$btn.animate({opacity: 0});
    block.$el.find('button').prop('disabled', true).addClass('btn-default').removeClass('btn-primary');

    $btn.addClass('btn-primary');

    return false;
  });

  if (__SCREEN__) {
    // Not a div, but still
    //var $rankingDiv = this.$el.find('#' + this.id + '-polling');

    var blockId = block.id;
    var table = block.$el.find('#' + block.id + '-__BLOCKTYPE__');

    var render = function(options) {

      return;

    };

  }

  block.on('change:options', function(options) {
    if (!options) options = [];
    // Redraw controls
    if (__WEB__ || __CONTROL__ || __STAGE__) {
      var $el = this.$el.find('#' + this.id + '-form');

      // Options here means actual poll options, so this is only triggered once
      // and when clearing the block, which is ok

      // If there is something already
      $el.empty();

      var $quest1 = $('<p></p>');
      if (options.length === 2) {
        var $quest1Text = $('<span></span>').text(options[0] + ' (0-100): ');
      } else {
        var $quest1Text = $('<span>Opetuksen suunnitteluvaiheessa käytän usein opetusta ja oppimista käsittelevää kirjallisuutta (0-100): </span>');
      }
      $quest1Text.appendTo($quest1);
      var $quest1Val = $('<span style="font-weight:bold"></span>');
      $quest1Val.appendTo($quest1);
      $quest1.appendTo($el);
      //var $slider1 = $('<input type="range" min="10" max="1000" step="10" value="300">');
      var $slider1 = $('<div tabindex="0"></div>');
      $slider1.appendTo($el);
      //$slider1 = $el.find('input');
      $slider1.noUiSlider({
        //start: [20, 80],
        start: 50,
        //connect: false,
        //orientation: 'vertical',
        behaviour: 'snap',
        step: 1,
        range: {
          'min': 0,
          'max': 100
        }
      });
      $('<div><span>0</span><span class="pull-right">100</span></div>').appendTo($el);
      $slider1.on('slide', function(ev) {
        var value = $(this).val();
        //var value = $slider1.val(); //$(this).val();
        //console.log(value)
        $quest1Val.text(+value);
      });
      //$slider1.trigger('slide');

      var $space1 = $('<p></p>');
      $space1.appendTo($el);

      var $quest2 = $('<p></p>');
      if (options.length === 2) {
        var $quest2Text = $('<span></span>').text(options[1] + ' (0-100): ');
      } else {
        var $quest2Text = $('<span>Keskustelen mielelläni opettajatovereitteni kanssa opetukseen ja oppimiseen liittyvistä asioista (0-100): </span>');
      }
      $quest2Text.appendTo($quest2);
      var $quest2Val = $('<span style="font-weight:bold"></span>');
      $quest2Val.appendTo($quest2);
      $quest2.appendTo($el);
      //var $slider2 = $('<input type="range" min="10" max="1000" step="10" value="300">');
      var $slider2 = $('<div tabindex="0"></div>');
      $slider2.appendTo($el);
      //$slider2 = $el.find('input');
      $slider2.noUiSlider({
        //start: [20, 80],
        start: 50,
        //connect: false,
        //orientation: 'vertical',
        behaviour: 'snap',
        step: 1,
        range: {
          'min': 0,
          'max': 100
        }
      });
      $('<div><span>0</span><span class="pull-right">100</span></div>').appendTo($el);
      $slider2.on('slide', function(ev) {
        var value = $(this).val();
        //var value = $slider2.val(); //$(this).val();
        //console.log(value)
        $quest2Val.text(+value);
      });
      //$slider2.trigger('slide');

      var $space2 = $('<p></p>');
      $space2.appendTo($el);


      // Next sliders are only in the special default case
      if (options.length !== 2) {

        var $quest3 = $('<p></p>');
        var $quest3Text = $('<span>Opetuksessani käytän mielelläni uusia teknisiä laitteita ja palveluja (0-100): </span>');
        $quest3Text.appendTo($quest3);
        var $quest3Val = $('<span style="font-weight:bold"></span>');
        $quest3Val.appendTo($quest3);
        $quest3.appendTo($el);
        //var $slider3 = $('<input type="range" min="10" max="1000" step="10" value="300">');
        var $slider3 = $('<div tabindex="0"></div>');
        $slider3.appendTo($el);
        //$slider3 = $el.find('input');
        $slider3.noUiSlider({
          //start: [20, 80],
          start: 50,
          //connect: false,
          //orientation: 'vertical',
          behaviour: 'snap',
          step: 1,
          range: {
            'min': 0,
            'max': 100
          }
        });
        $('<div><span>0</span><span class="pull-right">100</span></div>').appendTo($el);
        $slider3.on('slide', function(ev) {
          var value = $(this).val();
          //var value = $slider3.val(); //$(this).val();
          //console.log(value)
          $quest3Val.text(+value);
        });
        //$slider3.trigger('slide');

        var $space3 = $('<p></p>');
        $space3.appendTo($el);

        var $quest4 = $('<p></p>');
        var $quest4Text = $('<span>Tieto- ja viestintätekniikka tukee ja innostaa oppimaan (0-100): </span>');
        $quest4Text.appendTo($quest4);
        var $quest4Val = $('<span style="font-weight:bold"></span>');
        $quest4Val.appendTo($quest4);
        $quest4.appendTo($el);
        //var $slider1 = $('<input type="range" min="10" max="1000" step="10" value="300">');
        var $slider4 = $('<div tabindex="0"></div>');
        $slider4.appendTo($el);
        //$slider4 = $el.find('input');
        $slider4.noUiSlider({
          //start: [20, 80],
          start: 50,
          //connect: false,
          //orientation: 'vertical',
          behaviour: 'snap',
          step: 1,
          range: {
            'min': 0,
            'max': 100
          }
        });
        $('<div><span>0</span><span class="pull-right">100</span></div>').appendTo($el);
        $slider4.on('slide', function(ev) {
          var value = $(this).val();
          //var value = $slider4.val(); //$(this).val();
          //console.log(value)
          $quest4Val.text(+value);
        });
        //$slider4.trigger('slide');

        var $space4 = $('<p></p>');
        $space4.appendTo($el);

      }


      var $space = $('<p></p>');
      $space.appendTo($el);

      // Throttle until reply received from server or timeout

      // Could also use underscore throttling, but in any case something is
      // needed also for the trailing case, otherwise slider end value may not be sent.
      // However, the trailing call may happen in a different context, where these
      // sliders won't exist anymore, so let's disable it for now

      var sendInProgress = false;
      // var needsTrailingCall = false;
      function sendAnswersSlower() {
        if (sendInProgress) {
          // Called when throttled, so needs a trailing call when capable again
          // needsTrailingCall = true;
          return;
        }
        sendInProgress = true;
        // A long timeout clears the flags if answer go missing.
        var timeoutId = setTimeout(function() {
          sendInProgress = false;
          // sendDone();
        }, 10000);
        if (options.length === 2) {
          block.rpc('$sendAnswers', {
            q1: +$slider1.val(),
            q2: +$slider2.val()
          }, function() {
            sendInProgress = false;
            clearTimeout(timeoutId);
            // sendDone();
          });
        } else {
          block.rpc('$sendAnswers', {
            q1: +$slider1.val(),
            q2: +$slider2.val(),
            q3: +$slider3.val(),
            q4: +$slider4.val()
          }, function() {
            sendInProgress = false;
            clearTimeout(timeoutId);
            // sendDone();
          });

        }
      }
      // function sendDone() {
      //   if (needsTrailingCall) {
      //     needsTrailingCall = false;
      //     sendAnswersSlower();
      //   }
      // }

      function sendAnswers() {
        if (options.length === 2) {
          block.rpc('$sendAnswers', {
            q1: +$slider1.val(),
            q2: +$slider2.val()
          });
        } else {
          block.rpc('$sendAnswers', {
            q1: +$slider1.val(),
            q2: +$slider2.val(),
            q3: +$slider3.val(),
            q4: +$slider4.val()
          });
        }
      }

      $slider1.on('slide', function() {
        if (block.config.realtime) {
          sendAnswersSlower();
        }
      });
      $slider2.on('slide', function() {
        if (block.config.realtime) {
          sendAnswersSlower();
        }
      });
      if (options.length !== 2) {
        $slider3.on('slide', function() {
          if (block.config.realtime) {
            sendAnswersSlower();
          }
        });
        $slider4.on('slide', function() {
          if (block.config.realtime) {
            sendAnswersSlower();
          }
        });
      }

      // $slider1.on('focus', function() {
      //   console.log('FOCUS');

      //   $slider1.on('keydown', function(e) {
      //     switch ( e.which ) {
      //       case 13:
      //         $(this).change();
      //         break;
      //       case 39: $slider1.val( $slider1.val() + 1 );
      //         break;
      //       case 37: $slider1.val( $slider1.val() - 1 );
      //         break;
      //     }
      //   });

      // });
      // $slider1.on('blur', function() {
      //   console.log('BLUR');
      // });
      // $slider1.on('click', function() {
      //   $slider1.focus();
      // });


      var $sendBtn = $('<button class="btn btn-primary">' + dict.SCATTER_SEND_BTN + '</button>');
      $sendBtn.on('click', function() {
        //console.log(typeof $slider1.val())
        sendAnswers();
        // TODO for realtime answers, allow marking ready, and consider showing again
        //if (!block.config.realtime) {
        $el.html(dict.SCATTER_SENT_TXT);
          //block.emit('change:active', false); // simulate, would affect control buttons
        //}
        return false;
      });

      $sendBtn.appendTo($el);

     // $(document).on('change', 'input[type="range"]', function(e) {
     //    console.log(e.target);
     //  });

     //  $el.find('input[type="range"]').rangeslider({
     //    polyfill: false,
     //    rangeClass: 'rangeslider',
     //    fillClass: 'rangeslider__fill',
     //    handleClass: 'rangeslider__handle',
     //    // Callback function
     //    //onInit: function() {},

     //    // Callback function
     //    onSlide: function(position, value) {
     //      console.log(position)
     //      //return true;
     //    },

     //    // Callback function
     //    //onSlideEnd: function(position, value) {}
     //  });

    }
    if (__SCREEN__) {

      render(options);

    }
  });
  block.emit('change:options', block.config.options);

  block.on('change:results', function(results) {
    if (!results) results = [];

    if (__SCREEN__) {

      return; // disabled

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
          block.$el.find('#' + blockId + '-result-' + j + '-count').text(votes[j]);
        }
        //block.$el.find('#' + blockId + '-totaltext').text('Total');
        //block.$el.find('#' + blockId + '-total').text(total);

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

      var pollStr = '<h5>' + dict.POLL_RESULTS + '</h5> <ul class="list-unstyled"> ' + results.map(function(result) {
        return '<li><strong>(' + result.points + ')</strong> ' + _.escape('' + pollOptions[result.id]) + '</li>'
        //result.points;
      }).join('') + '</ul>';

      if (siteConfig.MEANVAR) {
        if (pollMean != null && pollStdDev != null) {
          pollStr += '<p id="' + this.id + '-meanvar_control">Mean ' + pollMean + ' ± ' + pollStdDev + '</p>';
        }
      }

    }
    if (__WEB__) {
      // What to show on web?

    }

  });

  block.emit('change:results', block.config.results);

  if (__CONTROL__ || __STAGE__) {

    var $resultEl = block.$el.find('#' + block.id + '-results');

    block.on('change:voters', function(voters) {

      $resultEl.text('Vastaajia ' + Object.keys(voters).length + ' kpl');

    });
    block.emit('change:voters', block.config.voters);

  }

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


function initRealtime(block) {
  if (__CONTROL__) {

    function $newButton() {
      var buttonStr = '<a class="btn btn-sm" href="#"></a>';
      var $button = $(buttonStr);

      function buttonOn() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-check"></span> ' + dict.REALTIME_BTN_ON + '</span>');
        $button.attr('title', dict.REALTIME_BTN_ON_HOVER);
      }

      function buttonOff() {
        $button.html('<span class="text-primary"><span class="glyphicon glyphicon-unchecked"></span> ' + dict.REALTIME_BTN_OFF + '</span>');
        $button.attr('title', dict.REALTIME_BTN_OFF_HOVER);
      }

      $button.on('click', function(ev) {
        if (block.config.realtime) {
          buttonOff();
          block.rpc('$realtime', false);
        } else {
          buttonOn();
          block.rpc('$realtime', true);
        }
        return false;
      });

      block.on('change:realtime', function(enabled) {
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

  block.emit('change:realtime', block.config.realtime, true);
}

if (__SCREEN__) {
// Moved to ChannelConstructorHttp to prevent synchronous xmlhttprequest and race condition on firefox
//$('body').append('<script src="assets/scatterFiles/scatterassets.global.min.js">');
  //$('body').append('<link rel="stylesheet" href="assets/scatterFiles/client.min.css">');
}

function renderScatter(block) {

    if (!__SCREEN__) {
      return;
    }

    var $div = block.$el.find('#' + block.id + '-__BLOCKTYPE__');

    $div.html('<svg style="height:500px">');

  //Format A

    var basicData = [];

    //var shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'];

    function parseVoteData() {
      var voters = block.config.voters;

      if (!voters) {
        return;
      }
      // reset first
      basicData.length = 0;


      basicData.push({
        key: 'Vastaajat',
        values: []
      });

      // basicData.push({
      //   key: 'Epäaktiiviset',
      //   values: [{
      //     x: 80,
      //     y: 80,
      //     size: 1,
      //     shape: 'circle'
      //   }]
      // });

      var values = basicData[0].values;

      //var j = 0;
      for (var userId in voters) {
        var voter = voters[userId];
        values.push({
          x: voter.vote2, // NOTE ORDERING
          y: voter.vote1, // NOTE ORDERING
          size: 1, //Math.random()
          //size: Math.random(),
          shape: 'circle'
          //shape: shapes[++j % 6]
        });
      }

    }

    parseVoteData();

    //var basicData = randomData(1,40);

    var chart;
    nv.addGraph(function() {
      chart = nv.models.scatterChart()
                    .showDistX(true)
                    .showDistY(true)
                    .forceX([0,100])
                    .forceY([0,100])
                    //.forceSize(10)
                    .size(1)
                    .sizeRange([250,350])
                    //.useVoronoi(true)
                    .color(d3.scale.category10().range())
                    .transitionDuration(300)
                    .noData(dict.SCATTER_WAITING_RESULTS)
                    ;

    // chart.xAxis.tickFormat(d3.format('.02f')).axisLabel('Teknologinen orientaatio');
    // chart.yAxis.tickFormat(d3.format('.02f')).axisLabel('Pedagoginen orientaatio');

    var ylabel = (block.config.options.length === 2) ? block.config.options[0] : 'Pedagoginen orientaatio';
    var xlabel = (block.config.options.length === 2) ? block.config.options[1] : 'Teknologinen orientaatio';

    chart.xAxis.tickFormat(d3.format('.00f')).axisLabel(xlabel);
    chart.yAxis.tickFormat(d3.format('.00f')).axisLabel(ylabel);

    // setTimeout(function() {
    //   chart.yAxis.axisLabel("Y2");
    // }, 2000)

    //chart.showXAxis(true).showYAxis(true).rightAlignYAxis(true).margin({right: 90});
    // chart.tooltipContent(function(key) {
    //     return '<h2>' + key + '</h2>';
    // });

    //chart.scatter.onlyCircles(false);

    d3.select('#' + block.id + '-__BLOCKTYPE__ svg')
        //.datum(randomData(4,40))
        //.datum(basicData)
        .datum(basicData)
        //.transition().duration(500)
        .call(chart);

    nv.utils.windowResize(chart.update);
    setTimeout(function() {
      // Hack, sometimes chart not resized properly initially
      chart.update();
    }, 0);
    block.on('change:selected', function(selected) {
      // Hack, sometimes chart not resized properly when shown
      if (selected) {
        chart.update();
      }
    });

    // TODO more granular updates
    block.on('change:voters', function(voters) {
      block.config.voters = voters; // TODO hack for now
      parseVoteData();
      chart.update();
    });

    // if $clear called. Don't know if d3 have some internal caches which could need purging.
    block.on('change:options', function() {
       d3.selectAll('#' + block.id + '-__BLOCKTYPE__ svg > *').remove();
    });

     // setInterval(function() {
     //   randomData(1,40);
     //   chart.update();
     // }, 1000);

    chart.dispatch.on('stateChange', function(e) {
    });

    return chart;
  });

  function randomData(groups, points) { //# groups,# points per group
    //var data = [];
    var data = basicData || [];
    data.length = 0;

    var shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'];
    var random = d3.random.normal();

    for (i = 0; i < groups; i++) {
      data.push({
        key: 'Group ' + i,
        values: []
      });

      for (j = 0; j < points; j++) {
        data[i].values.push({
          x: random()*100,
          y: random()*100,
          size: Math.random(),
          shape: shapes[j % 6] //(Math.random() > 0.95) ? shapes[j % 6] : "circle"
        });
      }
    }

    return data;
  }

}
