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

var debug = require('debug')('io:ChannelConstructorHttp'); debug('module loading');
var console = require('../lib/Logger')('io:ChannelConstructorHttp');
var invariant = require('../lib/utils/invariant');

/**
 * Dependencies
 */
var SiteConfig = require('../lib/SiteConfig');
var httpFileServerMiddleware = require('express')['static'];
var HttpMiddleware = require('../lib/HttpMiddleware');
var HttpRouter = require('../lib/HttpRouter');
//var HttpServer = require('../lib/HttpServer');
var join = require('path').join;
var fs = require('fs');
var UserStore = require('../lib/UserStore');
var minifyHtml = require('../lib/utils/minifyHtml');
var template = require('../lib/utils/template');
var DEV = require('../lib/DEV');

function setup(channel) {
  channel.beforeAnyHttpRequest = channel.beforeAnyHttpRequest.bind(channel);

  channel.onHttpRequest = onHttpRequest.bind(channel);

  //createHttpFileServer(channel);

  loadChannelFrontendTemplate(channel);

  HttpMiddleware.app.get(
    '/' + channel.config.channelRoute,
    channel.beforeAnyHttpRequest,
    channel.onHttpRequest
  ); // Alternatively mount as an express app
  // TODO could manipulate routes by app.routes.get or app._router.map.get

  // TODO preliminary pin implementation
  if (channel.type == 'control' || channel.type == 'stage') {
    HttpMiddleware.app.get(
      '/' + channel.config.channelRoute + '/login',
      channel.onLoginGet.bind(channel)
    ); // Alternatively mount as an express app
    HttpMiddleware.app.post(
      '/' + channel.config.channelRoute + '/login',
      channel.onLoginPost.bind(channel)
    ); // Alternatively mount as an express app
  }

  // add default channel also to site root
  if (channel.config.channelRoute == SiteConfig.MAIN_CHANNEL) {
    HttpMiddleware.app.get(
      '/',
      channel.beforeAnyHttpRequest,
      channel.onHttpRequest
    );

    // Experimenting with a demo url showing all channels
    loadDemoFrontendTemplate(channel);
    HttpRouter.get('/' + SiteConfig.SITEROUTE + '/demo', function(httpRequest, httpResponse) {
      var params = {
        CHANNELTITLE: 'Demo',
        HOSTNAME: SiteConfig.HOSTNAME,
        SITEROUTE: SiteConfig.SITEROUTE
      };
      httpResponse.send(channel.demoFrontendTemplate(params));
    });

    loadCeilingFrontendTemplate(channel);
    HttpRouter.get('/' + SiteConfig.SITEROUTE + '/ceiling', function(httpRequest, httpResponse) {
      var params = {
        CHANNELTITLE: 'Ceiling',
        HOSTNAME: SiteConfig.HOSTNAME,
        SITEROUTE: SiteConfig.SITEROUTE
      };
      httpResponse.send(channel.ceilingFrontendTemplate(params));
    });
  }
}

