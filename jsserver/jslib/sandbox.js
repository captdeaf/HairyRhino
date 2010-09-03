/**
 * sandbox.js
 *
 * This provides a class to abstract Rhino scopes and provide useful functions
 * for them.
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

jsload('jslib/utils.js');
jsload('jslib/filehandler.js');
defineClass('XMLHttpRequest');

/* The Sandbox class. */
var Sandbox = defClass({
  name: 'Sandbox',

  construct: function(args) {
    // Just save the args for now, we may need 'em later.
    this.args = args;
    this.siteid = args.basedir;
    this.name = args.basedir;
    this.hostrx = new RegExp(args.hostrx || 'blahblahthiswillnevermatch');
    this.restart();
  },

  getters: {
    web: function() {
      return this.jscope.get('Web');
    }
  },

  methods: {
    restart: function() {
      // Create a new scope.
      this.jscope = new Packages.JsScope();

      // We use me because if we pass "this.eval" to a function, it's
      // unscoped, so using "me" will force it to use this object, instead
      // of referring to "this".
      var me = this;

      this.evaluate = function(str,fn) {
        if (!fn) {
          fn = '<eval>';
        }
        return me.jscope.evaluate(str,fn);
      };

      this.getGlobal = function(str) {
        var x = me.jscope.get(str);
        if (!x) {
          me.jscope.evaluate("var " + str + " = {};", '<eval>');
          x = me.jscope.get(str);
        }
        return x;
      };

      this.log = function(str) {
        me.dolog(str);
      };

      var thread = this.getGlobal('Thread');
      thread.__defineGetter__('local', function() { return Thread.local; });
      thread.__defineSetter__('local', function(x) { Thread.local = x; });
      thread.sleep = Thread.sleep;
      thread.spawn = Thread.spawn;
      thread.string = String;
      thread.strconst = ''.constructor;
      thread.XMLHttpRequest = XMLHttpRequest;

      // Add defineProperty to Object.
      var o = this.jscope.get('Object');
      var so = Packages.org.mozilla.javascript.ScriptableObject;
      so.defineProperty(
          o.prototype,
          'defineProperty',
          function(name, value) {
            so.defineProperty(this, name, value, so.DONTENUM);
          },
          so.DONTENUM);

      // Now to initialize web and db.
      this.evaluate('var Web = {};');

      var web = this.getGlobal('Web');

      // Propogate our PRODUCTION environment info to
      // the web pages.
      web.production = PRODUCTION;
      web.runCommand = runCommand;
      web.readUrl = readUrl;
      web.sql = SQL;
      web.print = this.log;

      if (this.args.basedir) {
        this.basedir = this.args.basedir;
        var basedir = this.args.basedir;

        this.templates = new TemplateEngine([basedir + '/templates'],
                                            this.log, this.evaluate);

        this.load = function(path) {
          var p = File.safepath(path);
          if (!p) {
            throw "Bad file path: '" + path + "'";
          }
          var fn = basedir + '/' + p;
          if (File.file(fn)) {
            me.evaluate(File.read(fn),p);
            return true;
          } else {
            throw "No such file: '" + p + "'";
          }
        };

        // Establish file readers.
        if (web) {
          web.render = function(tname, mylocals) {
            return me.templates.render(tname, mylocals);
          };
          web.template = {};
          web.template.lint = function(src) {
            return me.templates.lint(src);
          };
          web.template.__defineGetter__('locals', function() {
              return me.templates.locals; });
          web.template.__defineSetter__('locals', function(l) {
              me.templates.locals = l; });
          web.load = this.load;
        }

        // The File object.
        this.evaluate('var File = {};');
        this.file = this.jscope.get("File");

        var wrapFile = function(methodname) {
          return function() {
            var path = File.safepath(arguments[0]);
            if (!path) {
              throw "Bad file path: '" + arguments[0] + "'";
            }
            var fn = basedir + '/' + path;
            arguments[0] = fn;
            if (methodname == 'rename') {
              var topath = File.safepath(arguments[1]);
              if (!topath) {
                throw "Bad file path: '" + arguments[1] + "'";
              }
              topath = basedir + '/' + topath;
              arguments[1] = topath;
            }
            return File[methodname].apply(File,arguments);
          };
        };

        for (var methodname in File) {
          this.file[methodname] = wrapFile(methodname);
        }

        this.file.runScript = function() {
          // Since arguments is not an array, we need to generate a new one.
          // That's why it's so wacky.
          var myargs = [];

          // runscript.sh <directory> <commands...>
          myargs.push('./runscript.sh');
          myargs.push(me.basedir);
          for (var i = 0; i < arguments.length; i++) {
            myargs.push(arguments[i]);
          }
          return web.runCommand.apply(runCommand, myargs);
        }

        this.webroot = undefined;
        web.mountRoot = function(path) {
          var p = File.safepath(path);
          if (!p) {
            throw "Bad mount path: '" + path + "'";
          }

          // Mount it.
          me.webroot = makeFileFinder(basedir + '/' + path);
        };
      } else {
        print('No base path given for scope.');
      }
      
      // Clear all variables that can go outside of the scope.
      try {
        this.jscope.evaluate(File.read('jslib/bootstrap_sandbox.js'),
                             'bootstrap_sandbox.js');
      } catch (err) {
        err = __exception__;
        this.log("Received an error trying to load bootstrap.js:");
        this.log(err);
      }
    },

    // TODO: Make this push onto a buffer (preferably one of limited size).
    dolog: function(str) {
      print(str);
    },

    handler: function(path, wreq, wresp) {
      if (path.match(/[^\s\/]/)) {
        var ret = this.webroot(path);
        if (ret) {
          wresp.content_type = ret.content_type;
          wresp.body = ret.body;
          return;
        }
      }
      var web = this.jscope.get("Web");
      if (web && typeof web.handler == 'function') {
        return web.handler(path,wreq,wresp);
      } else {
        return resp.fourohfour();
      }
    }
  }
});
