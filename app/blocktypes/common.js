functions = {}

functions.trimWhitespace = function(str) {
  str = str.replace(/\s/g, ' '); // convert all non-printable chars to a space
  str = str.replace(/^\s+|\s+$/g, ''); // begin end
  str = str.replace(/\s\s+/g, ' '); // middle
  return str;
}

exports.functions = functions;
module.exports = exports;