var Mixin = {

  /**
   * PIN login
   */

  onLoginGet: function(httpRequest, httpResponse, next) {
    debug('onLoginGet');
    if (SiteConfig.CONTROLPIN.length === 0) {
      httpResponse.redirect('..');
      return;
    }
    var loginForm = '' +
      '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
        '<meta charset="utf-8">' +
        '<title>Presemo Login</title>' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '</head>' +
      '<body>' +
        '<form method="post">' +
          '<input id="pin" type="password" name="pin" placeholder="PIN">' +
          //<span class="help-block">If you forgot your pin, please email the support.</span>
          '<button type="submit" class="btn">Enter</button>' +
        '</form>' +
      '</body>' +
      '</html>';
    httpResponse.send(loginForm);
  },

  onLoginPost: function(httpRequest, httpResponse, next) {
    if (SiteConfig.CONTROLPIN.length === 0) {
      httpResponse.redirect('..');
      return;
    }
    var pin = httpRequest.body && httpRequest.body.pin;
    pin = '' + pin;
    //pin = pin.trim();
    if (pin === SiteConfig.CONTROLPIN) {
      debug('onLoginPost success %s', pin);
      //TODO should use req.session.regenerate
      //to prevent session fixation, but take into account already
      //opened channels such as screen on same browser
      httpRequest.session.isAdmin = true;
      httpResponse.redirect('..');
      return;
    } else {
      console.error('onLoginPost failure %s', pin);
      //httpRequest.session.error = 'Authentication failed';
      httpResponse.redirect('.');
      return;
    }
  },

  /**
   * Before each http request
   */

  beforeAnyHttpRequest: function(httpRequest, httpResponse, next) {
    if (this.type == 'control' || this.type == 'stage') {
      if (SiteConfig.CONTROLPIN.length !== 0 && !httpRequest.session.isAdmin) {
        httpResponse.redirect('./login');
        return;
      }
    }

    if (httpRequest.session.userId) {
      this.debug('existing user: found userId in session');
      httpRequest.user = UserStore.getUser(httpRequest.session.userId);
      if (!httpRequest.user) {
        if (DEV) {
          throw new Error('userid not found, clear both dbs in development');
        } else {
          console.error('userid not found, clear both dbs in development');
          return;
        }
      }
    } else {
      this.debug('not found userId in session, creating a new user');
      // TODO refactor new user creation and linking sessions
      httpRequest.user = UserStore.newUserFromHttpRequest(httpRequest);
    }

    // Temporary setting of userId via query parameter
    var KEY = 'group';
    if (httpRequest.query && httpRequest.query[KEY]) {
      var groupId = ('' + httpRequest.query[KEY]).substring(0, 10);
      httpRequest.user.__setGroupId(groupId);
    }

    //For some resources (such as index.html) add chromeframe support
    //res.header('X-UA-Compatible', 'IE=Edge,chrome=1');
    //res.header('P3P', 'policyref="/w3c/p3p.xml", CP="IDC DSP COR ADM DEVi TAIi PSA PSD IVAi IVDi CONi HIS OUR IND CNT"');
    //Could prevent framing
    //res.setHeader('x-frame-options', ...);
    //And in SSL, could add
    //res.setHeader("Strict-Transport-Security", "max-age=10886400; includeSubdomains");
    //For some resources, kill cache
    //res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    //res.header('Cache-Control', 'no-cache, must-revalidate');
    //next();

    next();
  }



};


/**
 * Prepare this.channelFrontendTemplate function
 */
function loadChannelFrontendTemplate(channel) {
  // TODO differentiate for some old mobile clients etc
  var indexHtml = fs.readFileSync(join(__dirname, 'index.html'), 'utf-8');
  // TODO proper scheme for enabling/disabling client html minification
  // env dev/prod vs debug ns vs specific flags
  // For now minify always, firebug and chrome dev tools show prettyfied dom
  indexHtml = minifyHtml(indexHtml);
  channel.channelFrontendTemplate = template(indexHtml);
};

function loadDemoFrontendTemplate(channel) {
  // TODO differentiate for some old mobile clients etc
  var indexHtml = fs.readFileSync(join(__dirname, 'demo.html'), 'utf-8');
  // TODO proper scheme for enabling/disabling client html minification
  // env dev/prod vs debug ns vs specific flags
  // For now minify always, firebug and chrome dev tools show prettyfied dom
  indexHtml = minifyHtml(indexHtml);
  channel.demoFrontendTemplate = template(indexHtml);
};

function loadCeilingFrontendTemplate(channel) {
  var indexHtml = fs.readFileSync(join(__dirname, 'ceiling.html'), 'utf-8');
  indexHtml = minifyHtml(indexHtml);
  channel.ceilingFrontendTemplate = template(indexHtml);
}

/**
 * Express route intercepting /site/channel/ (or /site for default channel)
 */
