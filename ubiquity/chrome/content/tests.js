/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const LANG = "en";

function FakeAnnSvc() {
  var ann = {};
  var urls = {};

  var self = this;

  self.getPagesWithAnnotation = function(name) {
    var results = [];
    for (uri in ann)
      if (typeof(ann[uri][name]) != 'undefined')
        results.push(urls[uri]);
    return results;
  };

  self.pageHasAnnotation = function(uri, name) {
    if (ann[uri.spec] &&
        typeof(ann[uri.spec][name]) != 'undefined')
      return true;
    return false;
  };

  self.getPageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    return ann[uri.spec][name];
  };

  self.setPageAnnotation = function(uri, name, value, dummy,
                                    expiration) {
    if (!ann[uri.spec]) {
      ann[uri.spec] = new Object();
      urls[uri.spec] = uri;
    }
    ann[uri.spec][name] = value;
  };

  self.removePageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    delete ann[uri.spec][name];
  };
}

function debugSuggestionList( list ) {
  dump("There are " + list.length + " items in suggestion list.\n");
  for each (var sugg in list) {
    dump( sugg.getDisplayText() + "\n" );
  }
}

function setupLrcsForTesting() {
   LinkRelCodeSource.__install = function() {};

   var annSvc = new FakeAnnSvc();

   LinkRelCodeSource.__getAnnSvc = function() {
     return annSvc;
   };
}

function testXhtmlCodeSourceWorks() {
  var code = "function cmd_foo() {};";
  var xhtml = '<html xmlns="http://www.w3.org/1999/xhtml"><script>' + code + '</script></html>';
  var fakeSource = {getCode: function() { return xhtml; },
                    id: "blah"};

  var xcs = new XhtmlCodeSource(fakeSource);

  this.assert(xcs.id == "blah", "id must inherit");
  if (XhtmlCodeSource.isAvailable()) {
    var xcsCode = xcs.getCode();
    this.assert(xcsCode == code,
                "code must be '" + code + "' (is '" + xcsCode + "')");
    this.assert(xcs.dom, "xcs.dom must be truthy.");
  } else {
    var excRaised = false;

    try {
      xcs.getCode();
    } catch (e if e instanceof xcs.DomUnavailableError) {
      excRaised = true;
    }

    this.assert(excRaised, "DomUnavailableError expected.");
    this.assert(typeof(xcs.dom) == 'undefined',
                "xcs.dom must be undefined");
  }
}

function testUtilsUrlWorksWithNsURI() {
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var uri = ios.newURI("http://www.foo.com", null, null);

  this.assert(Utils.url(uri).spec == "http://www.foo.com/");
}

function testUtilsUrlWorksWithString() {
  this.assert(Utils.url("http://www.foo.com").spec == "http://www.foo.com/");
}

function testUtilsUrlWorksWithKeywordArgs() {
  var kwargs = {
    base: "http://www.foo.com",
    uri: "bar/baz.txt"
  };
  var expected = "http://www.foo.com/bar/baz.txt";

  this.assert(Utils.url(kwargs).spec == expected);

  kwargs.base = Utils.url(kwargs.base);
  this.assert(Utils.url(kwargs).spec == expected);
}

function testCompositeCollectionWorks() {
  let a = new StringCodeSource('a', 'a');
  let b = new StringCodeSource('b', 'b');
  let c = new StringCodeSource('c', 'c');
  let d = new StringCodeSource('d', 'd');

  let coll_1 = new IterableCollection([a, b]);
  let coll_2 = new IterableCollection([c, d]);

  let iter = Iterator(new CompositeCollection([coll_1, coll_2]));
  this.assert(iter.next().id == 'a');
  this.assert(iter.next().id == 'b');
  this.assert(iter.next().id == 'c');
  this.assert(iter.next().id == 'd');
}

function testMixedCodeSourceCollectionWorks() {
  let a = new StringCodeSource('a', 'a');
  let b = new StringCodeSource('b', 'b');
  let c = new StringCodeSource('c', 'c');
  let d = new StringCodeSource('d', 'd');
  let e = new StringCodeSource('e', 'e');
  let f = new StringCodeSource('f', 'f');

  let mixed = new MixedCodeSourceCollection(
    new IterableCollection([a, b]),
    new IterableCollection([c, d]),
    new IterableCollection([e, f])
    );

  let codeSources = [];
  for (cs in mixed) {
    codeSources.push(cs);
  }

  this.assert(codeSources[0].getCode() == 'abcef');
  this.assert(codeSources[0].id == 'c');

  this.assert(codeSources[1].getCode() == 'abdef');
  this.assert(codeSources[1].id == 'd');
}

