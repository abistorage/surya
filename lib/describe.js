"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.describe = describe;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var fs = require('fs');

var parser = require('@solidity-parser/parser');

var importer = require('../lib/utils/importer');

function describe(files) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var noColorOutput = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (files.length === 0) {
    throw new Error("\nNo files were specified for analysis in the arguments. Bailing...\n");
  } // make the files array unique by typecasting them to a Set and back
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

      parser.visit(ast, {
        ContractDefinition: function ContractDefinition(node) {
          var name = node.name;
          var bases = node.baseContracts.map(function (spec) {
            return spec.baseName.namePath;
          }).join(', ');
          bases = bases.length ? noColorOutput ? "(".concat(bases, ")") : "(".concat(bases, ")").gray : '';
          var specs = '';

          if (node.kind === 'library') {
            specs += noColorOutput ? '[Lib]' : '[Lib]'.yellow;
          } else if (node.kind === 'interface') {
            specs += noColorOutput ? '[Int]' : '[Int]'.blue;
          }

          console.log(" + ".concat(specs, " ").concat(name, " ").concat(bases));
        },
        'ContractDefinition:exit': function ContractDefinitionExit(node) {
          console.log('');
        },
        FunctionDefinition: function FunctionDefinition(node) {
          var name;

          if (node.isConstructor) {
            name = noColorOutput ? '<Constructor>' : '<Constructor>'.gray;
          } else if (node.isFallback) {
            name = noColorOutput ? '<Fallback>' : '<Fallback>'.gray;
          } else if (node.isReceiveEther) {
            name = noColorOutput ? '<Receive Ether>' : '<Receive Ether>'.gray;
          } else {
            name = node.name;
          }

          var spec = '';

          if (node.visibility === 'public' || node.visibility === 'default') {
            spec += noColorOutput ? '[Pub]' : '[Pub]'.green;
          } else if (node.visibility === 'external') {
            spec += noColorOutput ? '[Ext]' : '[Ext]'.blue;
          } else if (node.visibility === 'private') {
            spec += noColorOutput ? '[Prv]' : '[Prv]'.red;
          } else if (node.visibility === 'internal') {
            spec += noColorOutput ? '[Int]' : '[Int]'.gray;
          }

          var payable = '';

          if (node.stateMutability === 'payable') {
            payable = noColorOutput ? ' ($)' : ' ($)'.yellow;
          }

          var mutating = '';

          if (!node.stateMutability) {
            mutating = noColorOutput ? ' #' : ' #'.red;
          }

          var modifiers = '';

          var _iterator2 = _createForOfIteratorHelper(node.modifiers),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var m = _step2.value;
              if (!!modifiers) modifiers += ',';
              modifiers += m.name;
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }

          console.log("    - ".concat(spec, " ").concat(name).concat(payable).concat(mutating));

          if (!!modifiers) {
            console.log("       - modifiers: ".concat(modifiers));
          }
        }
      });
    };

    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _ret = _loop();

      if (_ret === "continue") continue;
    } // Print a legend for symbols being used

  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  var mutationSymbol = noColorOutput ? ' #' : ' #'.red;
  var payableSymbol = noColorOutput ? ' ($)' : ' ($)'.yellow;
  console.log("\n".concat(payableSymbol, " = payable function\n").concat(mutationSymbol, " = non-constant function\n  "));
}