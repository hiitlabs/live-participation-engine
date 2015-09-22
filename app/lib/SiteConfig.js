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
 * Configuration loader / setter
 */

var debug = require('debug')('io:SiteConfig'); debug('module loading');
var DEV = require('./DEV');

//Not possible due to circular require
//var console = require('./Logger')('io:SiteConfig');

// NOTE! Still needs config.json deletion if config-defaults.json changed
// drastically in repo.

/**
 * Dependencies
 */

// Everything is here sync for now, to ease the loading in index.js

var fs = require('fs');
var join = require('path').join;

// TODO to ease config refactoring, define config getters so that missing
// variables are caught early

/**
 * Exports a config object
 */

var SiteConfig;

var configPath = join(__dirname, '..', '..', 'config.json');
var configData;
var configObj;

var defaultsPath = join(__dirname, '..', '..', 'config-defaults.json');
var defaultsData;
var defaultsObj;

if (DEV) {
  // We are in development mode, so check defaults and make config.json if
  // missing
  try {
    defaultsData = fs.readFileSync(defaultsPath, 'utf-8');
  } catch (e) {
    console.error('config-defaults.json error: check permissions');
    throw e;
  }
  try {
    defaultsObj = JSON.parse(defaultsData);
  } catch (e) {
    console.error(
      'config-defaults.json error: check syntax (with jsonlint, for example)'
    );
    throw e;
  }

  if (fs.existsSync(configPath)) {
    try {
      configData = fs.readFileSync(configPath, 'utf-8');
    } catch (e) {
      console.error('config.json error: check permissions');
      throw e;
    }
    try {
      configObj = JSON.parse(configData);
    } catch (e) {
      console.error(
        'config.json error: check syntax (with jsonlint, for example)'
      );
      throw e;
    }

    // Copy current config on top of defaults
    // Note: when config-defaults.json changes in repo, may need config.json
    // deletion
    for (var key in configObj) {
      defaultsObj[key] = configObj[key];
    }
  }

  SiteConfig = defaultsObj;

  /**
   * Persist conf to disk
   */

  // Use sync to avoid writing empty file (invalid JSON)
  fs.writeFileSync(configPath, JSON.stringify(SiteConfig, null, 2));

} else {
  // We are in production mode

  try {
    configData = fs.readFileSync(configPath, 'utf-8');
  } catch (e) {
    // TODO: Should log to file too
    console.error(
      'config.json error: copy config-defaults.json as config.json or check ' +
      'permissions'
    );
    throw e;
  }
  try {
    configObj = JSON.parse(configData);
  } catch (e) {
    // TODO: Should log to file too
    console.error(
      'config.json error: check syntax (with jsonlint, for example)'
    );
    throw e;
  }

  SiteConfig = configObj;

}

module.exports = SiteConfig;
