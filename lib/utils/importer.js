"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.importProfiler = importProfiler;
exports.resolveImportPath = resolveImportPath;

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var fs = require('fs');

var path = require('path');

var parser = require('@solidity-parser/parser');
/**
 * Given a list of solidity files, returns a list of imports to those files, and all files imported
 * by those files.  For security, this function throws if a path is resolved to a higher level than 
 * projectDir, and it not a file name ending in .sol 
 *
 * @param      {Array}   files          files to parse for imports
 * @param      {string}  projectDir     the highest level directory accessible
 * @param      {Set}     importedFiles  files already parsed 
 * @return     {Array}   importPaths    A list of importPaths 
 */


function importProfiler(files) {
  var projectDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : process.cwd();
  var importedFiles = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Set();

  var _iterator = _createForOfIteratorHelper(files),
      _step;

  try {
    var _loop = function _loop() {
      var file = _step.value;
      // Checks for a valid solidity file
      file = path.resolve(projectDir, file);

      if (file.indexOf(projectDir) != 0) {
        throw new Error("\nImports must be found in sub dirs of the project directory.\n      project dir: ".concat(projectDir, "\n      path: ").concat(file, "\n"));
      }

      var content = void 0;

      try {
        content = fs.readFileSync(file).toString('utf-8');
      } catch (e) {
        if (e.code === 'EISDIR') {
          console.error("Skipping directory ".concat(file));
          return {
            v: importedFiles
          }; // empty Set
        } else {
          throw e;
        }
      } // Having verified that it indeed is a solidity file, add it to set of importedFiles


      importedFiles.add(file);

      var ast = function () {
        try {
          return parser.parse(content, {
            tolerant: true
          });
        } catch (err) {
          console.error("\nError found while parsing the following file: ".concat(file, "\n"));
          throw err;
        }
      }(); // create an array to hold the imported files


      var newFiles = [];
      parser.visit(ast, {
        ImportDirective: function ImportDirective(node) {
          var newFile = resolveImportPath(file, node.path, projectDir);
          if (!importedFiles.has(newFile)) newFiles.push(newFile);
        }
      }); // Run through the array of files found in this file

      module.exports.importProfiler(newFiles, projectDir, importedFiles);
    };

    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _ret = _loop();

      if (_typeof(_ret) === "object") return _ret.v;
    } // Convert the set to an array for easy consumption

  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  var importedFilesArray = Array.from(importedFiles);
  return importedFilesArray;
} /// Takes a filepath, and an import path found within it, and finds the corresponding source code
/// file. Throws an error if the resolved path is not a file.
///
/// @param      {string}  baseFilePath      The base file path
/// @param      {string}  importedFilePath  The imported file path
/// @param      {string}  projectDir        The top-most directory we will search in
///


function resolveImportPath(baseFilePath, importedFilePath) {
  var projectDir = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : process.cwd();
  var topmostDirArray = projectDir.split(path.sep);
  var resolvedPath;
  var baseDirPath = path.dirname(baseFilePath); // if it's a relative or absolute path:

  if (importedFilePath.slice(0, 1) === '.' || importedFilePath.slice(0, 1) === '/') {
    resolvedPath = path.resolve(baseDirPath, importedFilePath); // else it's most likely a special case using a remapping to node_modules dir in Truffle
  } else {
    // we use a string and not the array alone because of different windows and UNIX path roots
    var currentDir = path.resolve(baseDirPath, '..');
    var currentDirArray = baseDirPath.split(path.sep);
    var currentDirName = currentDirArray.pop();
    var nodeModulesDir = ''; // while (currentDirName != 'contracts') {

    while (!fs.readdirSync(currentDir).includes('node_modules') && !nodeModulesDir) {
      // since we already know the current file is inside the project dir we can check if the
      // folder array length for the current dir is smaller than the top-most one, i.e. we are 
      // still inside the project dir. If not, throw
      if (topmostDirArray.length >= currentDirArray.length) {
        throw new Error("Import statement seems to be a Truffle \"'node_modules' remapping\" but no 'contracts' truffle dir could be found in the project's child dirs. Have you ran 'npm install', already?\n        project dir: ".concat(projectDir, "\n        path: ").concat(currentDir));
      } // if we still aren't in a folder containing 'node_modules' go up one level


      currentDirName = currentDirArray.pop();
      currentDir = path.resolve(currentDir, '..');
    } // if we've reached this point, then we have found the dir containing node_modules


    nodeModulesDir = path.join(currentDir, 'node_modules'); // join it all to get the file path

    resolvedPath = path.join(nodeModulesDir, importedFilePath);
  } // verify that the resolved path is actually a file


  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    throw new Error("Import path (".concat(resolvedPath, ") not resolved to a file"));
  }

  return resolvedPath;
}