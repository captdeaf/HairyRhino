/** utils.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

(function() {
  var so = Packages.org.mozilla.javascript.ScriptableObject;
  so.defineProperty(
      Object.prototype,
      'defineProperty',
      function(name, value) {
        so.defineProperty(this, name, value, so.DONTENUM);
      },
      so.DONTENUM);
})();

Object.prototype.defineProperty('printout', function(o) {
  for (var i in o) {
    print('' + i + ': ' + o[i]);
  }
});

/* Thread-local variables */
var Thread = {};
Thread.vals = new java.lang.ThreadLocal();

Thread.__defineGetter__('local', function() {
  return Thread.vals.get();
});
Thread.__defineSetter__('local', function(o) {
  Thread.vals.set(o);
});

// Other Thread stuff
Thread.sleep = function(timeout) { java.lang.Thread.sleep(timeout); };

Thread.spawn = function(kall) {
  var runnable = new java.lang.Runnable({run: kall});
  var thread = new java.lang.Thread(runnable);
  thread.start();
  return thread;
};

/* Regexp escaping */
if (1) {
  var specials = [
    '/', '.', '*', '+', '?', '|',
    '(', ')', '[', ']', '{', '}', '\\'
  ];
  RegExp.defineProperty('escapeRE',
      new RegExp('(\\' + specials.join('|\\') + ')', 'g'));
}
RegExp.defineProperty('escape', function(text) {
  return text.replace(RegExp.escapeRE, '\\$1');
});

/* String stuff */
String.prototype.defineProperty('escapeHTML', function() {
  return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
});

String.prototype.defineProperty('trim',  function() {
  return this.replace(/^\s*|\s*$/g, '');
});

String.prototype.defineProperty('ltrim',  function() {
  return this.replace(/^\s*/, '');
});

String.prototype.defineProperty('rtrim',  function() {
  return this.replace(/\s*$/, '');
});

/* Array stuff */

Array.prototype.defineProperty('toJava', function(type) {
  var jarray = java.lang.reflect.Array.newInstance(type, this.length);
  for (var i = 0; i < this.length; ++i) {
    jarray[i] = this[i];
  }
  return jarray;
});

Array.prototype.defineProperty('columns', []);

Array.prototype.defineProperty('each', function(fun) {
  var i;
  if (fun.length == 1) {
    for (i = 0;i < this.length;i++) {
      fun(this[i]);
    }
  } else {
    for (i = 0;i < this.length;i++) {
      fun(this[i],i);
    }
  }
  return undefined;
});

Array.prototype.defineProperty('map', function(fun) {
  var ret = [];
  var i;
  if (fun.length == 1) {
    for (i = 0;i < this.length;i++) {
      ret.push(fun(this[i]));
    }
  } else {
    for (i = 0;i < this.length;i++) {
      ret.push(fun(this[i]),i);
    }
  }
  return ret;
});

Array.prototype.defineProperty('select', function(fun) {
  var ret = [];
  var i;
  if (fun.length == 1) {
    for (i = 0;i < this.length;i++) {
      if (fun(this[i])) {
        ret.push(this[i]);
      }
    }
  } else {
    for (i = 0;i < this.length;i++) {
      if (fun(this[i])) {
        ret.push(this[i],i);
      }
    }
    
  }
  return ret;
});

Array.prototype.defineProperty('grep', function(pattern) {
  var ret = [];
  for (var i = 0;i < this.length;i++) {
    if (String(this[i]).match(pattern)) {
      ret.push(this[i]);
    }
  }
  return ret;
});

Array.prototype.defineProperty('copy', function() {
  return [].concat(this);
});

