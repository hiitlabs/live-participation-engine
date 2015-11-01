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

BlockConstructorMixin['$updateFrontends'] = function( req , attribute, value ) {
  if (req.channel.type !== 'control') return;
  // if( ! attribute in this.frontends ) return;
  if (this.frontends[ attribute ] !== value ) { // don't update when not needed
    this.frontends[ attribute ] = value; // TODO: check for XSS too?
    this.saveFrontends();
    var newConf = {};
    newConf[ attribute ] = value;
    this.rpc('$setConfig', newConf );
    console.info({
      userId: req.user.id,
      channelId: req.channel.id,
      blockId: this.id,
      attribute: attribute,
      value: value,
    }, '$updateFrontends');
  }
}

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