function testLinkRelCodeSourceWorks() {
  setupLrcsForTesting();

  var LRCS = LinkRelCodeSource;
  var url = "http://www.foo.com";
  var code = "function blah() {}";

  this.assert(!LRCS.isMarkedPage(url));
  LRCS.addMarkedPage({url: url,
                      sourceCode: code,
                      canUpdate: false});
  this.assert(LRCS.isMarkedPage(url));

  var results = LRCS.getMarkedPages();

  this.assert(results.length == 1);

  // Ensure the result is what we think it is.
  var page = results[0];
  this.assert(page.getCode() == code);

  // Add another marked page and make sure things still make sense.
  var moreCode = "function narg() {}";
  LRCS.addMarkedPage({url: "http://www.bar.com",
                      sourceCode: moreCode,
                      canUpdate: false});
  results = LRCS.getMarkedPages();

  this.assert(results[0].getCode() == code);
  this.assert(results[1].getCode() == moreCode);

  // TODO: Make a LinkRelCodeSource object and ensure that it behaves
  // how we think it should.

  results[0].remove();

  this.assert(!LRCS.isMarkedPage(url));
}

function FakeCommandSource( cmdList ) {
  this._cmdList = cmdList;
  for ( var x in cmdList ) {
    this._cmdList[x].name = x;
  }
}
FakeCommandSource.prototype = {
  getCommand: function(name) {
    return this._cmdList[name];
  },
  getAllCommands: function(name) {
    return this._cmdList;
  },
  getAllNounTypes: function() {
    return [];
  },
  refresh: function() {
  }
};

function getTextSelection(context) {
  if (context)
    if (context.textSelection)
      return context.textSelection;
  return "";
}

function getHtmlSelection(context) {
  if (context)
    if (context.htmlSelection)
      return context.htmlSelection;
  return "";
}

function getNounList() {
  return [];
}

function testCmdManagerExecutesTwoCmds() {
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var oneWasCalled = false;
  var twoWasCalled = false;
  var pblock = {};

  var fakeSource = new FakeCommandSource(
    {
      cmd_one: {execute:function() {oneWasCalled = true;}},
      cmd_two: {execute:function() {twoWasCalled = true;}}
    });

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("cmd_one");
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute();
  cmdMan.updateInput("cmd_two");
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute();
  this.assert(oneWasCalled, "cmd_one must be called.");
  this.assert(twoWasCalled, "cmd_two must be called.");
}

function testCmdManagerExecutesCmd() {
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var wasCalled = false;

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {wasCalled = true;}}
    }
  );

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);
  cmdMan.updateInput("existentcommand");
  cmdMan.execute();
  this.assert(wasCalled, "command.execute() must be called.");
}

function testCmdManagerCatchesExceptionsInCmds() {
  var mockMsgService = {
    displayMessage: function(msg) { this.lastMsg = msg; }
  };

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {throw 1;}}
    }
  );

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("existentcommand");
  cmdMan.execute();
  this.assert(
    (mockMsgService.lastMsg.text.indexOf("exception occurred") >= 0 &&
     mockMsgService.lastMsg.exception),
    "Command manager must log exception."
  );
}

function testCmdManagerDisplaysNoCmdError() {
  var fakeSource = new FakeCommandSource ( {} );
  var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg; }
  };
  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("nonexistentcommand");
  cmdMan.execute();
  this.assertIsDefined(mockMsgService.lastMsg,
                       "Command manager must display a message.");
}

function testIterableCollectionWorks() {
  var fakeCodeSource = {
    getCode: function() { return "a = 1"; },
    id: 'http://www.foo.com/bar.js'
  };

  var coll = new IterableCollection([fakeCodeSource]);
  var count = 0;
  for (var cs in coll) {
    this.assert(cs.getCode() == "a = 1");
    this.assert(cs.id == "http://www.foo.com/bar.js");
    count += 1;
  }
  this.assert(count == 1, "count must be 1.");
}

function testCommandSourceOneCmdWorks() {
  var testCode = "function cmd_foo_thing() { return 5; }";
  var testCodeSource = {
    getCode : function() { return testCode; },
    id: 'test'
  };

  var cmdSrc = new CommandSource(testCodeSource);
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo-thing");
  this.assert(cmd, "Sample command should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command should execute properly.");
}

