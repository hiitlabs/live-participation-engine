functions = {}

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
module.exports = exports;
