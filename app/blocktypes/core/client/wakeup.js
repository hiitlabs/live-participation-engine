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

// Sleep and wakeup detection

var events = require('./events');

// If you ever need a fast ticker, insert actions here rather than
// creating multiple rapid interval timers, which is slow.
// If you need even faster timer, use requestAnimationFrame().
function globalTimerCallback() {
  // Alternatively listen to ticks via the event bus.
  events.emit('tick');

  detectWakeFromSleep();
  emitTick10s();
}

// Tick every 100 ms
var highFrequencyTimerId = window.setInterval(globalTimerCallback, 100);

// The time, in ms, that must be missed before we assume the app was put to sleep.
// This can be fairly large to avoid false positives due to blocking rendering,
// blocking network access etc.
var THRESHOLD = 10000;

var lastTick, now, delta;
var getNow = typeof Date.now == 'function' ? Date.now : function() { return new Date().getTime(); };

function detectWakeFromSleep() {
  now = getNow();
  delta = now - lastTick;
  if (delta > THRESHOLD) {
    // The app probably just woke up after being asleep.
    if (__DEV__) console.log('wakeup: ' + delta + ' ms, threshold ' + THRESHOLD + ' ms');
    events.emit('wakeup', delta);
  }
  lastTick = now;
}

var lastEvent = getNow();
function emitTick10s() {
  if (now - lastEvent > 10000) {
    events.emit('tick10s');
    lastEvent = now;
  }
}