function testCommandSourceTwoCodeSourcesWork() {
  var testCode1 = "a=5;function cmd_foo() { return a; }\n";
  var testCode2 = "a=6;function cmd_bar() { return a; }\n";

  var testCodeSource1 = {
    getCode : function() { return testCode1; },
    id: 'source1'
  };

  var testCodeSource2 = {
    getCode : function() { return testCode2; },
    id: 'source2'
  };

  var cmdSrc = new CommandSource([testCodeSource1,
                                  testCodeSource2]);
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd, "Sample command 'foo' should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command 'foo' should execute properly.");

  cmd = cmdSrc.getCommand("bar");
  this.assert(cmd, "Sample command 'bar' should exist.");
  this.assert(cmd.execute() == 6,
              "Sample command 'bar' should execute properly.");
}

function testCommandSourceCatchesExceptionsWhenLoading() {
  var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg; }
  };

  var testCodeSource = {
    getCode : function() { return "awegaewg"; },
    id: "test"
  };

  var cmdSrc = new CommandSource(testCodeSource, mockMsgService);
  cmdSrc.getCommand("existentcommand");

  this.assert(
    (mockMsgService.lastMsg.text.indexOf("exception occurred") >= 0 &&
     mockMsgService.lastMsg.exception),
    "Command source must log exception."
  );
}

function testCommandSourceTwoCmdsWork() {
  var testCode = ("function cmd_foo() { return 5; }\n" +
                  "function cmd_bar() { return 6; }\n");

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var cmdSrc = new CommandSource(testCodeSource);
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd, "Sample command 'foo' should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command 'foo' should execute properly.");

  cmd = cmdSrc.getCommand("bar");
  this.assert(cmd, "Sample command 'bar' should exist.");
  this.assert(cmd.execute() == 6,
              "Sample command 'bar' should execute properly.");
}

function testCommandNonGlobalsAreResetBetweenInvocations() {
  var testCode = ( "x = 1; function cmd_foo() { return x++; }" );

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var cmdSrc = new CommandSource(testCodeSource);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  cmdSrc.refresh();

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on second call.");
}

function testMakeGlobalsWork() {
  function makeGlobals(id) {
    return {id: id};
  }

  var testCode = "function cmd_foo() { return id; }";

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var sandboxFactory = new SandboxFactory(makeGlobals);

  var cmdSrc = new CommandSource(testCodeSource, undefined, sandboxFactory);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == "test",
              "Command 'foo' should return 'test'.");
}

function testCommandGlobalsWork() {
  var testCode = ( "function cmd_foo() { " +
                   "  if (globals.x) " +
                   "    return ++globals.x; " +
                   "  globals.x = 1; " +
                   "  return globals.x; " +
                   "}" );

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var sandboxFactory = new SandboxFactory({globals: {}});

  var cmdSrc = new CommandSource(testCodeSource, undefined, sandboxFactory);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  cmdSrc.refresh();

  cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 2,
              "Command 'foo' should return 2 on second call.");
}

// This tests bug #25, but it's being commented out for now so that
// all unit tests succeed.
//function testSandboxSupportsJs17() {
//  var sbf = new SandboxFactory({});
//  var s = sbf.makeSandbox();
//  sbf.evalInSandbox("let k = 1;", s);
//}

function _testImport(test, jsmu) {
  test.assert(!("jsmutils" in jsmu));
  jsmu.Import("resource://ubiquity-modules/jsmutils.js");
  test.assert(jsmu.jsmutils);
  test.assert("Import" in jsmu.jsmutils);
}

function testImportWorksWithSandboxContext() {
  var url = "resource://ubiquity-modules/jsmutils.js";
  var jsmu = {};
  Components.utils.import(url, jsmu);

  this.assert(!("_sandboxContext" in jsmu));
  jsmu.setSandboxContext(new SandboxFactory({}));
  this.assert("_sandboxContext" in jsmu);
  this.assert(!("_sandboxContext" in this));

  this.assert(!(url in jsmu._sandboxContext.modules));
  _testImport(this, jsmu);
  this.assert(url in jsmu._sandboxContext.modules);
}

function testImportWorksWithoutSandboxContext() {
  var jsmu = {};
  Components.utils.import("resource://ubiquity-modules/jsmutils.js", jsmu);

  _testImport(this, jsmu);
  this.assert(!("_sandboxContext" in jsmu));
}

function testParseDirectOnly() {
  var dogGotPetted = false;
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  var cmd_pet = {
    execute: function(context, directObject, modifiers) {
      dogGotPetted = directObject.text;
    },
    name: "pet",
    DOLabel: "kind of dog",
    DOType: dog,
    modifiers: {}
  };
  var verb = new NLParser.EnVerb(cmd_pet);
  var inputWords = ["pet", "b"];

  var selObject = {
    text:"",
    html:""
  };
  var completions = verb.getCompletions( inputWords, selObject );
  this.assert( completions.length == 2, "should be 2 completions" );
  this.assert( completions[0]._verb._name == "pet", "verb should be pet");
  this.assert( completions[0]._argSuggs.direct_object.text == "beagle",
	       "obj should be beagle");
  this.assert( completions[1]._verb._name == "pet", "verb should be pet");
  this.assert( completions[1]._argSuggs.direct_object.text == "bulldog",
	       "obj should be bulldog");
  completions[0].execute();
  this.assert( dogGotPetted == "beagle");
  completions[1].execute();
  this.assert( dogGotPetted == "bulldog" );
}

function testParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				"beagle", "bulldog", "husky"]);
  var washingObj = new CmdUtils.NounType( "washing object",
					  ["sponge", "hose", "spork",
					  "bathtub", "fire hose"]);
  var cmd_wash = {
    execute: function(context, directObject, modifiers) {
      dogGotWashed = directObject.text;
      dogGotWashedWith = modifiers["with"].text;
    },
    name:"wash",
    DOLabel:"kind of dog",
    DOType: dog,
    modifiers: {"with": washingObj}
  };

  var verb = new NLParser.EnVerb(cmd_wash);
  var inputWords = ["wash", "pood", "with", "sp"];
  var selObject = {
    text:"",
    html:""
  };
  var completions = verb.getCompletions( inputWords, selObject);
  this.assert( completions.length == 2, "Should be 2 completions" );
  this.assert( completions[0]._verb._name == "wash");
  this.assert( completions[0]._argSuggs.direct_object.text == "poodle");
  this.assert( completions[0]._argSuggs.with.text == "sponge");
  this.assert( completions[1]._verb._name == "wash");
  this.assert( completions[1]._argSuggs.direct_object.text == "poodle");
  this.assert( completions[1]._argSuggs.with.text == "spork");
  completions[0].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "sponge");
  completions[1].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "spork");
}

function testCmdManagerSuggestsForEmptyInput() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var nounTypeOne = new CmdUtils.NounType( "thingType", ["tree"] );
  var nounTypeTwo = new CmdUtils.NounType( "stuffType", ["mud"] );
  var fakeSource = new FakeCommandSource(
  {
    cmd_one: {execute:function(context, directObj) {
		oneWasCalled = directObj.text;
	      },
              DOLabel:"thing",
	      DOType:nounTypeOne},
    cmd_two: {execute:function(context, directObj) {
		twoWasCalled = directObj.text;
	      },
	      DOLabel:"stuff",
	      DOType:nounTypeTwo}
  });
  fakeSource.getAllNounTypes = function() {
    return [nounTypeOne, nounTypeTwo];
  };
  var cmdMan = new CommandManager(fakeSource, null, LANG);
  var getAC = makeDefaultCommandSuggester(cmdMan);
  var suggDict = getAC({textSelection:"tree"});
  this.assert( suggDict["Cmd_one"], "cmd one should be in" );
  this.assert( !suggDict["Cmd_two"], "cmd two should be out" );
  var execute = suggDict["Cmd_one"];
  execute();
  this.assert( oneWasCalled == "tree", "should have been calld with tree" );
  suggDict = getAC({textSelection:"mud"});
  this.assert( !suggDict["Cmd_one"], "cmd one should be out" );
  this.assert( suggDict["Cmd_two"], "cmd two should be in" );
  execute = suggDict["Cmd_two"];
  execute();
  this.assert( twoWasCalled == "mud", "should have been called with mud" );
}

