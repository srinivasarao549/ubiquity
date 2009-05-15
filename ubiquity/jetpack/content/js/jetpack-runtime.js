// Call the given onLoad/onUnload() functions for all browser windows;
// when this function is called, the onLoad() is called for all browser
// windows, and subsequently for all newly-opened browser windows. When
// a browser window closes, onUnload() is called.  onUnload() is also
// called once for each browser window when the extension is unloaded.

function forAllBrowsers(options) {
  function makeSafeFunc(func) {
    function safeFunc(window) {
      try {
        func(window);
      } catch (e) {
        console.exception(e);
      }
    };
    return safeFunc;
  }

  function addUnloader(chromeWindow, extensionWindow, func) {
    function onUnload() {
      chromeWindow.removeEventListener("unload", onUnload, false);
      extensionWindow.removeEventListener("unload", onUnload, false);
      func(chromeWindow);
    }
    chromeWindow.addEventListener("unload", onUnload, false);
    extensionWindow.addEventListener("unload", onUnload, false);
  }

  function loadAndBind(chromeWindow) {
    if (options.onLoad)
      (makeSafeFunc(options.onLoad))(chromeWindow);
    if (options.onUnload)
      addUnloader(chromeWindow, window, makeSafeFunc(options.onUnload));
  }

  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);

  var enumerator = wm.getEnumerator("navigator:browser");

  while (enumerator.hasMoreElements()) {
    var chromeWindow = enumerator.getNext();
    if (chromeWindow.gBrowser)
      loadAndBind(chromeWindow);
    else
      onWindowOpened(chromeWindow);
  }

  function onWindowOpened(chromeWindow) {
    function removeEventHandlers() {
      chromeWindow.removeEventListener("load", onLoad, false);
      window.removeEventListener("unload", onExtensionUnload, false);
    }
    function onLoad() {
      removeEventHandlers();
      var type = chromeWindow.document.documentElement
                 .getAttribute("windowtype");
      if (type == "navigator:browser")
        loadAndBind(chromeWindow);
    }
    function onExtensionUnload() { removeEventHandlers(); }
    window.addEventListener("unload", onExtensionUnload, false);
    chromeWindow.addEventListener("load", onLoad, false);
  }

  var ww = new WindowWatcher();
  ww.onWindowOpened = onWindowOpened;
}

var JetpackRuntime = {
  _jetpackNamespace: null,

  _buildJetpackNamespace: function buildJetpackNamespace() {
    var Jetpack = new JetpackLibrary();

    Jetpack.lib = {};
    Jetpack.lib.twitter = Twitter;

    Jetpack.statusBar = {};
    Jetpack.statusBar.append = function append(options) {
      return StatusBar.append(options);
    };

    Jetpack.track = function() {
      var newArgs = [];
      for (var i = 0; i < 2; i++)
        newArgs.push(arguments[i]);
      // Make the memory tracker record the stack frame/line number of our
      // caller, not us.
      newArgs.push(1);
      MemoryTracking.track.apply(MemoryTracking, newArgs);
    };

    this._jetpackNamespace = Jetpack;
  },

  contexts: [],

  Context: function JetpackContext(sandbox) {
    this.finalize = function finalize() {
      delete sandbox['$'];
      delete sandbox['jQuery'];
    };

    MemoryTracking.track(this);
  },

  finalize: function finalize() {
    this.contexts.forEach(
      function(jetpack) {
        jetpack.finalize();
      });
    this.contexts = [];
  },

  loadJetpacks: function loadJetpacks() {
    var self = this;

    function makeGlobals(codeSource) {
      if (!self._jetpackNamespace)
        self._buildJetpackNamespace();

      var globals = {
        location: codeSource.id,
        console: console,
        $: jQuery,
        jQuery: jQuery,
        Jetpack: self._jetpackNamespace
      };

      // Add stubs for deprecated/obsolete functions.
      globals.addStatusBarPanel = function() {
        throw new Error("addStatusBarPanel() has been moved to " +
                        "Jetpack.statusBar.append().");
      };

      return globals;
    }

    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/sandboxfactory.js",
                            jsm);

    var sandboxFactory = new jsm.SandboxFactory(makeGlobals);
    var feeds = self.FeedPlugin.FeedManager.getSubscribedFeeds();
    feeds.forEach(
      function(feed) {
        if (feed.type == "jetpack") {
          var codeSource = feed.getCodeSource();
          var code = codeSource.getCode();
          var sandbox = sandboxFactory.makeSandbox(codeSource);
          self.contexts.push(new self.Context(sandbox));
          try {
            var codeSections = [{length: code.length,
                                 filename: codeSource.id,
                                 lineNumber: 1}];
            sandboxFactory.evalInSandbox(code, sandbox, codeSections);
          } catch (e) {
            console.exception(e);
          }
        }
      });
    jsm = null;
    sandboxFactory = null;
    feeds = null;
  },

  FeedPlugin: {}
};

Components.utils.import("resource://jetpack/modules/jetpack_feed_plugin.js",
                        JetpackRuntime.FeedPlugin);

$(window).ready(
  function() {
    JetpackRuntime.loadJetpacks();
    window.addEventListener("unload",
                            function() { JetpackRuntime.finalize(); },
                            false);

    var watcher = new EventHubWatcher(JetpackRuntime.FeedPlugin.FeedManager);

    function maybeReload(eventName, uri) {
      if (eventName == "purge") {
        // TODO: There's a bug in Ubiquity's feed manager which makes it
        // impossible for us to get metadata about the feed, because it's
        // already purged. We need to fix this. For now, just play it
        // safe and reload Jetpack.
        console.log("Reloading Jetpack due to purge on", uri.spec);
        window.location.reload();
      } else
        JetpackRuntime.FeedPlugin.FeedManager.getSubscribedFeeds().forEach(
          function(feed) {
            // TODO: This logic means that we actually reload many
            // times during Firefox startup, depending on how many
            // Jetpack feeds exist, since a feed-change event is
            // fired for every feed at startup!
            if (feed.uri.spec == uri.spec && feed.type == "jetpack") {
              console.log("Reloading Jetpack due to", eventName, "on",
                          uri.spec);
              window.location.reload();
            }
          });
    }

    watcher.add("feed-change", maybeReload);
    watcher.add("subscribe", maybeReload);
    watcher.add("purge", maybeReload);
    watcher.add("unsubscribe", maybeReload);
  });