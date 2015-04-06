/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/*jslint browser: true, devel: true */
/*global findRegExpBar: false, chrome: false, console: false, require: false, document: false */
;
'use strict';
//
// Replace [/\b(const|let)\B/] with [$1 ]
// Replace [/^( *)function (\w+)/] with [$1var $2 = function]
//
// Author: adrian.aichner@gmail.com
//
(function() {
  let DEBUG_ADDON = false;
  try {
    // var exports = exports || {};
    //
    // NOTE Change Function Scope variable DEBUG_ADDON from false to true in the debugger variables panel before continuing to get console messages logged.
    // Make sure option "Console Logging Level" is not set to "off".
    //
    if (DEBUG_ADDON) {
      // debugger is statement, not expression.
      // DEBUG_ADDON && debugger;
      // causes exception.
      debugger;
    }
    DEBUG_ADDON &&
      console.log('Logging enabled via debugger');
    const self = require('sdk/self');
    // Only available for options natively supported by firefox, i.e. in jpm.
    const lo = require("@loader/options");
    const metadata = lo.metadata;
    if (!lo || !lo.metadata.title) {
      let ps = require("sdk/preferences/service");
      ps.reset('extensions.issue-pigeon@addons.mozilla.org.sdk.baseURI');
      ps.reset('extensions.issue-pigeon@addons.mozilla.org.sdk.rootURI');
      ps.reset('extensions.issue-pigeon@addons.mozilla.org.sdk.version');
    }
    const myTitle = self.title || metadata.title || self.name;
    let loading =
        'addon ' + myTitle + ' ' + self.version + ' $Format:%h%d$ loads ' +
        // NOTE: Introduce fragment specifier before line spec to make
        // clickable link work in console.log.
        (new Error).stack.replace(/:(\d+):(\d+)/g, '#L$1C$2');
    DEBUG_ADDON &&
      console.log(loading);
    if (console.time) {
      DEBUG_ADDON &&
        console.time('load time');
    }
    if (console.profile) {
      DEBUG_ADDON &&
        console.log('start profiling');
      DEBUG_ADDON &&
        console.profile('addon ' + self.name + ' ' + self.version + 'profile');
    }

    // to see how to test this function, look at ../test/test-main.js
    var testSelfProperty = function(property, callback) {
      callback(self[property]);
    }

    var dummy = function(callback) {
      let { metadata } = require("@loader/options");
      // let { metadata } = require("sdk/self");
      callback(metadata);
    }

    exports.dummy = dummy;
    exports.testSelfProperty = testSelfProperty;

    // See https://blog.mozilla.org/addons/2013/06/13/jetpack-fennec-and-nativewindow
    // get a global window reference
    const utils = require('sdk/window/utils');
    const recent = utils.getMostRecentBrowserWindow();
    const notifications = require("sdk/notifications");
    const qs = require("sdk/querystring");
    const tabs = require("sdk/tabs");
    let sp = require('sdk/simple-prefs');
    // The real on eis in reportFeedbackInformation.js
    let bugzilla = function () {};
    let sample = JSON.stringify({
      'https://apa.selfhost.eu:8443': {
        help: 'https://wiki.eclipse.org/Orion',
        report: "https://bugs.eclipse.org/bugs/enter_bug.cgi?product=Orion&component=Client&version=unspecified",
        type: 'bugzilla'
      }
    }, null, 2);

    // Need to update let extendMenuItem.data from preference.
    let extendMenuItem, pigeonMenuItem;
    var saveKnownSitesExtensions = function(data) {
      sp.prefs['KNOWN_SITES_EXTENSIONS'] = data;
      if (extendMenuItem) {
        extendMenuItem.data = data;
      }
      if (pigeonMenuItem) {
        pigeonMenuItem.data = data;
      }
    };

    sp.on('KNOWN_SITES_EXTENSIONS', function(prefName) {
      DEBUG_ADDON &&
        console.log('Setting ' + prefName + ' for ' + self.name + ' version ' +
                    self.version + ' to ' + sp.prefs[prefName]);
      // Keep menu item data attribute in sync.
      if (extendMenuItem) {
        extendMenuItem.data = sp.prefs[prefName];
      }
      if (pigeonMenuItem) {
        pigeonMenuItem.data = sp.prefs[prefName];
      }
    });

    var reportUnsupportedSite = function(data) {
      let title = self.name + ': Cannot fly home';
      notifications.notify({
        title: title,
        text: "\nClick to report this\n" + data,
        data: qs.stringify({
          title:
          title + ' in ' + self.version,
          body:
          "(Please review for any private data you may want to remove before submitting)\n\n" + data
        }),
        onClick: function (data) {
          tabs.open({
            inNewWindow: true,
            url: 'https://github.com/anaran/IssuePigeonFirefox/issues/new?' + data,
            onClose: function() {
              require("sdk/tabs").activeTab.activate();
            }});
        }});
    };

    let handleMessages = function (data) {
      DEBUG_ADDON &&
        console.log(data);
      if ('save' in data) {
        saveKnownSitesExtensions(data.save);
      }
      if ('help' in data) {

        tabs.on('open', function(tab){
          tab.on('ready', function(tab){
            console.log(tab.url);
            var worker = tab.attach({
              // contentScriptFile: self.data.url('marked_content.js')
              contentScriptFile: './marked_content.js'
            });
            worker.port.on('markdown', function (data) {
              console.log('markdown', data);
              var marked = require('./marked.js');
              var toc = [];
              var renderer = (function() {
                var renderer = new marked.Renderer();
                renderer.heading = function(text, level, raw) {
                  var anchor = this.options.headerPrefix + raw.toLowerCase().replace(/[^\w]+/g, '-');
                  toc.push({
                    anchor: anchor,
                    level: level,
                    text: text
                  });
                  return '<h'
                  + level
                  + ' id="'
                  + anchor
                  + '">'
                  + text
                  + '</h'
                  + level
                  + '>\n'
                  + '<a href="#table-of-contents">Table of Contents<a>\n';
                };
                return renderer;
              })();

              marked.setOptions({
                renderer: renderer,
                gfm: true,
                tables: true,
                breaks: false,
                pedantic: false,
                sanitize: true,
                smartLists: true,
                smartypants: false
              });
              try {
                var html = marked(data);
                var tocHTML = '<h1 id="table-of-contents">Table of Contents</h1>\n<ul>';
                toc.forEach(function (entry) {
                  tocHTML += '<li><a href="#'+entry.anchor+'">'+entry.text+'<a></li>\n';
                });
                tocHTML += '</ul>\n';
                worker.port.emit("render", tocHTML + html);
              }
              catch (exception) {
                DEBUG_ADDON && console.error(exception);
                DEBUG_ADDON && window.alert(exception.message + '\n\n' + exception.stack);
              }
            });
          });
        });
        var originallyActiveTab = tabs.activeTab;
        tabs.open({
          url: '../README.md',
          nNewWindow: false,
          // inBackground: true,
          onClose: function() {
            originallyActiveTab.activate();
          }});
      }
    };

    if (recent.NativeWindow) {
      let nw = require('./nativewindow');
      nw.addContextMenu({
        name: myTitle,
        context: nw.SelectorContext('a'),
        callback: function(target) {
          let worker = tabs.activeTab.attach({
            // contentScriptFile: self.data.url('reportFeedbackInformation.js'),
            contentScriptFile: './reportFeedbackInformation.js',
            onMessage: reportUnsupportedSite
            // TODO Implement this as clickable issue reporting notification
            // onError:
          });
          worker.port.emit('show', sp.prefs['KNOWN_SITES_EXTENSIONS']);
        }});
      nw.addContextMenu({
        name: 'Extend ' + myTitle,
        context: nw.SelectorContext('a'),
        callback: function(target) {
          let worker = tabs.activeTab.attach({
            // contentScriptFile: self.data.url('extendKnownSites.js'),
            contentScriptFile: './extendKnownSites.js',
            onMessage: handleMessages
          });
          worker.port.emit('show', sp.prefs['KNOWN_SITES_EXTENSIONS'] || sample);
        }});
    } else {
      let cm = require("sdk/context-menu");
      pigeonMenuItem = cm.Item({
        label: myTitle,
        context: cm.URLContext("*"),
        // contentScriptFile: self.data.url('reportFeedbackInformation.js'),
        contentScriptFile: './reportFeedbackInformation.js',
        // data property needs to be kept in sync with KNOWN_SITES_EXTENSIONS preference.
        // It seems to be the only way to pass data from the Add-on script to the content-script for a specific menu item.
        data: sp.prefs['KNOWN_SITES_EXTENSIONS'],
        onMessage: reportUnsupportedSite
      });
      extendMenuItem = cm.Item({
        label: 'Extend ' + myTitle,
        context: cm.URLContext("*"),
        // contentScript: 'console.log("Extend clicked");',
        // contentScriptFile: self.data.url('extendKnownSites.js'),
        contentScriptFile: './extendKnownSites.js',
        // data property needs to be kept in sync with KNOWN_SITES_EXTENSIONS preference.
        // It seems to be the only way to pass data from the Add-on script to the content-script for a specific menu item.
        data: sp.prefs['KNOWN_SITES_EXTENSIONS'] || sample,
        onMessage: handleMessages
      });
    }
    // TODO Place following code where timed section should end.
    if (console.timeEnd) {
      DEBUG_ADDON &&
        console.timeEnd('load time');
    }
    if (console.profileEnd) {
      DEBUG_ADDON &&
        console.log('end profiling');
      DEBUG_ADDON &&
        console.profileEnd();
    }
  }
  catch (exception) {
    DEBUG_ADDON && console.error(exception);
    DEBUG_ADDON && window.alert(exception.message + '\n\n' + exception.stack);
  }
})();
