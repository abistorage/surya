"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mdreport = mdreport;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var fs = require('fs');

var parser = require('@solidity-parser/parser');

var sha1File = require('sha1-file');

var importer = require('../lib/utils/importer');

function mdreport(infiles) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var content = '';

  if (infiles.length === 0) {
    throw new Error("\nNo files were specified for analysis in the arguments. Bailing...\n");
  }

  var modifiers = [];
  var added = [];
  var filesTable = "\n|  File Name  |  SHA-1 Hash  |\n|-------------|--------------|\n";
  var contractsTable = "\n|  Contract  |         Type        |       Bases      |                  |                 |\n|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|\n|     \u2514      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |\n"; // make the files array unique by typecasting them to a Set and back
  // this is not needed in case the importer flag is on, because the
  // importer module already filters the array internally

  if (!options.contentsInFilePath && options.importer) {
    infiles = importer.importProfiler(infiles);
  } else {
    infiles = _toConsumableArray(new Set(infiles));
  }

  var _iterator = _createForOfIteratorHelper(infiles),
      _step;

  try {
    var _loop = function _loop() {
      var file = _step.value;
      filesTable += "| ".concat(file, " | ").concat(sha1File(file), " |\n");

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

      isPublic = false;
      doesModifierExist = false;
      isConstructor = false;
      parser.visit(ast, {
        ModifierInvocation: function ModifierInvocation(node) {
          if (modifiers.indexOf(node.name) == -1) {
            modifiers.push(node.name);
          }
        },
        ModifierDefinition: function ModifierDefinition(node) {
          if (modifiers.indexOf(node.name) == -1) {
            modifiers.push(node.name);
          }
        }
      });
      parser.visit(ast, {
        ContractDefinition: function ContractDefinition(node) {
          var name = node.name;
          var bases = node.baseContracts.map(function (spec) {
            return spec.baseName.namePath;
          }).join(', ');
          var specs = '';

          if (node.kind === 'library') {
            specs += 'Library';
          } else if (node.kind === 'interface') {
            specs += 'Interface';
          } else {
            specs += 'Implementation';
          }

          contractsTable += "||||||\n| **".concat(name, "** | ").concat(specs, " | ").concat(bases, " |||\n");
        },
        FunctionDefinition: function FunctionDefinition(node) {
          var name;
          isPublic = false;
          doesModifierExist = false;
          isConstructor = false;

          if (node.isConstructor) {
            name = '<Constructor>';
          } else if (node.isFallback) {
            name = '<Fallback>';
          } else if (node.isReceiveEther) {
            name = '<Receive Ether>';
          } else {
            name = node.name;
          }

          var spec = '';

          if (node.visibility === 'public' || node.visibility === 'default') {
            spec += 'Public ❗️';
            isPublic = true;
          } else if (node.visibility === 'external') {
            spec += 'External ❗️';
            isPublic = true;
          } else if (node.visibility === 'private') {
            spec += 'Private 🔐';
          } else if (node.visibility === 'internal') {
            spec += 'Internal 🔒';
          }

          var payable = '';

          if (node.stateMutability === 'payable') {
            payable = '💵';
          }

          var mutating = '';

          if (!node.stateMutability) {
            mutating = '🛑';
          }

          contractsTable += "| \u2514 | ".concat(name, " | ").concat(spec, " | ").concat(mutating, " ").concat(payable, " |");
        },
        'FunctionDefinition:exit': function FunctionDefinitionExit(node) {
          if (!isConstructor && isPublic && !doesModifierExist) {
            contractsTable += 'NO❗️';
          } else if (isPublic && options.negModifiers) {
            for (var i = 0; i < modifiers.length; i++) {
              if (added.indexOf(modifiers[i]) == -1) {
                contractsTable += ' ~~' + modifiers[i] + '~~ ';
              }
            }

            added = [];
          }

          contractsTable += " |\n";
        },
        ModifierInvocation: function ModifierInvocation(node) {
          doesModifierExist = true;
          contractsTable += " ".concat(node.name);
          added.push(node.name);
        }
      });
    };

    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var isPublic;
      var doesModifierExist;
      var isConstructor;

      var _ret = _loop();

      if (_ret === "continue") continue;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  var reportContents = "".concat('#'.repeat(options.deepness), " S\u016Brya's Description Report\n\n").concat('#'.repeat(options.deepness + 1), " Files Description Table\n\n").concat(filesTable, "\n\n").concat('#'.repeat(options.deepness + 1), " Contracts Description Table\n\n").concat(contractsTable, "\n\n").concat('#'.repeat(options.deepness + 1), " Legend\n\n|  Symbol  |  Meaning  |\n|:--------:|-----------|\n|    \uD83D\uDED1    | Function can modify state |\n|    \uD83D\uDCB5    | Function is payable |\n");
  return reportContents;
}