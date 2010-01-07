/** jsload.js
 *
 * This provides the functions jsload() and jsreload(), which
 * allow code to be modified on the fly, and reloaded without
 * restarting the server.
 */

load('jslib/jsclass.js');
load('jslib/file.js');

var jsloadPath = jsloadPath || ['.'];

var jsloaded = jsloaded || {};

function jsLoadClass(cn) {
  var cls = loader.loadClass(cn);
  cls.invoke(cls.getDeclaredMethod('init'));
}

/* First, compile it. */
function jsload(name) {
  var cname = (name + '').replace(/^.*\//,'').replace(/\.js$/,'');
  var cn = 'compiled/' + cname + '.class';
  for (var i = 0; i < jsloadPath.length; i++) {
    var path = jsloadPath[i];
    var fn = path + '/' + name;
    if (File.exists(fn)) {
      if (!(jsloaded[fn] && jsloaded[fn] > File.mtime(fn))) {
        load(fn);
        jsloaded[fn] = (new Date()).getTime();
      }
      return true;
    }
  }
  return false;
}

/**
 * Go through every file that's been jsload()'d and reload them if they've
 * been modified since their last load.
 *
 * Don't do that if it's a PRODUCTION environment, though.
 */
var jsreload = (function() {
  if (PRODUCTION) {
    return function() {};
  } else {
    return function() {
      for (var fn in jsloaded) {
        if (File.exists(fn)) {
          if (!(jsloaded[fn] && jsloaded[fn] > File.mtime(fn))) {
            print("Reloading " + fn);
            load(fn);
            jsloaded[fn] = (new Date()).getTime();
          }
        }
      }
    };
  }
})();
