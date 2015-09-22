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

// Client code here

var Emitter = require('/core/emitter');
var rpc = require('/core/rpc');
var events = require('/core/events');

var controls = require('./controls');
var viewFn = require('./view.html');
var dictionary = require('./lang');

var heading = require('./heading');
var description = require('./description');
var poll = require('./poll');

require('./styles');

function extend(targetProto, interfaceObj) {
  for (var exportedKey in interfaceObj) {
    // interfaceObj.hasOwnProperty check perhaps
    if (typeof targetProto[exportedKey] !== 'undefined') throw new Error('property already defined');
    targetProto[exportedKey] = interfaceObj[exportedKey];
  }
  return targetProto;
}

var Block = module.exports = function(config) {
  // All blocks have an unique id that is used in all dom elements etc.
  this.id = config.id;
  // Blocks have a type/constructor/model name to know how to construct it from data.
  this.type = config.type;

  if (__DEV__) console.log('constructing block', this.id, this.type);

  // Blocks have a config object that contains common properties (selected, visible etc.)
  this.config = config;
  // Config object has an state-property that contains block-specific options (active, heading etc.)
  //if (!this.config.state) this.config.state = {};

  this.init();
  //this.refresh();
  var self = this;
  // Whenever socket opens, refresh data
  events.on('refresh', function() {
    self.refresh();
  });
  self.refresh();
};

Emitter(Block.prototype);

// Blocks have a this.rpc('$method) method to call their server-side instances conveniently without
// having to prefix by id.
Block.prototype.rpc = function() {
  var args = Array.prototype.slice.call(arguments);
  args[0] = this.id + '.' + args[0];
  rpc.apply(this, args);
};

// Called from blocks collection quite frequently, triggers 'change:prop' events on this block instance
Block.prototype.$setConfig = function(configUpdate) {
  for (var key in configUpdate) {
    if (!_.isEqual(this.config[key], configUpdate[key])) {
      this.emit('change:' + key, configUpdate[key]);
      this.config[key] = configUpdate[key];
    }
  }
  this.emit('configUpdated', configUpdate);
};

// Called in constructor
Block.prototype.init = function() {
  var self = this;
  self.render();
};

// Called in constructor, and also whenever reconnected
Block.prototype.refresh = function() {
  var self = this;
  // TODO single data getter or multiple data getters, for each feature?
  this.rpc('$getData', function(data) {
    self.emit('data', data);
    //this.$msgs(data);
  });
  this.emit('refresh');
};

Block.prototype.render = function() {

  var viewFn = require('./view.html');
  var params = _.extend({}, this.config, dictionary); // Copies many keys, could use a dict prop too.
  // Add capitalized typename
  //params.typeName = this.type.charAt(0).toUpperCase() + this.type.slice(1);

  var viewStr = viewFn(params); // Could be done on serverside too
  //var viewEl = $(viewStr); // Needs DOM
  // TODO alternatively return the el and append/replace in caller

  // Render as detached elements first
  this.$el = $(viewStr);

  // Enable basic block functionalities
  controls(this);

  heading(this);
  description(this);
  poll(this);

  // ParticipantCount
  // TODO move
  if (__CONTROL__ || __STAGE__ || __SCREEN__) {
    controls.participantCount(this);
  }
  controls.initLastActivity(this);

  // this.$el is ready, but not yet inserted to document
  this.emit('rendered');

  // Then add to document, later perhaps on block level
  var self = this;
  //$(function() {

    // TODO organize
    if (__SCREEN__) {
      // TODO copied showBlockInContainer() from screen.js
      //self.$el.hide();
      self.$el.prependTo('#blockcontainer-maxi');
    } else {
      self.$el.prependTo('#main-content');
    }
    self.emit('inserted');
  //});
};


if (__CONTROL__) {
  Block.createForm = function(el) {

    var template = require('./create.html');

    $(el).html(template(dictionary));

    $('#createNewBlock').on('click', function(ev) {
      if (__DEV__) console.log('creating');
      //var heading = $('#create-heading').val();
      var headingStr = $('#create-heading').val();
      headingStr = headingStr.replace(/\r/g, '\n');
      var headings = [];
      var headingLines = headingStr.split('\n');
      _.each(headingLines, function(headingLine) {
        headingLine = headingLine.replace(/^\s+|\s+$/g, ''); // begin end
        headingLine = headingLine.replace(/\s\s+/g, ' '); // middle
        if (headingLine !== '') headings.push(headingLine);
      });

      if (!headings.length) return false;

      var heading = headings.shift();
      var description = headings.join('\n');


      var optionsStr = $('#create-options').val();

      // TODO mac vs windows vs linux
      optionsStr = optionsStr.replace(/\r/g, '\n');

      var options = [];

      var optionsCandidates = optionsStr.split('\n');

      var optionsConfig = {};

      _.each(optionsCandidates, function(optionCandidate) {
        optionCandidate = optionCandidate.replace(/^\s+|\s+$/g, ''); // begin end
        optionCandidate = optionCandidate.replace(/\s+/g, ' '); // middle, also truncate
        if (optionCandidate == '') {
          return;
        }
        if (/^FIRST=/.test(optionCandidate)) {
          optionsConfig.firstOptionValue = optionCandidate.replace(/^FIRST=/, '');
          return;
        }
        if (/^LAST=/.test(optionCandidate)) {
          optionsConfig.lastOptionValue = optionCandidate.replace(/^LAST=/, '');
          return;
        }
        options.push(optionCandidate);
      });

      if (!options.length) return false;

      rpc('core.$createBlock', {type: '__BLOCKTYPE__', active: true, heading: heading, description: description, options: options, optionsConfig: optionsConfig}, function(err) {
        // Possible server side validation errors are not handled yet, aim for client side validation
      });
      // Perhaps response can take so long that double submits are possible, so clear form optimistically
      $('#create-heading').val('');
      $('#create-options').val('');
      return false;
    });

  };
}

