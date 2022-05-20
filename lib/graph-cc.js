"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultColorSchemeDark = exports.defaultColorScheme = void 0;
exports.graphCC = graphCC;

var _os = require("os");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var parserHelpers = require('./utils/parserHelpers');

var utils = require('./utils/utils');

var fs = require('fs');

var parser = require('@solidity-parser/parser');

var graphviz = require('graphviz');

var _require = require('c3-linearization'),
    linearize = _require.linearize;

function edgeCountToColor(count, max) {
  if (count > max) count = max;
  count = Math.ceil(count / max * 100);
  return "#fc".concat(Number(119 - count).toString(16), "55");
}

var defaultColorScheme = {
  digraph: {
    bgcolor: undefined,
    nodeAttribs: {},
    edgeAttribs: {}
  },
  visibility: {
    "public": "green",
    external: "blue",
    "private": "red",
    internal: "white"
  },
  nodeType: {
    modifier: "yellow"
  },
  call: {
    "default": "orange",
    regular: "green",
    "this": "green"
  },
  contract: {
    defined: {
      bgcolor: "lightgray",
      color: "lightgray"
    },
    undefined: {
      bgcolor: undefined,
      color: "lightgray"
    }
  }
};
exports.defaultColorScheme = defaultColorScheme;
var defaultColorSchemeDark = {
  digraph: {
    bgcolor: "#2e3e56",
    nodeAttribs: {
      style: "filled",
      fillcolor: "#edad56",
      color: "#edad56",
      penwidth: "3"
    },
    edgeAttribs: {
      color: "#fcfcfc",
      penwidth: "2",
      fontname: "helvetica Neue Ultra Light"
    }
  },
  visibility: {
    isFilled: true,
    "public": "#FF9797",
    external: "#ffbdb9",
    "private": "#edad56",
    internal: "#f2c383"
  },
  nodeType: {
    isFilled: false,
    shape: "doubleoctagon",
    modifier: "#1bc6a6",
    payable: "brown"
  },
  call: {
    "default": "white",
    regular: "#1bc6a6",
    "this": "#80e097"
  },
  contract: {
    defined: {
      bgcolor: "#445773",
      color: "#4f6992",
      fontcolor: "#f0f0f0",
      style: "filled"
    },
    undefined: {
      bgcolor: "#3b4b63",
      color: "#4f6992",
      fontcolor: "#f0f0f0",
      style: "rounded,dashed"
    }
  }
};
exports.defaultColorSchemeDark = defaultColorSchemeDark;

