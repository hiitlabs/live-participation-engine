var throttle = require('../lib/utils/throttle');

// commonly used static functions

var functions = {}

functions.trimWhitespace = function(str) {
  str = str.replace(/\s/g, ' '); // convert all non-printable chars to a space
  str = str.replace(/^\s+|\s+$/g, ''); // begin end
  str = str.replace(/\s\s+/g, ' '); // middle
  return str;
}

functions.defaults = function(obj, props) {
  if (typeof props === 'function') {
    props = props();
  }
  for (var key in props) {
    if (obj[key] === undefined) {
      obj[key] = props[key];
    }
  }
}

exports.functions = functions;

// BlockConstructorMixin

var BlockConstructorMixin = {};

BlockConstructorMixin.saveFrontends = function() {
  this.db.set(this.id + 'frontends', this.frontends);
  return this;
};

BlockConstructorMixin.saveParticipants = function() {
  this.db.set(this.id + 'participants', this.participants);
  this.db.set(this.id + 'participantCount', this.participantCount);
  return this;
};

BlockConstructorMixin.save = function() {
  this.db.set(this.id, this.config);
  this.saveContent();
  this.saveFrontends();
  this.saveParticipants();
  return this;
};

BlockConstructorMixin.updateParticipantCount = function(userId) {
  if (this.participants[userId]) return;

  this.participants[userId] = true; // TODO later more info
  this.participantCount++;

  console.info({
    blockId: this.id,
    participantCount: this.participantCount
  }, 'chatParticipantCount');

  if (!this.sendParticipantCountThrottled) {
    this.sendParticipantCountThrottled = throttle(this.sendParticipantCount, 1000);
  }
  this.sendParticipantCountThrottled();
  // TODO throttled save
  this.saveParticipants();
};

BlockConstructorMixin.sendParticipantCount = function() {
  // TODO Will send only to control for now
  this.rpc('control:$setConfig', {participantCount: this.participantCount});
};

BlockConstructorMixin['$active'] = function(req, active) {
  if (req.channel.type !== 'control') return;
  active = !!active;
  if (this.frontends.active !== active) {
    this.frontends.active = active;
    console.log( this );
    this.saveFrontends();
    this.rpc('$setConfig', {active: this.frontends.active});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      active: this.frontends.active
    }, '$active');
  }
};

BlockConstructorMixin['$heading'] = function(req, heading) {
  if (req.channel.type !== 'control') return;
  if (typeof heading !== 'string') return;
  if (this.frontends.heading !== heading) {
    this.frontends.heading = functions.trimWhitespace(heading).substring(0, 500);
    this.saveFrontends();
    this.rpc('$setConfig', {heading: this.frontends.heading});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      heading: this.frontends.heading
    }, '$heading');
  }
};

BlockConstructorMixin['$description'] = function(req, description) {
  if (req.channel.type !== 'control') return;
  if (typeof description !== 'string') return;
  if (this.frontends.description !== description) {
    this.frontends.description = functions.trimWhitespace(description).substring(0, 2000);
    this.saveFrontends();
    this.rpc('$setConfig', {description: this.frontends.description});
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      description: this.frontends.description
    }, '$description');
  }
};

BlockConstructorMixin.__setVisible = function(visible) {
  visible = !!visible;
  if (this.frontends.visible !== visible) {
    this.frontends.visible = visible;
    this.saveFrontends();
    this.rpc('$setConfig', {visible: this.frontends.visible});
  }
  return this;
};

BlockConstructorMixin.__setSelected = function(selected) {
  selected = !!selected;
  if (this.frontends.selected !== selected) {
    this.frontends.selected = selected;
    this.saveFrontends();
    for (var channelId in this.channels) {
      if (this.channels[channelId].type !== 'web') {
        this.rpc(channelId + ':$setConfig', {selected: this.frontends.selected});
      }
    }
    //this.rpc('$setConfig', {selected: this.frontends.selected});
  }
  return this;
};

BlockConstructorMixin._clear = function() {
  this.participants = {};
  this.participantCount = 0;
  this.save();
  this.rpc('$clear');
  // Or use this.sendParticipantCount();
  this.rpc('control:$setConfig', {participantCount: this.participantCount});
};

exports.BlockConstructorMixin = BlockConstructorMixin;

module.exports = exports;