function onHttpRequest(httpRequest, httpResponse, next) {
  // Serves template
  this.debug('serve %s', this.config.channelRoute);

  var user = httpRequest.user;

  // Get current config
  var channelFrontendConfig = this.getChannelFrontendConfigForUser(user);

  var blockFrontendAssetUrls = channelFrontendConfig.blockFrontendAssetUrls;

  var blockFrontendData = this.getBlockFrontendData(httpRequest);

  var blockCSS = [];
  var blockJS = [];
  var blockData = [];
  // Maybe one day we can render block html on the server to right place
  //var blockHTML = [];

  // TODO perhaps use forceFresh = true always
  var forceFresh = DEV ? '?' + channelFrontendConfig.version : '';

  // TODO prioritize css over js, and active over loaded
  for (var blocktype in blockFrontendAssetUrls) {
    var assets = blockFrontendAssetUrls[blocktype];
    if (!assets) continue;
    if (assets.css) {
      assets.css.forEach(function(style) {
        var url = style.url;
        if (!style.ext) {
          url = url + forceFresh;
        }
        // Assumes even webfonts don't need specific type="text/css"
        var tag = '<link rel="stylesheet" href="' + url + '">';
        if (style.ltIE7) {
          tag = '<!--[if lt IE 7]>' + tag + '<![endif]-->';
        } else if (style.IE7) {
          tag = '<!--[if IE 7]>' + tag + '<![endif]-->';
        } else if (style.ltIE8) {
          tag = '<!--[if lt IE 8]>' + tag + '<![endif]-->';
        } else if (style.IE8) {
          tag = '<!--[if IE 8]>' + tag + '<![endif]-->';
        } else if (style.ltIE9) {
          tag = '<!--[if lt IE 9]>' + tag + '<![endif]-->';
        } else if (style.gtIE8) {
          tag = '<!--[if gt IE 8]><!-->' + tag + '<!--<![endif]-->';
        }
        blockCSS.push(tag);
      });
    }
    if (assets.js) {
      assets.js.forEach(function(script) {
        var url = script.url;
        if (!script.ext) {
          url = url + forceFresh;
        }
        var tag = '<script src="' + url + '"></script>';
        if (script.ltIE7) {
          tag = '<!--[if lt IE 7]>' + tag + '<![endif]-->';
        } else if (script.IE7) {
          tag = '<!--[if IE 7]>' + tag + '<![endif]-->';
        } else if (script.ltIE8) {
          tag = '<!--[if lt IE 8]>' + tag + '<![endif]-->';
        } else if (script.IE8) {
          tag = '<!--[if IE 8]>' + tag + '<![endif]-->';
        } else if (script.ltIE9) {
          tag = '<!--[if lt IE 9]>' + tag + '<![endif]-->';
        } else if (script.gtIE8) {
          tag = '<!--[if gt IE 8]><!-->' + tag + '<!--<![endif]-->';
        }
        blockJS.push(tag);
      });
    }
  }

  for (var blockId in blockFrontendData) {
    var data = blockFrontendData[blockId];
    if (!data) continue;
    if (typeof data !== 'string') continue;
    blockData.push(data);
  }
  blockJS.push('<script>' + blockData.join('\n') + ';require("core");</script>');

  // Temporary hack for scatter plot
  if (this.type === 'screen') {
    blockJS.push('<script src="assets/scatterFiles/scatterassets.global.min.js"></script>');
  }

  // Set initial config, it starts everything.
  var channelInit = "<script>require('core').init(" +
    JSON.stringify(channelFrontendConfig) +
    ");</script>";

  var PAGE = {
    SITEROUTE: channelFrontendConfig.siteRoute,
    CHANNELROUTE: channelFrontendConfig.channelRoute,
    CHANNELTITLE: channelFrontendConfig.title,
    VERSION: channelFrontendConfig.version,
    CHANNELSTYLES: blockCSS.join(''),
    CHANNELSCRIPTS: blockJS.join(''),
    CHANNELINIT: channelInit
  };

  PAGE.CONTENT = '';

  // TODO could generate block static views for static channels
  // Problem is that client code & templates assume globals for building,
  // not easy to set.

  httpResponse.send(this.channelFrontendTemplate(PAGE));
};

/**
 * Exports
 */

var ChannelConstructorHttp = {
  init: setup,
  Mixin: Mixin
};

module.exports = ChannelConstructorHttp;
