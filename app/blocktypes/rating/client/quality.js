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
 * Quality functionality, part of messaging
 */

var dict = require('./lang');

exports = module.exports = quality;

function quality(block) {
  if (__CONTROL__) {
    block.$el.on('click', 'a.__BLOCKTYPE__-promote', function(ev) {
      // TODO properly, state, tagging etc
      //var msgId = $(ev.target).attr('data-id');
      var msgId = $(this).attr('data-id');
      // TODO toggle tag instead
//      self.rpc('$setQuality', msgId, '+');
      return false;
    });
    block.$el.on('click', 'a.__BLOCKTYPE__-normalize', function(ev) {
      var $el = $(this);
      var msgId = $el.attr('data-id');
      $el.removeClass('__BLOCKTYPE__-normalize');
      $el.addClass('__BLOCKTYPE__-hide');
      $el.attr('title', dict.HIDEMSG_HOVER);
      $el.html('<span class="glyphicon glyphicon-remove"></span>');
      //$el.text('x');
      // TODO toggle tag instead
      block.rpc('$setQuality', msgId, '');
      return false;
    });
    block.$el.on('click', 'a.__BLOCKTYPE__-fade', function(ev) {
      var msgId = $(this).attr('data-id');
      // TODO toggle tag instead
//      self.rpc('$setQuality', msgId, '-');
      return false;
    });
    block.$el.on('click', 'a.__BLOCKTYPE__-hide', function(ev) {
      var $el = $(this);
      var msgId = $el.attr('data-id');
      $el.removeClass('__BLOCKTYPE__-hide');
      $el.addClass('__BLOCKTYPE__-normalize');
      $el.attr('title', dict.SHOWMSG_HOVER);
      $el.html('<span class="glyphicon glyphicon-plus"></span>');
      //$el.text('+');
      block.rpc('$setQuality', msgId, 'x');
      return false;
    });
    block.$el.on('click', 'a.__BLOCKTYPE__-edit', function(ev) {
      var msgId = $(this).attr('data-id');
      return false;
    });

    block.$el.on('click', 'a.__BLOCKTYPE__-bonus', function(ev) {
      var $el = $(this);
      var msgId = $el.attr('data-id');
      block.rpc('$addPointsToContributor', msgId);
      return false;
    });

  }
}
