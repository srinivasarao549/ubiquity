function testCmdManagerExecutesTwoCmds()
{
    var oneWasCalled = false;
    var twoWasCalled = false;

    var fakeSource = {
        getCommand : function(name) {
            if ( name == "cmd_one" )
                return {execute:function() {oneWasCalled = true;}};
            else
                return {execute:function() {twoWasCalled = true;}};
        }
    };

    var cmdMan = new CommandManager( fakeSource, null );

    cmdMan.execute("cmd_one");
    cmdMan.execute("cmd_two");

    this.assert(oneWasCalled, "cmd_one must be called.");
    this.assert(twoWasCalled, "cmd_two must be called.");
}

function testCmdManagerExecutesCmd()
{
    var wasCalled = false;

    var fakeSource = {
        getCommand : function() {
            return {execute:function() {wasCalled = true;}};
        }
    };

    var cmdMan = new CommandManager( fakeSource, null );

    cmdMan.execute("existentcommand");
    this.assert(wasCalled, "command.execute() must be called.");
}

function testCmdManagerCatchesExceptionsInCmds()
{
    var mockMsgService = {
        displayMessage : function(msg) { this.lastMsg = msg }
    };

    var fakeSource = {
        getCommand : function() {
            return {execute:function() {throw 1;}};
        }
    };

    var cmdMan = new CommandManager(fakeSource, mockMsgService);

    cmdMan.execute("existentcommand");
    this.assert(
        mockMsgService.lastMsg.indexOf("exception occurred") >= 0,
        "Command manager must log exception."
    );
}

function testCmdManagerDisplaysNoCmdError()
{
    var fakeSource = { getCommand : function() { return false; } };
    var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg }
    };
    var cmdMan = new CommandManager( fakeSource, mockMsgService );

    cmdMan.execute("nonexistentcommand");
    this.assertIsDefined(mockMsgService.lastMsg,
                         "Command manager must display a message.");
}

function testCommandSourceOneCmdWorks()
{
    var testCode = "function cmd_foo_thing() { return 5; }";
    var testCodeSource = {
        getCode : function() { return testCode; }
    };

    var cmdSrc = new CommandSource(testCodeSource);
    this.assert(!cmdSrc.getCommand("nonexistent"),
                "Nonexistent commands shouldn't exist.");

    var cmd = cmdSrc.getCommand("foo thing");
    this.assert(cmd, "Sample command should exist.");
    this.assert(cmd.execute() == 5,
                "Sample command should execute properly.");
}

function testCommandSourceTwoCodeSourcesWork()
{
    var testCode1 = "function cmd_foo() { return 5; }\n";
    var testCode2 = "function cmd_bar() { return 6; }\n";

    var testCodeSource1 = {
        getCode : function() { return testCode1; }
    };

    var testCodeSource2 = {
        getCode : function() { return testCode2; }
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

function testCommandSourceCatchesExceptionsWhenLoading()
{
    var mockMsgService = {
        displayMessage : function(msg) { this.lastMsg = msg }
    };

    var testCodeSource = {
        getCode : function() { return "awegaewg"; }
    };

    var cmdSrc = new CommandSource(testCodeSource, mockMsgService);
    cmdSrc.getCommand("existentcommand");

    this.assert(
        mockMsgService.lastMsg.indexOf("exception occurred") >= 0,
        "Command source must log exception."
    );
}

function testCommandSourceTwoCmdsWork()
{
    var testCode = ("function cmd_foo() { return 5; }\n" +
                    "function cmd_bar() { return 6; }\n");

    var testCodeSource = {
        getCode : function() { return testCode; }
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

function testCommandsAutoCompleterObeysQueryInterface()
{
    var ac = getCommandsAutoCompleter();

    ac = ac.QueryInterface(Components.interfaces.nsIAutoCompleteSearch);

    this.assert(ac,
                "AutoCompleter must present an " +
                "nsIAutoCompleteSearch interface");
}