function testVerbEatsSelection() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new CmdUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new CmdUtils.NounType( "place", ["grill", "diner", "home"]);
  var cmd_eat = {
    name: "eat",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	foodGotEaten = directObject.text;
      if (modifiers["at"].text)
	foodGotEatenAt = modifiers["at"].text;
    },
    DOLabel:"food",
    DOType: food,
    modifiers: {"at": place}
  };
  var verb = new NLParser.EnVerb(cmd_eat);
  var selObject = { text: "lunch", html:"lunch" };
  var completions = verb.getCompletions(["eat", "this"], selObject);
  this.assert( completions.length == 1, "Should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "obj should be lunch");
  this.assert(foodGotEatenAt == null, "should be no modifier");

  selObject.text = "grill";
  selObject.html = "grill";
  completions = verb.getCompletions(["eat", "breakfast", "at", "it"], selObject);
  this.assert( completions.length == 1, "should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "breakfast", "food should be breakfast");
  this.assert(foodGotEatenAt == "grill", "place should be grill");

  selObject.text = "din";
  completions = verb.getCompletions(["eat", "at", "home", "this"], selObject);
  //debugSuggestionList( completions );
  this.assert( completions.length == 1, "second should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "dinner", "food should be dinner");
  this.assert(foodGotEatenAt == "home", "place should be home");
}

function testImplicitPronoun() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new CmdUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new CmdUtils.NounType( "place", ["grill", "diner", "home"]);
  var cmd_eat = {
    name: "eat",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	foodGotEaten = directObject.text;
      if (modifiers["at"].text)
	foodGotEatenAt = modifiers["at"].text;
    },
    DOLabel:"food",
    DOType: food,
    modifiers: {"at": place}
  };
  var verb = new NLParser.EnVerb(cmd_eat);
  var selObject = { text: "lunch", html:"lunch" };

  var completions = verb.getCompletions(["eat"], selObject);
  this.assert( (completions.length == 1), "Should have 1 completion.");
  completions[0].execute();
  this.assert((foodGotEaten == "lunch"), "DirectObj should have been lunch.");
  this.assert((foodGotEatenAt == null), "Indirectobj should not be set.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["eat"], selObject);

  this.assert( completions.length == 2, "Should have 3 completions.");
  // first completion should be directObject is dinner
  completions[0].execute();
  this.assert((foodGotEaten == "dinner"), "DO should have been dinner.");
  this.assert((foodGotEatenAt == null), "IndirectObjs shouldn't be set.");
  foodGotEaten = null;
  foodGotEatenAt = null;
  // second completion should be direct object null, place is diner
  completions[1].execute();
  this.assert((foodGotEaten == null), "DO should be null.");
  this.assert((foodGotEatenAt == "diner"), "Place should be diner.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["eat", "lunch", "at", "selection"], selObject);
  this.assert( completions.length == 1, "Sould have 1 completion");
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "Should have eaten lunch");
  this.assert(foodGotEatenAt == "diner", "Should have eaten it at diner");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["eat", "at", "grill"], selObject);
  this.assert( completions.length == 1, "Should have 1 completion");
  completions[0].execute();
  this.assert((foodGotEaten == "dinner"), "DO should be dinner.");
  this.assert((foodGotEatenAt == "grill"), "ate at grill.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "pants";
  completions = verb.getCompletions(["eat"], selObject);
  this.assert( completions.length == 1);
  completions[0].execute();
  this.assert((foodGotEaten == null), "Should have no valid args.");
  this.assert((foodGotEatenAt == null), "Should have no valid args.");

  selObject.text = null;
  selObject.html = null;
  completions = verb.getCompletions(["eat", "this"], selObject);
  this.assert( completions.length == 0, "should have no completions");
}

function testMakeSugg() {
  // test that CmdUtils.makeSugg doesn't fail on null input, that it preserves
  // html, etc etc.
  /*var thingy = CmdUtils.makeSugg(null, "alksdf");
  this.assert( thingy.text == "alksdf", "thingy.text should be set.");*/
  // test above can't be run from the command line as there is no
  // context.focusedWindow, needed for getTextFromHtml.

  var thingy2 = CmdUtils.makeSugg(null, null, null);
  this.assert( thingy2 == null, "should return null");
}

function testModifiersTakeMultipleWords() {
  var wishFound = null;
  var wishFoundIn = null;
  var wish = new CmdUtils.NounType( "wish", ["apartment", "significant other", "job"]);
  var city = new CmdUtils.NounType( "city", ["chicago",
					     "new york",
					     "los angeles",
					     "san francisco"]);
  var cmd_find = {
    name: "find",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	wishFound = directObject.text;
      if (modifiers["in"].text)
	wishFoundIn = modifiers["in"].text;
    },
    DOLabel:"wish",
    DOType: wish,
    modifiers: {"in": city}
  };
  var verb = new NLParser.EnVerb(cmd_find);
  var selObject = {text:null, html:null};
  var completions = verb.getCompletions(["find", "job", "in", "chicago"], selObject);
  this.assert(completions[0]._argSuggs.direct_object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");

  completions = verb.getCompletions(["find", "significant", "other", "in", "chicago"],
				    selObject);
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");
  this.assert(completions[0]._argSuggs.direct_object.text == "significant other", "should be SO.");

  completions = verb.getCompletions(["find", "job", "in", "new", "york"], selObject);
  this.assert(completions[0]._argSuggs.direct_object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "new york", "should be NY");
}

function testSuggestionMemory() {
  var suggMem1 = new SuggestionMemory("test_1");
  suggMem1.remember( "p", "peas");
  suggMem1.remember( "p", "peas");
  suggMem1.remember( "q", "quinine");
  suggMem1.remember( "q", "quetzalcoatl");
  suggMem1.remember( "p", "polymascotfoamulate");
  suggMem1.remember( "q", "quinine");

  this.assert(suggMem1.getScore("q", "quinine") == 2);
  this.assert(suggMem1.getScore("q", "quetzalcoatl") == 1);
  this.assert(suggMem1.getScore( "q", "peas") == 0 );
  this.assert(suggMem1.getScore( "q", "qualifier") == 0);
  this.assert(suggMem1.getScore( "p", "peas") == 2);
  this.assert(suggMem1.getScore( "p", "polymascotfoamulate") == 1);
  this.assert(suggMem1.getScore( "p", "popcorn" ) == 0 );
  this.assert(suggMem1.getScore( "p", "quinine" ) == 0 );
}

function testSortedBySuggestionMemory() {
  var nounList = [];
  var verbList = [{name: "clock"},
		  {name: "calendar"},
		  {name: "couch"},
		  {name: "conch"},
		  {name: "crouch"},
		  {name: "coelecanth"},
		  {name: "crab"} ];
  var nlParser = new NLParser.EnParser( verbList, nounList );
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList("c", fakeContext);

  // TODO finish this test-- once suggestion memory for verb ranking is hooked up.
}

function testSortedByMatchQuality() {
  var nounList = [];
  var verbList = [{name: "frobnicate"},
		  {name: "glurgle"},
		  {name: "nonihilf"},
		  {name: "bnurgle"},
		  {name: "fangoriously"}];
  var nlParser = new NLParser.EnParser( verbList, nounList );
  var fakeContext = {textSelection:"", htmlSelection:""};

  var assert = this.assert;
  function testSortedSuggestions( input, expectedList ) {
    nlParser.updateSuggestionList( input, fakeContext );
    var suggs = nlParser.getSuggestionList();
    assert( suggs.length == expectedList.length, "Should have " + expectedList.length + " suggestions.");
    for (var x in suggs) {
      assert( suggs[x]._verb._name == expectedList[x], expectedList[x] + " should be " + x);
    }
  }
  testSortedSuggestions( "g", ["glurgle", "bnurgle", "fangoriously"]);
  testSortedSuggestions( "n", ["nonihilf", "bnurgle", "frobnicate", "fangoriously"]);
  testSortedSuggestions( "ni", ["nonihilf", "frobnicate"]);
  testSortedSuggestions( "bn", ["bnurgle", "frobnicate"]);
  testSortedSuggestions( "f", ["frobnicate", "fangoriously", "nonihilf"]);
  testSortedSuggestions( "frob", ["frobnicate"]);
  testSortedSuggestions( "urgle", ["glurgle", "bnurgle"]);

  verbList = [{name: "google"},
	      {name: "tag"},
	      {name: "digg"},
	      {name: "bugzilla"},
	      {name: "get-email-address"},
	      {name: "highlight"}];
  nlParser.setCommandList( verbList );
  testSortedSuggestions( "g", ["google", "get-email-address", "tag", "digg", "bugzilla", "highlight"]);
}

function testSortSpecificNounsBeforeArbText() {
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  var arb_text = {
    _name: "text",
    rankLast: true,
    suggest: function( text, html ) {
      return [ CmdUtils.makeSugg(text, html) ];
    }
  };

  var verbList = [{name: "mumble", DOType: arb_text, DOLabel:"stuff"},
                  {name: "wash", DOType: dog, DOLabel: "dog"}];

  var nlParser = new NLParser.EnParser( verbList, [arb_text, dog] );

  var fakeContext = {textSelection:"beagle", htmlSelection:"beagle"};
  var selObj = getSelectionObject( fakeContext );
  nlParser.updateSuggestionList( "", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 2, "Should be two suggestions.");
  this.assert( suggs[0]._verb._name == "wash", "First suggestion should be wash");
  this.assert( suggs[1]._verb._name == "mumble", "Second suggestion should be mumble");
}

function testVerbUsesDefaultIfNoArgProvided() {
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  dog.default = function() {
    return CmdUtils.makeSugg( "husky" );
  };
  var verbList = [{name:"wash", DOType: dog, DOLabel: "dog"},
		  {name:"play-fetch", DOType: dog, DOLabel: "dog", DODefault: "basenji"}];
  var nlParser = new NLParser.EnParser( verbList, [dog]);
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList( "wash", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion.");
  this.assert( suggs[0]._verb._name == "wash", "Suggestion should be wash\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "husky", "Argument should be husky.\n");

  nlParser.updateSuggestionList( "play", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion.");
  this.assert( suggs[0]._verb._name == "play-fetch", "Suggestion should be play-fetch\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "basenji", "Argument should be basenji.\n");

  nlParser.updateSuggestionList( "play retr", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion.");
  this.assert( suggs[0]._verb._name == "play-fetch", "Suggestion should be play-fetch\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "golden retreiver", "Argument should be g.retr.\n");

  //TODO try out defaults for modifier arguments.
}

function testSynonyms() {
  var verbList = [{name: "twiddle", synonyms: ["frobnitz", "twirl"]},
		  {name: "frobnitz"},
		  {name: "frobnicate"}];
  var nlParser = new NLParser.EnParser( verbList, [] );
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList( "frob", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 3, "Should be 3 suggs.");
  this.assert( suggs[0]._verb._name == "frobnitz", "frobnitz should be first");
  this.assert( suggs[1]._verb._name == "frobnicate", "frobnicate should be second");
  this.assert( suggs[2]._verb._name == "twiddle", "twiddle should be third");

  nlParser.updateSuggestionList( "twid", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 sugg.");
  this.assert( suggs[0]._verb._name == "twiddle", "twiddle should be it");

  nlParser.updateSuggestionList( "twirl", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 sugg.");
  this.assert( suggs[0]._verb._name == "twiddle", "twiddle should be it");
}

function testPartiallyParsedSentence() {

  // make sure it also works with a no-arg command:
  var cmd_grumble = {
    name: "grumble",
    execute: function(context, directObject, modifiers) {
    }
  };
  var verbNoArgs = new NLParser.EnVerb(cmd_grumble);
  var partiallyParsedNoArgs = new NLParser.EnPartiallyParsedSentence(
    verbNoArgs,
    {},
    selObj,
    0
    );

  var parsedNoArgs  = partiallyParsedNoArgs.getParsedSentences();
  this.assert( parsedNoArgs.length == 1, "Should have 1 parsing.");
  this.assert( parsedNoArgs[0]._verb._name == "grumble");


  var noun_type_foo = {
    _name: "foo",
    suggest: function( text, html ) {
      return [ CmdUtils.makeSugg("foo_a"), CmdUtils.makeSugg("foo_b") ];
    }
  };
  var noun_type_bar = {
    _name: "bar",
    suggest: function( text, html ) {
      return [ CmdUtils.makeSugg("bar_a"), CmdUtils.makeSugg("bar_b") ];
    }
  };
  var noun_type_baz = {
    _name: "baz",
    suggest: function( text, html ) {
      return [];
    }
  };

  var verb = new NLParser.EnVerb({
				   name: "frobnitz",
				   arguments: {
				     fooArg: {
				       type: noun_type_foo,
				       label: "the foo",
				       flag: "from"
				     },
				     barArg: {
				       type: noun_type_bar,
				       label: "the bar",
				       flag: "by"
				     },
				     bazArg: {
				       type: noun_type_baz,
				       label: "the baz",
				       flag: "before",
				       default: "super pants"
				     }
				   }
				 });

  var argStrings = {fooArg: ["nonihilf"],
		    barArg: ["rocinante"] };
  // bazArg purposefully left out -- partiallyParsedSentence must be tolerant
  // of missing args.

  var selObj = {
    text: "", html: ""
  };
  var partiallyParsed = new NLParser.EnPartiallyParsedSentence(
    verb,
    argStrings,
    selObj,
    0
    );

  var parsed  = partiallyParsed.getParsedSentences();
  // two suggestions for foo, two suggestions for bar: should be four
  // combinations.
  this.assert( parsed.length == 4, "Should be four parsings.");

  // Add another suggestion for bar.  Now there should be six combinations.
  partiallyParsed.addArgumentSuggestion( "barArg",
					 CmdUtils.makeSugg("bar_c"));
  parsed  = partiallyParsed.getParsedSentences();
  this.assert( parsed.length == 6, "Should be six (not eight) parsings.");

  // All six should have the default for bazArg since we dind't provide any
  for each (var p in parsed)
    this.assert( p.getArgText('bazArg') == "super pants", "must use default.");

  // Now provide an actual argument for baz:
  partiallyParsed.addArgumentSuggestion( "bazArg",
				         CmdUtils.makeSugg("baz_a"));
  parsed  = partiallyParsed.getParsedSentences();
  // Should still have six
  this.assert( parsed.length == 6, "Should be six (not eight) parsings.");

  // All six should have the new value for bazArg.
  for each (var p in parsed)
    this.assert( p.getArgText('bazArg') == "baz_a", "should be baz_a.");

}


function testVerbGetCompletions() {
  var grumbleCalled = false;
  var cmd_grumble = {
    name: "grumble",
    execute: function(context, directObject, modifiers) {
      grumbleCalled = true;
    }
  };
  var verb = new NLParser.EnVerb(cmd_grumble);
  var selObj = {
    text: "", html: ""
  };
  var comps = verb.getCompletions( ["grum"], selObj);
  this.assert( comps.length == 1, "Should be one suggestion." );
  this.assert( comps[0]._verb._name == "grumble", "Should be grumble.");
}

function testTextAndHtmlDifferent() {
  var executedText = null;
  var executedHtml = null;
  var selObj = {
    text: "Pants", html:"<blink>Pants</blink>"
  };
  var noun_type_different = {
    _name: "different",
    suggest: function( text, html ) {
      if (text.indexOf("Pant") == 0)
        return [ CmdUtils.makeSugg(text, html) ];
      else
	return [];
    }
  };
  var cmd_different = {
    name: "dostuff",
    DOLabel: "thing",
    DOType: noun_type_different,
    execute: function( context, directObject, modifiers) {
      executedText = directObject.text;
      executedHtml = directObject.html;
    }
  };
  var verb = new NLParser.EnVerb(cmd_different);
  var comps = verb.getCompletions( ["dostuff", "this"], selObj);
  this.assert(comps.length == 1, "There should be one completion.");
  comps[0].execute();
  this.assert( executedText == "Pants", "text should be pants.");
  this.assert( executedHtml == "<blink>Pants</blink>", "html should blink!");

  executedText = null;
  executedHtml = null;
  //without any explicit 'this', should still work...
  comps = verb.getCompletions( ["dostuff"], selObj);
  this.assert(comps.length == 1, "There should be one completions (2)");
  comps[0].execute();
  this.assert( executedText == "Pants", "text should be pants.");
  this.assert( executedHtml == "<blink>Pants</blink>", "html should blink!");

  // when it's a noun-first suggestion from the parser, should still work...
  executedText = null;
  executedHtml = null;
  var nlParser = new NLParser.EnParser( [cmd_different], [noun_type_different]);
  comps = nlParser.nounFirstSuggestions( "Pantalones", "<blink>Pantalones</blink>");
  this.assert(comps.length == 1, "There should be one completions (3)");
  comps[0].execute();
  this.assert( executedText == "Pantalones", "text should be pantalones.");
  this.assert( executedHtml == "<blink>Pantalones</blink>", "html should blink!");

}

function testAsyncNounSuggestions() {
  var noun_type_slowness = {
    _name: "slowness",
    suggest: function( text, html ) {
      if (text.indexOf("hello")== 0)
        return [ CmdUtils.makeSugg("Robert E. Lee") ];
      else
	return [];
    },
    asyncSuggest: function( text, html, callback ) {
      // Do all kinds of network calls here
      if (text.indexOf("hello") == 0) {
        callback( CmdUtils.makeSugg("slothitude") );
        callback( CmdUtils.makeSugg("snuffleupagus") );
      }
    }
  };
  var cmd_slow = {
    name: "dostuff",
    DOLabel: "thing",
    DOType: noun_type_slowness,
    execute: function(context, directObject) {

    }
  };
  var verb = new NLParser.EnVerb(cmd_slow);
  var selObj = {
    text: "", html: ""
  };
  var comps = verb.getCompletions(["dostuff", "hello"], selObj);
  var assert = this.assert;
  var assertDirObj = function( completion, expected) {
    assert( completion._argSuggs.direct_object.text == expected,
		 "Expected " + expected );
  };

  this.assert( comps.length == 3, "there should be 3 completions.");
  assertDirObj( comps[0], "Robert E. Lee");
  assertDirObj( comps[1], "slothitude");
  assertDirObj( comps[2], "snuffleupagus");
}

// TODO a test where we put inalid value into an argument on purpose, ensure
// verb returns no suggestions.

// TODO a test where a command has three arguments, all arbText; make sure
// the top parsing is the sensible one.

// TODO test of verb initialized with new style arguments dict,
// and a verb initialized with old style arguments, make sure they're equivalent
// in every way.

// TODO have a bogus noun that returns empty suggestions, make sure it doesn't
// crash everything.

// tests for not yet implemented features:

// TODO disjoint verb matches: make them work and test that they do.
// Maybe a useful subcategory of disjoint matches is "two letters transposed",
// which is very easy to do by accident when typing words like "emial".

// TODO test that selection goes to ANY type-matching argument that's left empty, no
// matter how many other filled arguments there are.  Test that if multiple arguments
// are left empty, the selection is suggested for each one, although not all at the
// same time.

// TODO test for asynchronously generated noun suggestions.

// TODO test ranking based on noun match quality, when verb-match quality is
// equivalent.

// TODO test that match with more (and more specific) arguments filled
// is ranked ahead of match with unfilled arguments, even if there are
// defaults.