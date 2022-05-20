"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inheritance = inheritance;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var fs = require('fs');

var parser = require('@solidity-parser/parser');

var graphviz = require('graphviz');

var _require = require('c3-linearization'),
    linearize = _require.linearize;

var importer = require('../lib/utils/importer');

function inheritance(files) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (files.length === 0) {
    throw new Error("\nNo files were specified for analysis in the arguments. Bailing...\n");
  }

  var digraph = graphviz.digraph('G');
  digraph.set('ratio', 'auto');
  digraph.set('page', '40'); // make the files array unique by typecasting them to a Set and back
  // this is not needed in case the importer flag is on, because the 
  // importer module already filters the array internally

  if (!options.contentsInFilePath && options.importer) {
    files = importer.importProfiler(files);
  } else {
    files = _toConsumableArray(new Set(files));
  }

  var _iterator = _createForOfIteratorHelper(files),
      _step;

  try {
    var _loop = function _loop() {
      var file = _step.value;
      var content = void 0;

      if (!options.contentsInFilePath) {
        try {
          content = fs.readFileSync(file).toString('utf-8');
        } catch (e) {
          if (e.code === 'EISDIR') {
            console.error("Skipping directory ".concat(file));
            return "continue";
          } else {
            throw e;
          }
        }
      } else {
        content = file;
      }

      var ast = function () {
        try {
          return parser.parse(content);
        } catch (err) {
          if (!options.contentsInFilePath) {
            console.error("\nError found while parsing the following file: ".concat(file, "\n"));
          } else {
            console.error("\nError found while parsing one of the provided files\n");
          }

          throw err;
        }
      }();

      var contractName = null;
      var dependencies = {};
      parser.visit(ast, {
        ContractDefinition: function ContractDefinition(node) {
          contractName = node.name;

          if (!digraph.getNode(contractName)) {
            digraph.addNode(contractName);
          }

          dependencies[contractName] = node.baseContracts.map(function (spec) {
            return spec.baseName.namePath;
          });

          var _iterator2 = _createForOfIteratorHelper(dependencies[contractName]),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var dep = _step2.value;

              if (!digraph.getNode(dep)) {
                digraph.addNode(dep);
              }

              digraph.addEdge(contractName, dep);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      });
      dependencies = linearize(dependencies, {
        reverse: true
      });
    };

    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _ret = _loop();

      if (_ret === "continue") continue;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return digraph.to_dot();
}