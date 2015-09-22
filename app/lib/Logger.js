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
 * Standard logger
 */

var bunyan = require('bunyan');
var SiteConfig = require('./SiteConfig');
var DEV = require('./DEV');
var join = require('path').join;
var invariant = require('./utils/invariant');

var log;

if (DEV) {
  // in dev, log to console
  log = bunyan.createLogger({name: SiteConfig.SITEROUTE}); // info, warn, error and fatal, not debug or trace
} else {
  log = bunyan.createLogger({
    name: SiteConfig.SITEROUTE,
    streams: [
      {
        level: 'info',
        //stream: process.stdout,           // log INFO and above to stdout
        path: join(__dirname, '..', '..', 'logs', 'session.log')  // log INFO and above to a file
      },
      //{
      //  level: 'info',
      //  path: join(__dirname, '..', '..', '1.log')  // log ERROR and above to a file
      //},
      {
        level: 'warn',
        path: join(__dirname, '..', '..', 'logs', 'error.log')  // log WARN, ERROR and above to a file
      }
    ]
  }); // info, warn, error and fatal, not debug or trace
}

var UsedNamespaces = {};

var Logger = function(namespace) {
  invariant(typeof namespace === 'string', 'namespace string required');
  UsedNamespaces[namespace] = true;
  var logger = log.child({module: namespace});
  // console.log compatibility
  logger.log = logger.info;
  return logger;
};

// NOTE: Usage
//log.trace("info");
//log.debug("info");
//log.info("info");
//log.warn("warn");
//log.error("error");
//log.fatal("fatal");

module.exports = Logger;
