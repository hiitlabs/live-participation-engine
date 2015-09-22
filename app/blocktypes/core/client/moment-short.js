var moment = require('./moment');

var day, formats, hour, minute, second, abbrFormat, week;

moment.fn.long = function() {
  return abbrFormat.call(this, 'long');
};

moment.fn.short = function() {
  return abbrFormat.call(this, 'short');
};

abbrFormat = function(format) {
  var diff, num, unit, unitStr;

  diff = Math.abs(this.diff(moment()));
  unit = null;
  num = null;
  if (diff <= second) {
    unit = 'seconds';
    num = 1;
  } else if (diff < minute) {
    unit = 'seconds';
  } else if (diff < hour) {
    unit = 'minutes';
  } else if (diff < day) {
    unit = 'hours';
  } else if (format === 'short') {
    if (diff < week) {
      unit = 'days';
    } else {
      return this.format('M/D/YY');
    }
  } else {
    return this.format('MMM D');
  }
  if (!(num && unit)) {
    num = moment.duration(diff)[unit]();
  }
  unitStr = unit = formats[unit][format];
  if (format === 'long' && num > 1) {
    unitStr += 's';
  }
  return num + unitStr;
};

second = 1e3;

minute = 6e4;

hour = 36e5;

day = 864e5;

week = 6048e5;

formats = {
  seconds: {
    short: 's',
    long: ' sec'
  },
  minutes: {
    short: 'm',
    long: ' min'
  },
  hours: {
    short: 'h',
    long: ' hr'
  },
  days: {
    short: 'd',
    long: ' day'
  }
};