function graphCC(files) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (files.length === 0) {
    console.log('No files were specified for analysis in the arguments. Bailing...');
    return;
  }

  var colorScheme = options.hasOwnProperty('colorScheme') ? options.colorScheme : defaultColorScheme;
  var edgeCount = {}; // from->to: count 

  var edges = new Array();
  var digraph = graphviz.digraph('G');
  digraph.set('ratio', 'auto');
  digraph.set('page', '100');
  digraph.set('compound', 'true');
  colorScheme.digraph.bgcolor && digraph.set('bgcolor', colorScheme.digraph.bgcolor);

  for (var i in colorScheme.digraph.nodeAttribs) {
    digraph.setNodeAttribut(i, colorScheme.digraph.nodeAttribs[i]);
  }

  for (var _i in colorScheme.digraph.edgeAttribs) {
    digraph.setEdgeAttribut(_i, colorScheme.digraph.edgeAttribs[_i]);
  } // make the files array unique by typecastign them to a Set and back
  // this is not needed in case the importer flag is on, because the 
  // importer module already filters the array internally


  if (options.importer) {
    files = importer.importProfiler(files);
  } else {
    files = _toConsumableArray(new Set(files));
  } // initialize vars that persist over file parsing loops


  var userDefinedStateVars = {};
  var dependencies = {};
  var fileASTs = new Array();

  var _iterator = _createForOfIteratorHelper(files),
      _step;

  try {
    var _loop2 = function _loop2() {
      var file = _step.value;
      var content = void 0;

      try {
        content = fs.readFileSync(file).toString('utf-8');
      } catch (e) {
        if (e.code === 'EISDIR') {
          console.error("Skipping directory ".concat(file));
          return "continue";
        } else throw e;
      }

      var ast = parser.parse(content);
      fileASTs.push(ast);
      var contractName = null;
      var cluster = null;
      parser.visit(ast, {
        ContractDefinition: function ContractDefinition(node) {
          contractName = node.name;
          var shape = "egg";
          var kind = "";

          if (node.kind == "interface") {
            kind = "  (iface)";
            shape = "rarrow";
          } else if (node.kind == "library") {
            kind = "  (lib)";
            shape = "box3d";
          }

          userDefinedStateVars[contractName] = {};

          if (!(cluster = digraph.getNode(contractName))) {
            cluster = digraph.addNode(contractName);
            cluster.set('shape', shape);
            cluster.set('label', contractName + kind);
            cluster.set('color', colorScheme.contract.defined.color);

            if (colorScheme.contract.defined.fontcolor) {
              cluster.set('fontcolor', colorScheme.contract.defined.fontcolor);
            }

            if (colorScheme.contract.defined.style) {
              cluster.set('style', colorScheme.contract.defined.style || "filled");
              cluster.set('fillcolor', colorScheme.contract.defined.bgcolor);
            } else cluster.set('style', 'filled'); //colorScheme.contract.defined.bgcolor && cluster.set('bgcolor', colorScheme.contract.defined.bgcolor)

          } else {
            if (colorScheme.contract.defined.style) cluster.set('style', colorScheme.contract.defined.style);else cluster.set('style', 'filled');
          }

          dependencies[contractName] = node.baseContracts.map(function (spec) {
            return spec.baseName.namePath;
          });
        },
        StateVariableDeclaration: function StateVariableDeclaration(node) {
          var _iterator4 = _createForOfIteratorHelper(node.variables),
              _step4;

          try {
            for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
              var variable = _step4.value;

              if (parserHelpers.isUserDefinedDeclaration(variable)) {
                userDefinedStateVars[contractName][variable.name] = variable.typeName.namePath;
              }
            }
          } catch (err) {
            _iterator4.e(err);
          } finally {
            _iterator4.f();
          }
        }
      });
    };

    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _ret = _loop2();

      if (_ret === "continue") continue;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  dependencies = linearize(dependencies, {
    reverse: true
  });

  var _loop = function _loop() {
    var ast = _fileASTs[_i2];
    var contractName = null;
    var cluster = null;
    parser.visit(ast, {
      ContractDefinition: function ContractDefinition(node) {
        contractName = node.name;
        cluster = digraph.getCluster("\"".concat(contractName, "\""));
      }
    });
    var callingScope = null;
    var userDefinedLocalVars = {};
    var tempUserDefinedStateVars = {};
    parser.visit(ast, {
      ContractDefinition: function ContractDefinition(node) {
        contractName = node.name;

        var _iterator2 = _createForOfIteratorHelper(dependencies[contractName]),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var dep = _step2.value;
            Object.assign(tempUserDefinedStateVars, userDefinedStateVars[dep]);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        Object.assign(tempUserDefinedStateVars, userDefinedStateVars[contractName]);
      },
      'ContractDefinition:exit': function ContractDefinitionExit(node) {
        contractName = null;
        tempUserDefinedStateVars = {};
      },
      FunctionDefinition: function FunctionDefinition(node) {
        callingScope = contractName;
      },
      'FunctionDefinition:exit': function FunctionDefinitionExit(node) {
        callingScope = null;
        userDefinedLocalVars = {};
      },
      ModifierDefinition: function ModifierDefinition(node) {
        callingScope = contractName;
      },
      'ModifierDefinition:exit': function ModifierDefinitionExit(node) {
        callingScope = null;
      },
      ParameterList: function ParameterList(node) {
        var _iterator3 = _createForOfIteratorHelper(node.parameters),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var parameter = _step3.value;

            if (parserHelpers.isUserDefinedDeclaration(parameter)) {
              userDefinedLocalVars[parameter.name] = parameter.typeName.namePath;
            }
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      },
      VariableDeclaration: function VariableDeclaration(node) {
        if (callingScope && parserHelpers.isUserDefinedDeclaration(node)) {
          userDefinedLocalVars[node.name] = node.typeName.namePath;
        }
      },
      FunctionCall: function FunctionCall(node) {
        if (!callingScope) {
          // this is a function call outside of functions and modifiers, ignore for now
          return;
        }

        var expr = node.expression;
        var name;
        var localContractName = contractName;
        var opts = {
          color: colorScheme.call["default"]
        };

        if (parserHelpers.isRegularFunctionCall(node)) {
          opts.color = colorScheme.call.regular;
          name = expr.name;
          return; //ignore internal calls
        } else if (parserHelpers.isMemberAccess(node)) {
          var object;
          name = expr.memberName;

          if (expr.expression.hasOwnProperty('name')) {
            object = expr.expression.name; // checking if it is a member of `address` and pass along it's contents
          } else if (parserHelpers.isMemberAccessOfAddress(node)) {
            if (expr.expression.arguments[0].hasOwnProperty('name')) {
              object = expr.expression.arguments[0].name;
            } else {
              object = JSON.stringify(expr.expression.arguments);
            } // checking if it is a typecasting to a user-defined contract type

          } else if (parserHelpers.isAContractTypecast(node)) {
            if (expr.expression.expression.hasOwnProperty('name')) {
              object = expr.expression.expression.name;
            } else {
              return;
            }
          } else {
            return;
          }

          if (object === 'this') {
            opts.color = colorScheme.call["this"];
          } else if (object === 'super') {
            // "super" in this context is gonna be the 2nd element of the dependencies array
            // since the first is the contract itself
            localContractName = dependencies[localContractName][1];
          } else if (tempUserDefinedStateVars[object] !== undefined) {
            localContractName = tempUserDefinedStateVars[object];
          } else if (userDefinedLocalVars[object] !== undefined) {
            localContractName = userDefinedLocalVars[object];
          } else {
            localContractName = object;
          }
        } else {
          return;
        }

        var externalCluster;

        if (!(externalCluster = digraph.getNode(localContractName))) {
          externalCluster = digraph.addNode(localContractName);
          externalCluster.set('label', localContractName);
          externalCluster.set('color', colorScheme.contract.undefined.color);
          externalCluster.set('shape', 'box');

          if (colorScheme.contract.undefined.fontcolor) {
            externalCluster.set('fontcolor', colorScheme.contract.undefined.fontcolor);
          }

          if (colorScheme.contract.undefined.style) {
            externalCluster.set('style', colorScheme.contract.undefined.style || "filled");
            colorScheme.contract.undefined.bgcolor && externalCluster.set('fillcolor', colorScheme.contract.undefined.bgcolor);
          }
        }

        var edgeKey = "".concat(callingScope, "->").concat(localContractName);
        edgeCount[edgeKey] = (edgeCount[edgeKey] || 0) + 1;

        if (edgeCount[edgeKey] <= 1) {
          //only add first edge
          edges.push(digraph.addEdge(callingScope, localContractName, opts));
        }
      }
    });
  };

  for (var _i2 = 0, _fileASTs = fileASTs; _i2 < _fileASTs.length; _i2++) {
    _loop();
  }

  var edgeCountMax = Math.max.apply(Math, _toConsumableArray(Object.values(edgeCount)));
  edges.forEach(function (e) {
    var edgeKey = "".concat(e.nodeOne.id, "->").concat(e.nodeTwo.id);

    if (edgeCount[edgeKey] > 1) {
      e.set("color", edgeCountToColor(edgeCount[edgeKey], edgeCountMax));
      e.set("penwidth", Math.ceil(edgeCount[edgeKey] / edgeCountMax * 8)); //max 7
    }
  }); // This next block's purpose is to create a legend on the lower left corner
  // of the graph with color information.
  // We'll do it in dot, by hand, because it's overkill to do it programatically.
  // 
  // We'll have to paste this subgraph before the last curly bracket of the diagram

  var legendDotString = "\n\nrankdir=LR\nnode [shape=plaintext]\nsubgraph cluster_01 { \nlabel = \"Legend\";\nkey [label=<<table border=\"0\" cellpadding=\"2\" cellspacing=\"0\" cellborder=\"0\">\n  <tr><td align=\"right\" port=\"i1\">Internal Call</td></tr>\n  <tr><td align=\"right\" port=\"i2\">External Call</td></tr>\n  <tr><td align=\"right\" port=\"i3\">Defined Contract</td></tr>\n  <tr><td align=\"right\" port=\"i4\">Undefined Contract</td></tr>\n  </table>>]\nkey2 [label=<<table border=\"0\" cellpadding=\"2\" cellspacing=\"0\" cellborder=\"0\">\n  <tr><td port=\"i1\">&nbsp;&nbsp;&nbsp;</td></tr>\n  <tr><td port=\"i2\">&nbsp;&nbsp;&nbsp;</td></tr>\n  <tr><td port=\"i3\" bgcolor=\"".concat(colorScheme.contract.defined.bgcolor, "\">&nbsp;&nbsp;&nbsp;</td></tr>\n  <tr><td port=\"i4\">\n    <table border=\"1\" cellborder=\"0\" cellspacing=\"0\" cellpadding=\"7\" color=\"").concat(colorScheme.contract.undefined.color, "\">\n      <tr>\n       <td></td>\n      </tr>\n     </table>\n  </td></tr>\n  </table>>]\nkey:i1:e -> key2:i1:w [color=\"").concat(colorScheme.call.regular, "\"]\nkey:i2:e -> key2:i2:w [color=\"").concat(colorScheme.call["default"], "\"]\n}\n");
  var finalDigraph = utils.insertBeforeLastOccurrence(digraph.to_dot(), '}', legendDotString);
  return finalDigraph;
}