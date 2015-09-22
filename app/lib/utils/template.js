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

var debug = require('debug')('io:utils:template'); debug('module loading');

var _ = require('underscore');

/**
 * Templating from underscore with delimiters set and $$ object
 * For now the templates still need underscore in the browser for _.escape
 * function
 */

// JavaScript micro-templating, similar to John Resig's implementation.
// Underscore templating handles arbitrary delimiters, preserves whitespace,
// and correctly escapes quotes within interpolated code.
module.exports = function template(text, data) {

  var render;
  var settings = {
    escape      : /\{=([\s\S]+?)\}/g,
    interpolate : /\{!=([\s\S]+?)\}/g,
    evaluate    : /<\?([\s\S]+?)\?>/g
  };

  // Combine delimiters into one regular expression via alternation.
  var matcher = new RegExp([
    (settings.escape).source,
    (settings.interpolate).source,
    (settings.evaluate).source
  ].join('|') + '|$', 'g');

  // Compile the template source, escaping string literals appropriately.
  var index = 0;
  var source = "__p+='";
  text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
    source += text.slice(index, offset)
      .replace(escaper, function(match) { return '\\' + escapes[match]; });

    if (escape) {
      source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
    }
    if (interpolate) {
      source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
    }
    if (evaluate) {
      source += "';\n" + evaluate + "\n__p+='";
    }
    index = offset + match.length;
    return match;
  });
  source += "';\n";

  // If a variable is not specified, place data values in local scope.
  //if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

  source = "var __t,__p='',__j=Array.prototype.join," +
    "print=function(){__p+=__j.call(arguments,'');};\n" +
    source + "return __p;\n";

  try {
    render = new Function('$$', '_', source);
  } catch (e) {
    e.source = source;
    throw e;
  }

  if (data) return render(data, _);
  var template = function(data) {
    return render.call(this, data, _);
  };

  // Provide the compiled function source as a convenience for precompilation.
  template.source = 'function($$){\n' + source + '}';

  return template;
};

// Certain characters need to be escaped so that they can be put into a
// string literal.
var escapes = {
  "'":      "'",
  '\\':     '\\',
  '\r':     'r',
  '\n':     'n',
  '\t':     't',
  '\u2028': 'u2028',
  '\u2029': 'u2029'
};

var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

// TODO insert _.escape function somewhere as it is used in the complied
// template

//Escaping needs:
//Attribute names: discard invalid
//Attribute values: & + "
//Text content: & + < + >
