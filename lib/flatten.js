"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatten = flatten;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var fs = require('fs');

var parser = require('@solidity-parser/parser');

var _require = require('./utils/importer'),
    resolveImportPath = _require.resolveImportPath;

function flatten(files) {
  if (files.length === 0) {
    console.log('No files were specified for analysis in the arguments. Bailing...');
    return;
  } // create a set of paths already inserted to pass while flattening each file, to avoid duplication


  var visitedPaths = new Set();
  var flat = '';

  var _iterator = _createForOfIteratorHelper(files),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var file = _step.value;

      if (visitedPaths.has(file)) {
        continue;
      }

      var result = replaceImportsWithSource(file, visitedPaths);
      flat += result.flattenedContent;
      flat += '\n\n';
      visitedPaths.add(result.visitedPaths);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  console.log(flat);
}
/**  
 * Given a solidity file, returns the content with imports replaced by source code
 * 
 * @param      {string}  file  The file
 * @param      {Array}   visitedPaths     Paths already resolved that should be skipped if seen again
 * @return     {object}  { resolvedContent: A string with imports replaced by source code, visitedPaths }
 */


function replaceImportsWithSource(file) {
  var visitedPaths = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Set();
  var content;

  try {
    content = fs.readFileSync(file).toString('utf-8');
  } catch (e) {
    if (e.code === 'EISDIR') {
      console.error("Skipping directory ".concat(file));
    } else {
      throw e;
    }
  } // prepend the code with a space and comment helpful for the flattened output


  content = "// The following code is from flattening this file: ".concat(file, "\n").concat(content);

  var ast = function () {
    try {
      return parser.parse(content, {
        loc: true
      });
    } catch (err) {
      console.error("\nError found while parsing the following file: ".concat(file, "\n"));
      throw err;
    }
  }();

  var importsAndLocations = [];
  parser.visit(ast, {
    ImportDirective: function ImportDirective(node) {
      var importPath = resolveImportPath(file, node.path);
      importsAndLocations.push({
        importPath: importPath,
        location: node.loc
      });
    }
  });
  var contentLines = content.split('\n');

  for (var _i = 0, _importsAndLocations = importsAndLocations; _i < _importsAndLocations.length; _i++) {
    var el = _importsAndLocations[_i];
    // arrays are 0-indexed, file lines are 1-indexed so the statement is at `start.line - 1`
    var importStatementText = contentLines[el.location.start.line - 1];

    if (!visitedPaths.has(el.importPath)) {
      // first time handling this import path, comment it out, and replace with flattened source code
      contentLines[el.location.start.line - 1] = "// The following code is from flattening this import statement in: ".concat(file, "\n// ").concat(importStatementText, "\n").concat(replaceImportsWithSource(el.importPath, visitedPaths).flattenedContent);
    } else {
      // we've already visited this path, just comment out the import statement
      contentLines[el.location.start.line - 1] = "// Skipping this already resolved import statement found in ".concat(file, " \n// ").concat(importStatementText);
      visitedPaths.add(el.importPath);
    }
  }

  visitedPaths.add(file);
  return {
    flattenedContent: contentLines.join('\n'),
    visitedPaths: visitedPaths
  };
}