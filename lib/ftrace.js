"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ftrace = ftrace;

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var parserHelpers = require('./utils/parserHelpers');

var fs = require('fs');

var parser = require('@solidity-parser/parser');

var _require = require('c3-linearization'),
    linearize = _require.linearize;

var treeify = require('treeify');

var importer = require('../lib/utils/importer');

function ftrace(functionId, accepted_visibility, files) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var noColorOutput = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  if (files.length === 0) {
    throw new Error("\nNo files were specified for analysis in the arguments. Bailing...\n");
  }

  var _functionId$split = functionId.split('::', 2),
      _functionId$split2 = _slicedToArray(_functionId$split, 2),
      contractToTraverse = _functionId$split2[0],
      functionToTraverse = _functionId$split2[1];

  if (contractToTraverse === undefined || functionToTraverse === undefined) {
    throw new Error("\nYou did not provide the function identifier in the right format \"CONTRACT::FUNCTION\"\n");
  }

  if (accepted_visibility !== 'all' && accepted_visibility !== 'internal' && accepted_visibility !== 'external') {
    throw new Error("The \"".concat(accepted_visibility, "\" type of call to traverse is not known [all|internal|external]"));
  }

  if (options.jsonOutput) {
    noColorOutput = true;
  }

  var functionCallsTree = {}; // initialize vars that persist over file parsing loops

  var userDefinedStateVars = {};
  var stateVars = {};
  var dependencies = {};
  var functionsPerContract = {
    '0_global': []
  };
  var eventsPerContract = {
    '0_global': []
  };
  var structsPerContract = {
    '0_global': []
  };
  var contractUsingFor = {};
  var contractNames = ['0_global'];
  var modifiers = {};
  var functionDecorators = {};
  var fileASTs = [];
  var contractASTIndex = {}; // make the files array unique by typecasting them to a Set and back
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

      fileASTs.push(ast);
      var contractName = '0_global';
      parser.visit(ast, {
        ContractDefinition: function ContractDefinition(node) {
          contractName = node.name;
          contractNames.push(contractName);
          userDefinedStateVars[contractName] = {};
          stateVars[contractName] = {};
          functionsPerContract[contractName] = [];
          eventsPerContract[contractName] = [];
          structsPerContract[contractName] = [];
          contractUsingFor[contractName] = {};
          contractASTIndex[contractName] = fileASTs.length - 1;
          dependencies[contractName] = ['0_global'];
          dependencies[contractName] = node.baseContracts.map(function (spec) {
            return spec.baseName.namePath;
          });
        },
        'ContractDefinition:exit': function ContractDefinitionExit(node) {
          contractName = '0_global';
        },
        StateVariableDeclaration: function StateVariableDeclaration(node) {
          var _iterator8 = _createForOfIteratorHelper(node.variables),
              _step8;

          try {
            for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
              var variable = _step8.value;

              if (parserHelpers.isUserDefinedDeclaration(variable)) {
                userDefinedStateVars[contractName][variable.name] = variable.typeName.namePath;
              } else if (parserHelpers.isElementaryTypeDeclaration(variable)) {
                stateVars[contractName][variable.name] = variable.typeName.name;
              } else if (parserHelpers.isArrayDeclaration(variable)) {
                stateVars[contractName][variable.name] = variable.typeName.baseTypeName.namePath;
              } else if (parserHelpers.isMappingDeclaration(variable)) {
                stateVars[contractName][variable.name] = variable.typeName.valueType.name;
              }
            }
          } catch (err) {
            _iterator8.e(err);
          } finally {
            _iterator8.f();
          }
        },
        FunctionDefinition: function FunctionDefinition(node) {
          functionsPerContract[contractName].push(node.name);
        },
        EventDefinition: function EventDefinition(node) {
          eventsPerContract[contractName].push(node.name);
        },
        StructDefinition: function StructDefinition(node) {
          structsPerContract[contractName].push(node.name);
        },
        UsingForDeclaration: function UsingForDeclaration(node) {
          // Check if the using for declaration is targeting a specific type or all types with "*"
          var typeNameName = node.typeName != null ? node.typeName.name : '*';

          if (!contractUsingFor[contractName][typeNameName]) {
            contractUsingFor[contractName][typeNameName] = new Set([]);
          }

          contractUsingFor[contractName][typeNameName].add(node.libraryName);
        }
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

  dependencies = linearize(dependencies, {
    reverse: true
  });

  for (var _i2 = 0, _fileASTs = fileASTs; _i2 < _fileASTs.length; _i2++) {
    var ast = _fileASTs[_i2];
    constructPerFileFunctionCallTree(ast);
  } // END of file traversing


  var touched = {};
  var callTree = {};

  if (!functionCallsTree.hasOwnProperty(contractToTraverse)) {
    return "The ".concat(contractToTraverse, " contract is not present in the codebase.");
  } else if (!functionCallsTree[contractToTraverse].hasOwnProperty(functionToTraverse)) {
    return "The ".concat(functionToTraverse, " function is not present in ").concat(contractToTraverse, ".");
  }

  var seedKeyString = "".concat(contractToTraverse, "::").concat(functionToTraverse);
  touched[seedKeyString] = true;
  callTree[seedKeyString] = {}; // Call with seed

  constructCallTree(contractToTraverse, functionToTraverse, callTree[seedKeyString]);

  if (options.jsonOutput) {
    return callTree;
  } else {
    return treeify.asTree(callTree, true);
  }
  /****************************
   * 
   * INTERNAL FUNCTIONS BLOCK
   * 
   ****************************/


  function modifierCalls(modifierName, contractName) {
    if (dependencies.hasOwnProperty(contractName)) {
      var _iterator2 = _createForOfIteratorHelper(dependencies[contractName]),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var dep = _step2.value;

          if (!functionCallsTree.hasOwnProperty(dep)) {
            constructPerFileFunctionCallTree(fileASTs[contractASTIndex[dep]]);
          }

          if (!functionCallsTree.hasOwnProperty(dep)) {
            throw new Error("\nA referenced contract was not available in the provided list of contracts. This usually means that some imported file was left out of the files argument.\nYou can try to solve this automatically by using the '-i' flag or by including all the imported files manually.\n");
          }

          if (functionCallsTree[dep].hasOwnProperty(modifierName)) {
            return functionCallsTree[dep][modifierName];
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }

    return functionCallsTree[contractName].hasOwnProperty(modifierName) ? functionCallsTree[contractName][modifierName] : {};
  }

  function constructPerFileFunctionCallTree(ast) {
    var contractName = '0_global';
    var functionName = null;
    var userDefinedLocalVars = {};
    var localVars = {};
    var tempUserDefinedStateVars = {};
    var tempStateVars = {};
    parser.visit(ast, {
      ContractDefinition: function ContractDefinition(node) {
        contractName = node.name;
        functionCallsTree[contractName] = {};
        modifiers[contractName] = {};

        var _iterator3 = _createForOfIteratorHelper(dependencies[contractName]),
            _step3;

        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var dep = _step3.value;
            Object.assign(tempUserDefinedStateVars, userDefinedStateVars[dep]);
            Object.assign(tempStateVars, stateVars[dep]);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }

        Object.assign(tempUserDefinedStateVars, userDefinedStateVars[contractName]);
        Object.assign(tempStateVars, stateVars[contractName]);
      },
      'ContractDefinition:exit': function ContractDefinitionExit(node) {
        contractName = '0_global';
        tempUserDefinedStateVars = {};
        tempStateVars = {};
      },
      FunctionDefinition: function FunctionDefinition(node) {
        if (node.isConstructor) {
          functionName = '<Constructor>';
        } else if (node.isFallback) {
          functionName = '<Fallback>';
        } else if (node.isReceiveEther) {
          functionName = '<Receive Ether>';
        } else {
          functionName = node.name;
        }

        var spec = '';

        if (node.visibility === 'public' || node.visibility === 'default') {
          spec += '[Pub] ❗️';
        } else if (node.visibility === 'external') {
          spec += '[Ext] ❗️';
        } else if (node.visibility === 'private') {
          spec += '[Priv] 🔐';
        } else if (node.visibility === 'internal') {
          spec += '[Int] 🔒';
        }

        var payable = '';

        if (node.stateMutability === 'payable') {
          payable = '💵';
        }

        var mutating = '';

        if (!node.stateMutability) {
          mutating = '🛑';
        }

        functionDecorators[functionName] = " | ".concat(spec, "  ").concat(mutating, " ").concat(payable);
        functionCallsTree[contractName][functionName] = {};
        modifiers[contractName][functionName] = [];
      },
      'FunctionDefinition:exit': function FunctionDefinitionExit(node) {
        functionName = null;
        userDefinedLocalVars = {};
        localVars = {};
      },
      ModifierDefinition: function ModifierDefinition(node) {
        functionName = node.name;
        functionCallsTree[contractName][functionName] = {};
      },
      'ModifierDefinition:exit': function ModifierDefinitionExit(node) {
        functionName = null;
      },
      ModifierInvocation: function ModifierInvocation(node) {
        modifiers[contractName][functionName].push(node.name);
      },
      ParameterList: function ParameterList(node) {
        var _iterator4 = _createForOfIteratorHelper(node.parameters),
            _step4;

        try {
          for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
            var parameter = _step4.value;

            if (parameter.name === null) {
              return;
            } else if (parserHelpers.isUserDefinedDeclaration(parameter)) {
              userDefinedLocalVars[parameter.name] = parameter.typeName.namePath;
            } else if (functionName) {
              localVars[parameter.name] = parameter.typeName.name;
            }
          }
        } catch (err) {
          _iterator4.e(err);
        } finally {
          _iterator4.f();
        }
      },
      VariableDeclaration: function VariableDeclaration(node) {
        if (functionName && node.name === null) {
          return;
        } else if (functionName && parserHelpers.isUserDefinedDeclaration(node)) {
          userDefinedLocalVars[node.name] = node.typeName.namePath;
        } else if (functionName && parserHelpers.isElementaryTypeDeclaration(node)) {
          localVars[node.name] = node.typeName.name;
        } else if (functionName && parserHelpers.isArrayDeclaration(node)) {
          localVars[node.name] = node.typeName.baseTypeName.namePath;
        } else if (functionName && parserHelpers.isMappingDeclaration(node)) {
          localVars[node.name] = node.typeName.valueType.name;
        }
      },
      FunctionCall: function FunctionCall(node) {
        if (!functionName) {
          // this is a function call outside of functions and modifiers, ignore if exists
          return;
        }

        var expr = node.expression;
        var name;
        var localContractName;
        var visibility; // Construct an array with the event and struct names in the whole dependencies tree of the current contract

        var eventsOfDependencies = [];
        var structsOfDependencies = [];

        if (dependencies.hasOwnProperty(contractName)) {
          var _iterator5 = _createForOfIteratorHelper(dependencies[contractName]),
              _step5;

          try {
            for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
              var dep = _step5.value;
              eventsOfDependencies = eventsOfDependencies.concat(eventsPerContract[dep]);
              structsOfDependencies = structsOfDependencies.concat(structsPerContract[dep]);
            }
          } catch (err) {
            _iterator5.e(err);
          } finally {
            _iterator5.f();
          }
        } // The following block is a nested switch statement for creation of the call tree
        // START BLOCK


        if (parserHelpers.isRegularFunctionCall(node, contractNames, eventsOfDependencies, structsOfDependencies)) {
          name = expr.name;
          localContractName = contractName; // check if function is implemented in this contract or in any of its dependencies

          if (dependencies.hasOwnProperty(contractName)) {
            var _iterator6 = _createForOfIteratorHelper(dependencies[contractName]),
                _step6;

            try {
              for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
                var _dep = _step6.value;

                if (!functionCallsTree.hasOwnProperty(_dep)) {
                  constructPerFileFunctionCallTree(fileASTs[contractASTIndex[_dep]]);
                }

                if (!functionCallsTree.hasOwnProperty(_dep)) {
                  throw new Error("\nA referenced contract was not available in the provided list of contracts. This usually means that some imported file was left out of the files argument.\nYou can try to solve this automatically by using the '-i' flag or by including all the imported files manually.\n");
                }

                if (functionCallsTree[_dep].hasOwnProperty(name)) {
                  localContractName = _dep;
                }
              }
            } catch (err) {
              _iterator6.e(err);
            } finally {
              _iterator6.f();
            }
          }

          visibility = 'internal';
        } else if (parserHelpers.isMemberAccess(node)) {
          var object = null;
          var variableType = null;
          visibility = 'external';
          name = expr.memberName; // checking if the member expression is a simple identifier

          if (expr.expression.hasOwnProperty('name')) {
            object = expr.expression.name; // checking if it is a member of `address` and pass along it's contents
          } else if (parserHelpers.isMemberAccessOfAddress(node)) {
            if (expr.expression.arguments[0].hasOwnProperty('name')) {
              object = expr.expression.arguments[0].name;
            } else if (expr.expression.arguments[0].type === 'NumberLiteral') {
              object = 'address(' + expr.expression.arguments[0].number + ')';
            } else {
              object = JSON.stringify(expr.expression.arguments).replace(/"/g, "");
            } // checking if it is a typecasting to a user-defined contract type

          } else if (parserHelpers.isAContractTypecast(node, contractNames)) {
            object = expr.expression.expression.name;
          } // check if member expression is a special var and get its canonical type


          if (parserHelpers.isSpecialVariable(expr.expression)) {
            variableType = parserHelpers.getSpecialVariableType(expr.expression); // check if member expression is a typecast for a canonical type
          } else if (parserHelpers.isElementaryTypecast(expr.expression)) {
            variableType = expr.expression.expression.typeName.name; // else check for vars in defined the contract
          } else {
            // check if member access is a function of a "using for" declaration
            // START
            if (localVars.hasOwnProperty(object)) {
              variableType = localVars[object];
            } else if (userDefinedLocalVars.hasOwnProperty(object)) {
              variableType = userDefinedLocalVars[object];
            } else if (tempUserDefinedStateVars.hasOwnProperty(object)) {
              variableType = tempUserDefinedStateVars[object];
            } else if (tempStateVars.hasOwnProperty(object)) {
              variableType = tempStateVars[object];
            }
          } // convert to canonical elementary type: uint -> uint256


          variableType = variableType === 'uint' ? 'uint256' : variableType; // if variable type is not null let's replace "object" for the actual library name

          if (variableType !== null) {
            // Incase there is a "using for" declaration for this specific variable type we get its definition
            if (contractUsingFor[contractName].hasOwnProperty(variableType) && functionsPerContract.hasOwnProperty(contractUsingFor[contractName][variableType])) {
              // If there were any library declarations done to all the types with "*"
              // we will add them to the list of matching contracts
              var contractUsingForDefinitions = _construct(Set, _toConsumableArray(contractUsingFor[contractName][variableType]));

              if (contractUsingFor[contractName].hasOwnProperty('*') && functionsPerContract.hasOwnProperty(contractUsingFor[contractName]['*'])) {
                contractUsingForDefinitions = _construct(Set, _toConsumableArray(contractUsingFor[contractName][variableType]).concat(_toConsumableArray(contractUsingFor[contractName]['*'])));
              } // check which usingFor contract the method resolves to (best effort first match)


              var matchingContracts = _toConsumableArray(contractUsingForDefinitions).filter(function (contract) {
                return functionsPerContract[contract].includes(name);
              });

              if (matchingContracts.length > 0) {
                // we found at least one matching contract. use the first. don't know what to do if multiple are matching :/
                if (!options.libraries) {
                  object = matchingContracts[0];
                } else {
                  return;
                }
              }
            } // In case there is not, we can just shortcircuit the search to only the "*" variable type, incase it exists

          } else if (contractUsingFor[contractName].hasOwnProperty('*') && functionsPerContract.hasOwnProperty(contractUsingFor[contractName]['*'])) {
            // check which usingFor contract the method resolves to (best effort first match)
            var _matchingContracts = _toConsumableArray(contractUsingFor[contractName]['*']).filter(function (contract) {
              return functionsPerContract[contract].includes(name);
            });

            if (_matchingContracts.length > 0) {
              // we found at least one matching contract. use the first. don't know what to do if multiple are matching :/
              if (!options.libraries) {
                object = _matchingContracts[0];
              } else {
                return;
              }
            }
          } // END
          // if we have found nothing so far then create no node


          if (object === null) {
            return;
          } else if (object === 'super') {
            // "super" in this context is gonna be the 3rd element of the dependencies array
            // since the first is the global scope and the second is the contract itself
            localContractName = dependencies[contractName][2];
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

        if (!functionCallsTree[contractName][functionName].hasOwnProperty(name)) {
          functionCallsTree[contractName][functionName][name] = {
            contract: localContractName,
            numberOfCalls: 1,
            visibility: visibility
          };
        } else {
          functionCallsTree[contractName][functionName][name].numberOfCalls += 1;
        }
      }
    });
  } // Function to recursively generate the tree to show in the console


  function constructCallTree(reduceJobContractName, reduceJobFunctionName, parentObject) {
    var tempIterable;

    if (functionCallsTree[reduceJobContractName] === undefined) {
      //unknown method. do not resolve further
      return;
    }

    if (functionCallsTree[reduceJobContractName][reduceJobFunctionName] === undefined) {
      return;
    }

    tempIterable = functionCallsTree[reduceJobContractName][reduceJobFunctionName];

    var _iterator7 = _createForOfIteratorHelper(modifiers[reduceJobContractName][reduceJobFunctionName]),
        _step7;

    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        var modifier = _step7.value;
        Object.assign(tempIterable, modifierCalls(modifier, reduceJobContractName));
      }
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }

    Object.entries(tempIterable).forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          functionCallName = _ref2[0],
          functionCallObject = _ref2[1];

      if (functionCallName !== 'undefined' && (accepted_visibility == 'all' || functionCallObject.visibility == accepted_visibility)) {
        var keyString = "".concat(functionCallObject.contract, "::").concat(functionCallName);
        keyString += functionDecorators[functionCallName] === undefined ? '' : functionDecorators[functionCallName];

        if (!noColorOutput && functionCallObject.visibility === 'external' && accepted_visibility !== 'external') {
          keyString = keyString.yellow;
        }

        if (touched[keyString] === undefined) {
          parentObject[keyString] = {};
          touched[keyString] = true; // Test if the call is really to a contract or rather an address variable member access
          // If it is not a contract we should stop here

          if (functionCallObject.contract.substring(0, 8) !== '#address') {
            constructCallTree(functionCallObject.contract, functionCallName, parentObject[keyString]);
          }
        } else {
          if (functionCallsTree[functionCallObject.contract] === undefined) {
            parentObject[keyString] = {};
          } else {
            parentObject[keyString] = Object.keys(functionCallsTree[functionCallObject.contract][functionCallName]).length === 0 ? {} : noColorOutput ? '..[Repeated Ref]..' : '..[Repeated Ref]..'.red;
          }
        }
      }
    });
  }
}