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
 * Index.html render
 */

// TODO perhaps refactor to layout manager etc

// Core translations
var dict = require('./lang');

var config = require('./index').config;

var events = require('./events');

// TODO inject instead
var core = require('./blocks').core;

// TODO move to layout, perhaps to blocks for now
// Renders index.html body on the client for now
function render() {
  var viewFn = require('./view.html');
  // TODO give paramenters
  var params = _.extend({}, config, dict);
  var viewStr = viewFn(params); // Could be done on serverside too
  var $viewEl = $(viewStr); // Needs DOM
  // TODO alternatively return the el and append/replace in caller
  $viewEl.prependTo('body');
  //$('body').prepend(viewEl);
}

function trimWhitespace(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

function renderLogin() {
  var viewFn = require('./loginview.html');
  // TODO give paramenters
  var params = _.extend({}, config, dict);
  var viewStr = viewFn(params); // Could be done on serverside too
  var $viewEl = $(viewStr); // Needs DOM
  // TODO alternatively return the el and append/replace in caller
  $viewEl.prependTo('#username-row');

  // TODO move
  if (config.USERPIN) {
    var $userpin = $('#userpin-field');
    if (typeof config.userpin === 'string') {
      $userpin.val(config.userpin);
    }

    $userpin.on('keydown', function(ev) {
      if (ev.which == 13) { // return key
        //console.log($('#username-send'))
        //$('#username-send').click();
        //$usernameSend.click();
        ev.preventDefault();
        return false;
      }
    });

    //if (typeof config.networkingCode === 'string') {
    //  $('#userNetwork-networkingCode').text(config.networkingCode);
    //}
  }

  var $username = $('#username-field');

  var sessionStorage = require('./sessionStorage');

  function saveValue() {
    var currentInputValue = $username.val();
    if (typeof currentInputValue !== 'string') return;
    sessionStorage.setItem('core-username', currentInputValue);
  }
  function fetchValue() {
    var previousInputValue = sessionStorage.getItem('core-username');
    if (typeof previousInputValue !== 'string') return;
    $username.val(previousInputValue);
  }

  if (typeof config.username === 'string') {
    $username.val(config.username);
    $('#username-span').text(config.username);
    // All other nodes in document too
    $('.username-span').text(config.username);
  }
  //fetchValue();
  //$username.on('keyup', saveValue);

  var $usernameSend = $('#username-send');

  $username.on('keydown', function(ev) {
    if (ev.which == 13) { // return key
      ev.preventDefault();
      //$usernameSend.click(); // for some reason double triggers?
      return false;
    }
  });

  $usernameSend.on('click', function(ev) {
    ev.preventDefault();

    // TODO move
    if (config.USERPIN) {
      var userpin = $userpin.val();
      userpin = trimWhitespace(userpin);
      if (!userpin) {
        alert(dict.EMAIL_REQUIRED);
        $userpin.val('');
        return false;
      }
      // TODO could validate the pin, when it's email etc
    }

    var usernameInput = $username.val();
    usernameInput = trimWhitespace(usernameInput);
    if (!usernameInput) {
      alert(dict.USERNAME_REQUIRED);
      $username.val('');
      return false;
    }
    if (usernameInput.length > 200) {
      alert('Max 200 characters, thank you');
      return false;
    }
    var rpc = require('./rpc');
    if (config.USERPIN) {
      rpc('core.$setUserpin', userpin, function(err) {
        if (err) {
          if (err === 'INVALID_USERPIN') {
            alert(dict.INVALID_USERPIN);
          } else if (err === 'USERPIN_ALREADY_TAKEN') {
            alert(dict.USERPIN_ALREADY_TAKEN);
          } else {
            alert(err);
          }
          return;
        }
        setUsername();
      });
      //$userpin.prop('disabled', true).addClass('disabled');
    } else {
      setUsername();
    }

    function setUsername() {
      rpc('core.$setUsername', usernameInput, function(err) {
        if (err) {
          if (err === 'USERNAME_ALREADY_TAKEN') {
            alert(dict.USERNAME_ALREADY_TAKEN);
          } else {
            alert(err);
          }
          return;
        }
        renderLoggedIn();
        $('html, body').stop(true).animate({scrollTop: 0});
      });
    }

    //$username.prop('disabled', true).addClass('disabled');
    //$usernameSend.hide();

    return false;
  });

  // TODO edit button

  // TODO move
  if (config.USERPIN) {
    core.on('update:userpin', function(userpin) {
      if (typeof userpin === 'string') {
        // TODO will overwrite if just writing and then update comes
        $userpin.val(userpin);
      }
    });
    core.on('update:networkingCode', function(networkingCode) {
      if (typeof networkingCode === 'string') {
        $('#networkingCode').text(networkingCode);
      }
    });
  }

  core.on('update:username', function(username) {
    if (typeof username === 'string') {
      // TODO will overwrite if just writing and then update comes
      $username.val(username);
      $('#username-span').text(config.username);

      // Queries all DOM to set all fields everywhere
      $('.username-span').text(config.username);
    }
  });

}

function renderLoggedIn() {
  $('#username-row').empty();
  var viewFn = require('./loginview.html');
  // TODO give paramenters
  var params = _.extend({}, config, dict, {loggedIn: true});
  var viewStr = viewFn(params); // Could be done on serverside too
  var $viewEl = $(viewStr); // Needs DOM
  // TODO alternatively return the el and append/replace in caller
  $viewEl.prependTo('#username-row');
  //$('body').scrollTop(0);
  // TODO Should guard most of these behind config flags
  renderNetworking();

  // Race in painting logged-in form, so hack for now
  $('#username-span').text(config.username);
  $('.username-span').text(config.username); // Whole doc
  if (typeof config.points !== 'undefined') {
    $('#points-span').text(config.points);
  }
  if (typeof config.networkingCode === 'string') {
    $('#networkingCode').text(config.networkingCode);
  }

  if (config.POINTS) {
    var $helpBtn = $('<a href="#" tabindex=-1 title="' + dict.POINTS_HELP_TITLE + '" class="btn btn-xs text-muted"><span class="glyphicon glyphicon-question-sign"></span></a>');
    $helpBtn.popover({
      content: dict.POINTS_HELP,
      placement: 'bottom',
      trigger: 'focus'
      //selector: true
    });
    //$helpBtn.insertAfter('#points-span');
    $('#points-help').replaceWith($helpBtn);
  }

  // TODO move
  if (config.NETWORKING) {
    var $networkingSend = $('#networking-send');

    // Double declaration, TODO check if the same field is always there
    var $targetNetworkingCode = $('#networking-field');
    $targetNetworkingCode.on('keydown', function(ev) {
      if (ev.which == 13) { // return key
        $networkingSend.click();
        return false;
      }
    });

    $networkingSend.on('click', function(ev) {
      ev.preventDefault();

      if (!config.networkingCode) {
        return false;
      }

      var $targetNetworkingCode = $('#networking-field');

      var targetNetworkingCode = $targetNetworkingCode.val();
      targetNetworkingCode = trimWhitespace(targetNetworkingCode);
      if (!targetNetworkingCode) {
        $targetNetworkingCode.val('');
        return false;
      }
      // Could validate PIN format already here

      var rpc = require('./rpc');
      rpc('core.$collectNetworkingCode', targetNetworkingCode, function(err) {
        if (err) {
          if (err === 'INVALID_CODE') {
            alert(dict.INVALID_CODE);
          } else if (err === 'OWN_CODE') {
            alert(dict.OWN_CODE);
          } else if (err === 'ALREADY_ADDED_CODE') {
            alert(dict.ALREADY_ADDED_CODE);
          } else {
            alert(err);
          }
          return;
        }
      });
      $targetNetworkingCode.val('');

      return false;
    });

    function formatNetworkingList(networkingList, type, all) {
      // TODO proper map
      var visible = [];
      var remainingCount = 0;
      var visibleCount = 3;
      for (var userId in networkingList) {
        if (networkingList[userId].type != type) {
          continue;
        }
        visibleCount--;
        if (all || visibleCount >= 0) {
          visible.push(networkingList[userId].username);
        } else {
          remainingCount++;
        }
      }
      var outStr = visible.join(', ');
      var outHtml = '';
      if (remainingCount > 0) {
        outHtml = ', <a href="#">+' + remainingCount + ' ' + dict.NETWORKING_REMAINING + '</a>.';
      }
      if (outStr.length && !outHtml.length) {
        outStr += '.';
      }
      return {
        str: outStr,
        html: outHtml
      };
    }

    // Preliminary networkingList
    var $defaultContacts = $('#networking-list');
    var $companyContacts = $('#networking-list2');
    core.on('update:networkingList', function(networkingList) {
      //if (typeof networkingList === 'string') {
        var defaultContacts = formatNetworkingList(networkingList);
        $defaultContacts.text(defaultContacts.str);
        $defaultContacts.append(defaultContacts.html);
        var companyContacts = formatNetworkingList(networkingList, 'company');
        $companyContacts.text(companyContacts.str);
        $companyContacts.append(companyContacts.html);
      //}
    });
    if (typeof config.networkingList !== 'undefined') {
      var defaultContacts = formatNetworkingList(config.networkingList);
      $defaultContacts.text(defaultContacts.str);
      $defaultContacts.append(defaultContacts.html);
      var companyContacts = formatNetworkingList(config.networkingList, 'company');
      $companyContacts.text(companyContacts.str);
      $companyContacts.append(companyContacts.html);
    }
    $defaultContacts.on('click', 'a', function(ev) {
      ev.preventDefault();
      var defaultContacts = formatNetworkingList(config.networkingList, null, true);
      $defaultContacts.text(defaultContacts.str);
      return false;
    });
    $companyContacts.on('click', 'a', function(ev) {
      ev.preventDefault();
      var companyContacts = formatNetworkingList(config.networkingList, 'company', true);
      $companyContacts.text(companyContacts.str);
      return false;
    });

  }

  // TODO move
  if (config.POINTS) {
    core.on('update:points', function(points) {
      //if (typeof points === 'string') {
        $('#points-span').text(points);
      //}
    });
    if (typeof config.points !== 'undefined') {
      $('#points-span').text(config.points);
    }
  }
}

function renderNetworking() {
  $('#networking-row').empty();
  var viewFn = require('./networkingview.html');
  // TODO give paramenters
  var params = _.extend({}, config, dict, {loggedIn: true});
  var viewStr = viewFn(params); // Could be done on serverside too
  var $viewEl = $(viewStr); // Needs DOM
  // TODO alternatively return the el and append/replace in caller
  $viewEl.prependTo('#networking-row');
  //$('body').scrollTop(0);
}

// TODO move this to create, after layoutrender
if (__CONTROL__) {

  function createForm() {
    var blockOptions = '';
    blockOptions += '<option>' + dict.CREATE_LABEL + '</options>';
    _.each(config.blocktypes, function(blocktype) {
      var info;
      try {
        info = require('/' + blocktype + '/info');
      } catch(e) {}
      var blockName;
      if (info && info.longName) {
        blockName = info.longName;
      } else {
        blockName = blocktype;
      }

      blockOptions += '<option data-blocktype="' + blocktype + '">' + blockName + '</options>';
    });

    $('#core-createSelector').html(blockOptions);

    $('#core-createSelector').change(function() {
      var str = "";
      $("#core-createSelector option:selected").each(function() {
        var selected = $(this).text();
        if (selected == dict.CREATE_LABEL) {
          $('#core-createForm').empty();
          return;
        }
        var blocktype = $(this).attr('data-blocktype');
        var blockConstructor;
        try {
          blockConstructor = require('/' + blocktype);
        } catch(e) {}
        if (!blockConstructor) {
          if (__DEV__) console.log('constructor ' + blocktype +  ' not available');
          $('#core-createForm').empty();
          return;
        }
        blockConstructor.createForm(document.getElementById('core-createForm'));
      });
    }).change();
  }

  function controlButtons() {
    $('#core-invertColorsBtn').on('click', function(ev) {
      var rpc = require('./rpc');
      rpc('core.$invertColors', !core.config.invertColors);
      return false;
    });
    // TODO hover titles
    core.on('update:invertColors', function(invertColors) {
        if (invertColors) {
          $('#core-invertColorsBtn').addClass('btn-warning').removeClass('btn-default');
        } else {
          $('#core-invertColorsBtn').addClass('btn-default').removeClass('btn-warning');
        }
    });


    $('#core-exportBtn').on('click', function(ev) {
      // Calculate local time diff relative to UTC, could be selectable later
      var timeDiff = (new Date()).getTimezoneOffset()*-60*1000;

      var rpc = require('./rpc');
      rpc('core.$printReport', timeDiff, function(err, data, dataCSV) {
        if (!data) return;

        // Remove possibly existing modal
        $('#export-modal').remove();

        var modalFn = require('./export-modal.html');
        // // TODO translate reason too ("Opened in another tab.")

        // tolerate bad argument name for reportCSVURL, in the intereset of not breaking anything
        var params = _.extend({reportText: data, reportCSVURL: dataCSV, SHOW_CSV_EXPORT: config.SHOW_CSV_EXPORT}, dict);
        var $modal = $(modalFn(params));
        $modal.prependTo('body');
        // $modal.on('show.bs.modal', function() {
        //   $('#disconnected a.btn').on('click', function(e) {
        //     location.reload();
        //   });
        // });
        $modal.modal({
          backdrop: 'static',
          //keyboard: false,
          show: true // ensure the modal is shown immediately
        });
        // $modal.on('shown.bs.modal', function () {
        //   $modal.find('textarea').focus();
        //   //$('#textareaID').focus();
        // });
        $modal.on('hidden.bs.modal', function () {
          $modal.remove(); // Remove from document
        });
      });
      return false;
    });

    $('#core-showSiteUrlBtn').on('click', function(ev) {
      var rpc = require('./rpc');
      rpc('core.$showSiteUrl', !core.config.showSiteUrl);
      return false;
    });
    // TODO hover titles
    core.on('update:showSiteUrl', function(showSiteUrl) {
        if (showSiteUrl) {
          $('#core-showSiteUrlBtn').addClass('btn-warning').removeClass('btn-default');
        } else {
          $('#core-showSiteUrlBtn').addClass('btn-default').removeClass('btn-warning');
        }
    });

    $('#core-showSocketCountBtn').on('click', function(ev) {
      var rpc = require('./rpc');
      rpc('core.$showSocketCount', !core.config.showSocketCount);
      return false;
    });
    core.on('update:showSocketCount', function(showSocketCount) {
        if (showSocketCount) {
          $('#core-showSocketCountBtn').addClass('btn-warning').removeClass('btn-default');
        } else {
          $('#core-showSocketCountBtn').addClass('btn-default').removeClass('btn-warning');
        }
    });

    if (config.USERNAMES) {
      $('#core-showUsernameInputBtn').on('click', function(ev) {
        var rpc = require('./rpc');
        rpc('core.$showUsernameInput', !core.config.showUsernameInput);
        return false;
      });
      core.on('update:showUsernameInput', function(showUsernameInput) {
          if (showUsernameInput) {
            $('#core-showUsernameInputBtn').addClass('btn-info').removeClass('btn-default');
          } else {
            $('#core-showUsernameInputBtn').addClass('btn-default').removeClass('btn-info');
          }
      });
    }
  }
}

function renderScoreboard() {
  if (!config.POINTS) {
    return;
  }
  if (__SCREEN__) {
    $('<div id="scoreboard-screen" style="padding-bottom:1000px"></div>').insertBefore('#blockcontainer-maxi');
  }
  core.on('update:scoreboard', function(scoreboard) {
    if (!scoreboard) scoreboard = [];
    if (__CONTROL__ || __SCREEN__) {

      //var $el = this.$el.find('#' + this.id + '-results');
      var $el = $('#scoreboard-row');
      if (__SCREEN__) {
        $el = $('#scoreboard-screen');
      }

      var showBtn = '';
      if (__CONTROL__) {
        showBtn = ' [<a class="scoreboard-showScreen" href="#">screen</a>]';
      }

      var visibleIndex = 0;
      var titleTag = __SCREEN__ ? 'h2' : 'h4';

      $el.html('<div class="col-sm-1"></div><div class="col-sm-11" style="margin-top:4em">' +
        '<' + titleTag + '>' + dict.POINTS_TITLE + ' ' + showBtn +
          '</' + titleTag + '> <ul class="list-unstyled"> ' + scoreboard.map(function(result) {
        if (!result.points) return '';
        var muted = '';
        if (result.hidden) {
          if (!__CONTROL__) {
            return;
          } else {
            muted = 'text-muted';
          }
        } else {
          visibleIndex++;
        }
        var opts = __CONTROL__ ? ' <a href="#" data-id="' + result.id + '" class="scoreboard-hideUser"><span class="glyphicon glyphicon-remove"></span></a>' : '';
        var email = __CONTROL__ ? ' (' + _.escape('' + result.email) + ')' : '';
        return '<li class="' + muted + '"><span style="font-size:1.5em">' + visibleIndex + '.</span> <strong>' + _.escape('' + result.username) + '</strong>' +
          email + ' – <span class="text-info">' + result.points + ' ' + dict.POINTS_AMOUNT + '</span>' + opts + '</li>'
      }).join('') + '</ul></div><div class="col-sm-1></div>');

    }
  });
  core.emit('update:scoreboard', config.scoreboard);

  if (__CONTROL__) {
    $('#scoreboard-row').on('click', 'a.scoreboard-hideUser', function(ev) {
      ev.preventDefault();
      var id = $(this).attr('data-id');
      var rpc = require('./rpc');
      rpc('core.$hideUser', id);
      return false;
    });

    $('#scoreboard-row').on('click', 'a.scoreboard-showScreen', function(ev) {
      ev.preventDefault();
      var rpc = require('./rpc');
      rpc('core.$showScoreboardOnScreen');
      return false;
    });
  }

  function showScoreboardOnScreen(show, immediate) {
    // TODO cpmare
    var $el = $('#scoreboard-screen')
    if (show) {
      if (immediate) {
        $el.show();
      } else {
        $el.hide();
        // $el.finish().animate({height: 'show', opacity: 'show'}, 400, function() {
        //   $el.css('opacity', '');
        // });
        //$el.fadeIn().slideDown();
      }
    } else {
      if (immediate) {
        $el.hide();
      } else {
        $el.show();
        // $el.finish().animate({height: 'hide', opacity: 'hide'}, 400, function() {
        //   //$el.css('opacity', '');
        // });
        //$el.fadeOut().slideUp();;
      }
    }
  }
  core.on('update:scoreboardOnScreen', function(scoreboardOnScreen, immediate) {
    if (__SCREEN__) {
      if (scoreboardOnScreen != config.scoreboardOnScreen) {
        showScoreboardOnScreen(scoreboardOnScreen, immediate);
      }
    }
  });
  if (__SCREEN__) {
    showScoreboardOnScreen(config.scoreboardOnScreen, true);
    //core.emit('update:scoreboardOnScreen', config.scoreboardOnScreen, true);
  }

}

// No need to wait for DOM ready for now
(function() {

  render();

  if (__WEB__ || __CONTROL__ /*|| __STAGE__*/) {
    if (config.username) {
      renderLoggedIn();
    } else {
      renderLogin();
    }
  }
  if (config.POINTS) {
    renderScoreboard();
  }

  if (__CONTROL__) {
    createForm();
    controlButtons();
  }
})();

core.on('update:invertColors', function(invertColors) {
  //if (invertColors !== core.config.invertColors) {
    var $body = $('html, body');
    if (invertColors) {
      //$('#session-url').show();
      $body.css({backgroundColor: '#000', color: '#fff'});
    } else {
      $body.css({backgroundColor: '', color: ''});
      //$('#session-url').hide();
    }
  //}
});
core.emit('update:invertColors', core.config.invertColors);
//core.emit('update:invertColors', false);

if (__SCREEN__) {
  core.on('update:showSiteUrl', function(showSiteUrl) {
    //if (showSiteUrl !== core.config.showSiteUrl) {
      if (showSiteUrl) {
        $('#session-url').show();
      } else {
        $('#session-url').hide();
      }
    //}
  });
  core.emit('update:showSiteUrl', core.config.showSiteUrl);
  //core.emit('update:showSiteUrl', false);

  core.on('update:showSocketCount', function(showSocketCount) {
    //if (showSiteUrl !== core.config.showSiteUrl) {
      if (showSocketCount) {
        $('#socket-count').show();
      } else {
        $('#socket-count').hide();
      }
    //}
  });
  core.emit('update:showSocketCount', core.config.showSocketCount);
  //core.emit('update:showSiteUrl', false);
}

if (__SCREEN__ || __CONTROL__ || __STAGE__) {
  core.on('update:socketCount', function(socketCount) {
    if (!socketCount) {
      $('#socket-count').text('0 ' + (dict.PARTICIPANTS || ''));
    } else if (socketCount === 1) {
      $('#socket-count').text('1 ' + (dict.PARTICIPANT || ''));
    } else {
      $('#socket-count').text(socketCount + ' ' + (dict.PARTICIPANTS || ''));
    }
  });
}

if (config.USERNAMES) {
  if (!__SCREEN__) {
    core.on('update:showUsernameInput', function(showUsernameInput) {
      if (showUsernameInput) {
        $('#username-row').show();
        if (config.NETWORKING) {
          $('#networking-row').show();
        }
      } else {
        $('#username-row').hide();
        if (config.NETWORKING) {
          $('#networking-row').hide();
        }
      }
    });
    core.emit('update:showUsernameInput', core.config.showUsernameInput);
  }
}
